// Deterministic KubeJS callback tests. These exercise recipe creation and
// output suppliers, not an actual Minecraft/Create depot tick.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')

function javaList(values) {
  const items = values.slice()
  items.size = () => items.length
  items.get = index => items[index]
  items.add = (index, value) => { items.splice(index, 0, value) }
  items.remove = index => items.splice(index, 1)[0]
  return items
}
class Tag {
  constructor(values = {}) { this.values = { ...values } }
  put(key, value) { this.values[key] = value }
  putString(key, value) { this.put(key, value) }
  putInt(key, value) { this.put(key, value) }
  getInt(key) { return this.values[key] || 0 }
  getCompound(key) { return this.values[key] || new Tag() }
  getAllKeys() { return Object.keys(this.values) }
  contains(key) { return Object.hasOwn(this.values, key) }
  remove(key) { delete this.values[key] }
  copyTag() { return this.copy() }
  copy() {
    const data = {}
    for (const [key, value] of Object.entries(this.values)) data[key] = value instanceof Tag ? value.copy() : value
    return new Tag(data)
  }
}
class Parts {
  constructor(items) { this.list = items }
  items() { return this.list }
  itemsCopy() { return javaList(this.list.map(item => item.copy())) }
  isEmpty() { return this.list.length === 0 }
}
class Stack {
  constructor(id, components = {}) { this.id = id; this.components = components; this.enchants = {}; this.count = 1 }
  isEmpty() { return this.count === 0 }
  getItem() { return { id: this.id } }
  get(component) { return this.components[component] ?? null }
  getComponents() { return { set: (component, value) => { this.components[component] = value } } }
  getEnchantments() { return this.enchants }
  setCount(value) { this.count = value }
  shrink(value) { this.count = Math.max(0, this.count - value) }
  remove(component) { delete this.components[component] }
  copy() {
    const components = {}
    for (const [component, value] of Object.entries(this.components)) {
      components[component] = value instanceof Parts ? new Parts(value.itemsCopy()) : value instanceof Tag ? value.copy() : value
    }
    const copy = new Stack(this.id, components)
    copy.enchants = { ...this.enchants }
    copy.count = this.count
    return copy
  }
}
class MutableEnchantments {
  constructor(value) { this.levels = { ...value } }
  getLevel(id) { return this.levels[id] || 0 }
  set(id, level) { this.levels[id] = level }
  toImmutable() { return this.levels }
}
class RecipeBuilder {
  constructor(_factory, id) { this.id = id; this.inputs = []; this.keepHeldItem = false }
  ['require(net.minecraft.world.item.crafting.Ingredient)'](input) { this.inputs.push(input); return this }
  ['output(net.minecraft.world.item.ItemStack)'](output) { this.output = output; return this }
  toolNotConsumed() { this.keepHeldItem = true; return this }
  build() { return this }
  enforceNextResult(supplier) { this.forcedResult = supplier }
  rollResults() { return this.forcedResult ? this.forcedResult() : this.output.copy() }
}
let searchRecipe
let removeWithSaw
const components = {}
for (const id of ['MODULAR_TYPE', 'DYNAMIC_PARTS', 'PART_TYPE', 'MATERIAL_TYPE', 'BUILT']) components[id] = { get: () => id }
const javaClasses = {
  'com.simibubi.create.content.kinetics.deployer.DeployerRecipeSearchEvent': 'deployer_search_event',
  'com.simibubi.create.content.kinetics.deployer.DeployerApplicationRecipe': class {},
  'com.simibubi.create.content.kinetics.deployer.ItemApplicationRecipe$Builder': RecipeBuilder,
  'net.minecraft.world.item.crafting.RecipeHolder': class { constructor(id, recipe) { this.id = id; this.value = recipe } },
  'net.neoforged.neoforge.common.crafting.DataComponentIngredient': { of: (strict, stack) => ({ strict, stack }) },
  'net.minecraft.core.registries.BuiltInRegistries': { ITEM: { getKey: item => item.id } },
  'java.util.Optional': { of: value => value },
  'net.minecraft.resources.ResourceLocation': { parse: value => value },
  'dev.lopyluna.slag.content.items.modular.DataDynamicParts': Parts,
  'dev.lopyluna.slag.register.AllDataComponents': components,
  'net.minecraft.core.component.DataComponents': { CUSTOM_DATA: 'CUSTOM_DATA' },
  'net.minecraft.world.item.component.CustomData': {
    update(component, stack, edit) {
      const tag = stack.get(component) || new Tag()
      edit(tag)
      stack.getComponents().set(component, tag)
    }
  },
  'net.minecraft.nbt.CompoundTag': Tag,
  'net.minecraft.core.registries.Registries': { ENCHANTMENT: 'ENCHANTMENT' },
  'net.minecraft.world.item.enchantment.EnchantmentHelper': { setEnchantments: (stack, enchantments) => { stack.enchants = enchantments } },
  'net.minecraft.world.item.enchantment.ItemEnchantments$Mutable': MutableEnchantments,
  'net.minecraft.world.InteractionHand': { MAIN_HAND: 'MAIN_HAND' }
}
const rose = 'createmyway:perfect_rose_quartz_gem'
const diamond = 'createmyway:cut_diamond_gem'
const venom = 'createmyway:cut_venom_gem'
const equipmentTypes = ['pickaxe', 'axe', 'shovel', 'hoe', 'sword']
const registry = {
  materialParts: { [rose]: 'createmyway:gem', [diamond]: 'createmyway:gem', [venom]: 'createmyway:gem' },
  materialEquipment: { [rose]: equipmentTypes, [diamond]: equipmentTypes, [venom]: ['sword'] },
  materialEffects: { [rose]: {}, [diamond]: {}, [venom]: {} }
}
const level = { isClientSide: () => false }
let heldPart = null
let currentTool = null
const deployer = { getLevel: () => level, getPlayer: () => ({ getMainHandItem: () => heldPart }) }
const context = vm.createContext({
  Java: { loadClass(name) { assert(Object.hasOwn(javaClasses, name), `Unknown Java class: ${name}`); return javaClasses[name] } },
  global: { cmwEquipmentRegistry: registry },
  NativeEvents: { onEvent(_type, callback) { searchRecipe = callback } },
  BlockEvents: { rightClicked(_block, callback) { removeWithSaw = callback } },
  Text: { green: value => value, red: value => value }, console
})
vm.runInContext(fs.readFileSync('server_scripts/cmw_gem_socketing.js', 'utf8'), context)
assert.equal(typeof searchRecipe, 'function')
assert.equal(typeof removeWithSaw, 'function')

function part(material, type = 'createmyway:gem') {
  return new Stack('slag:dynamic_part', { PART_TYPE: type, MATERIAL_TYPE: material })
}
function toolFor(equipment) {
  const items = [part('slag:iron', equipment === 'sword' ? 'slag:sword_blade' : `slag:${equipment}_head`)]
  if (equipment === 'sword') items.push(part('slag:diamond', 'slag:guard'))
  items.push(part('createmyway:gold_handle', 'createmyway:handle'))
  return new Stack('slag:modular_item', {
    MODULAR_TYPE: `slag:${equipment}`, DYNAMIC_PARTS: new Parts(javaList(items)), DAMAGE: 7,
    CUSTOM_NAME: `Testing ${equipment}`
  })
}
function search(tool, gem, order = 'tool-first') {
  // Both input orders must reach the same recipe search result once both items
  // are present. The mocked test cannot prove DepotBehaviour actually retries.
  heldPart = null
  currentTool = null
  const nextPart = part(gem)
  if (order === 'gem-first') { heldPart = nextPart; currentTool = tool }
  else { currentTool = tool; heldPart = nextPart }
  const captured = heldPart.copy()
  let holder = null
  let cancelled = false
  searchRecipe({
    getInventory: () => ({ getItem: index => index === 0 ? currentTool : captured }),
    getBlockEntity: () => deployer,
    addRecipe: (supplier, priority) => { assert.equal(priority, 1000); holder = supplier() },
    setCanceled: value => { cancelled = value }
  })
  return { holder, cancelled }
}
function assertOutput(result, equipment, gem) {
  const installed = result.get('DYNAMIC_PARTS').items().filter(item => item.get('PART_TYPE') === 'createmyway:gem')
  assert.equal(installed.length, 1, `${equipment}: one installed gem`)
  assert.equal(installed[0].get('MATERIAL_TYPE'), gem, `${equipment}: installed gem`)
  assert.equal(result.get('CUSTOM_DATA').getCompound('cmw_socket').values.gem, gem)
  assert.equal(result.get('DAMAGE'), 7)
  assert.equal(result.get('CUSTOM_NAME'), `Testing ${equipment}`)
  assert.equal(result.get('DYNAMIC_PARTS').items().at(-1).get('PART_TYPE'), 'createmyway:handle')
}
function socket(tool, equipment, gem, order = 'tool-first') {
  const { holder, cancelled } = search(tool, gem, order)
  assert.equal(cancelled, false)
  assert(holder, `${equipment}/${gem}: socket recipe missing`)
  assert.equal(holder.value.inputs.length, 2)
  assert.equal(holder.value.inputs[1].stack.get('MATERIAL_TYPE'), gem)
  assert.equal(holder.value.keepHeldItem, true, 'Create must not automatically consume gem')
  assert.equal(typeof holder.value.forcedResult, 'function')
  const output = holder.value.rollResults()
  assertOutput(output, equipment, gem)
  assert.equal(heldPart.count, 0, 'one gem must be consumed after validation')
  return { result: output, holder, id: holder.id }
}
function unsocket(tool, equipment, expectedGem) {
  let recovered = null
  let cancelled = false
  removeWithSaw({
    hand: 'MAIN_HAND', level, item: tool,
    block: { entity: { getSpeed: () => 32 }, popItemFromFace: item => { recovered = item } },
    player: { displayClientMessage() {} }, facing: 'UP', cancel: () => { cancelled = true }
  })
  assert(cancelled)
  assert.equal(recovered.get('MATERIAL_TYPE'), expectedGem)
  assert.equal(recovered.get('BUILT'), null)
  assert.equal(tool.get('DYNAMIC_PARTS').items().some(item => item.get('PART_TYPE') === 'createmyway:gem'), false)
  assert.equal(tool.get('CUSTOM_DATA').contains('cmw_socket'), false)
  assert.equal(tool.get('DAMAGE'), 7)
  assert.equal(tool.get('CUSTOM_NAME'), `Testing ${equipment}`)
  return tool
}
for (const equipment of equipmentTypes) {
  for (const order of ['tool-first', 'gem-first']) {
    const { result } = socket(toolFor(equipment), equipment, rose, order)
    unsocket(result, equipment, rose)
  }
  for (const [first, second] of [[rose, diamond], [diamond, rose]]) {
    const initial = socket(toolFor(equipment), equipment, first)
    const cleared = unsocket(initial.result, equipment, first)
    currentTool = cleared
    heldPart = part(second)
    assert.equal(initial.holder.value.output.get('CUSTOM_DATA').getCompound('cmw_socket').values.gem, first)
    assertOutput(initial.holder.value.rollResults(), equipment, second)
    assert.equal(heldPart.count, 0, `${equipment}: stale recipe must consume the new gem exactly once`)
    const switched = socket(cleared, equipment, second)
    assert.notEqual(initial.id, switched.id)
    unsocket(switched.result, equipment, second)
  }
}
for (const equipment of ['pickaxe', 'axe', 'shovel', 'hoe']) {
  // Invalid CMW gem must not register any recipe (nor fall back to other
  // application recipes that might already have been selected).
  const tool = toolFor(equipment)
  const invalid = search(tool, venom, 'gem-first')
  assert.equal(invalid.holder, null)
  assert.equal(invalid.cancelled, true)
  assert.equal(heldPart.count, 1)

  // A recipe may have been selected with Rose Quartz before the Deployer hand
  // changed to sword-only Venom. This was the exact reported crash path.
  const previous = search(tool, rose).holder
  assert(previous)
  currentTool = tool
  heldPart = part(venom)
  const safeOutput = previous.value.rollResults()
  assert.equal(safeOutput.get('DYNAMIC_PARTS').items().some(item => item.get('PART_TYPE') === 'createmyway:gem'), false)
  assert.equal(safeOutput.get('CUSTOM_DATA'), null)
  assert.equal(heldPart.count, 1, `${equipment}: incompatible gem must not be consumed`)
}
console.log('Gem socket tests passed: both input orders (search), resocketing and safe incompatible gems on all five types')
