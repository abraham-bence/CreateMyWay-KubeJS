// Exercise the actual KubeJS socketing callbacks with lightweight Java stubs.
// This is a deterministic logic test, not a Minecraft/Create integration test.
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
    for (const [key, value] of Object.entries(this.values)) {
      data[key] = value instanceof Tag ? value.copy() : value
    }
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
  constructor(id, components = {}) {
    this.id = id
    this.components = components
    this.enchants = {}
    this.count = 1
  }
  isEmpty() { return false }
  getItem() { return { id: this.id } }
  get(component) { return this.components[component] || null }
  getComponents() { return { set: (component, value) => { this.components[component] = value } } }
  getEnchantments() { return this.enchants }
  setCount(count) { this.count = count }
  remove(component) { delete this.components[component] }
  copy() {
    const components = {}
    for (const [component, value] of Object.entries(this.components)) {
      components[component] = value instanceof Parts
        ? new Parts(value.itemsCopy()) : value instanceof Tag ? value.copy() : value
    }
    const result = new Stack(this.id, components)
    result.enchants = { ...this.enchants }
    result.count = this.count
    return result
  }
}

class MutableEnchantments {
  constructor(value) { this.levels = { ...value } }
  getLevel(id) { return this.levels[id] || 0 }
  set(id, level) { this.levels[id] = level }
  toImmutable() { return this.levels }
}

class RecipeBuilder {
  constructor(_factory, id) { this.id = id; this.inputs = [] }
  ['require(net.minecraft.world.item.crafting.Ingredient)'](input) {
    this.inputs.push(input)
    return this
  }
  ['output(net.minecraft.world.item.ItemStack)'](output) {
    this.output = output
    return this
  }
  build() { return this }
  // Create's ProcessingRecipe rolls this supplier when applying the recipe.
  enforceNextResult(supplier) { this.forcedResult = supplier }
  rollResults() { return this.forcedResult ? this.forcedResult() : this.output.copy() }
}

let searchRecipe
let removeWithSaw
const components = {}
for (const id of ['MODULAR_TYPE', 'DYNAMIC_PARTS', 'PART_TYPE', 'MATERIAL_TYPE', 'BUILT']) {
  components[id] = { get: () => id }
}

const javaClasses = {
  'com.simibubi.create.content.kinetics.deployer.DeployerRecipeSearchEvent': 'deployer_search_event',
  'com.simibubi.create.content.kinetics.deployer.DeployerApplicationRecipe': class {},
  'com.simibubi.create.content.kinetics.deployer.ItemApplicationRecipe$Builder': RecipeBuilder,
  'net.minecraft.world.item.crafting.RecipeHolder': class {
    constructor(id, recipe) { this.id = id; this.value = recipe }
  },
  'net.neoforged.neoforge.common.crafting.DataComponentIngredient': {
    of: (strict, stack) => ({ strict, stack })
  },
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
  'net.minecraft.world.item.enchantment.EnchantmentHelper': {
    setEnchantments: (stack, enchantments) => { stack.enchants = enchantments }
  },
  'net.minecraft.world.item.enchantment.ItemEnchantments$Mutable': MutableEnchantments,
  'net.minecraft.world.InteractionHand': { MAIN_HAND: 'MAIN_HAND' }
}

const rose = 'createmyway:perfect_rose_quartz_gem'
const diamond = 'createmyway:cut_diamond_gem'
const equipmentTypes = ['pickaxe', 'axe', 'shovel', 'hoe', 'sword']
const registry = {
  materialParts: { [rose]: 'createmyway:gem', [diamond]: 'createmyway:gem' },
  materialEquipment: { [rose]: equipmentTypes, [diamond]: equipmentTypes },
  materialEffects: { [rose]: {}, [diamond]: {} }
}
const level = { isClientSide: () => false }
let heldPart = null
let currentTool = null
const deployer = {
  getLevel: () => level,
  getPlayer: () => ({ getMainHandItem: () => heldPart })
}
const context = vm.createContext({
  Java: { loadClass(name) {
    assert(Object.hasOwn(javaClasses, name), `Unknown Java class: ${name}`)
    return javaClasses[name]
  } },
  global: { cmwEquipmentRegistry: registry },
  NativeEvents: { onEvent(_type, callback) { searchRecipe = callback } },
  BlockEvents: { rightClicked(_block, callback) { removeWithSaw = callback } },
  Text: { green: value => value, red: value => value },
  console
})
vm.runInContext(fs.readFileSync('server_scripts/cmw_gem_socketing.js', 'utf8'), context)
assert.equal(typeof searchRecipe, 'function')
assert.equal(typeof removeWithSaw, 'function')

function part(material, type) {
  return new Stack('slag:dynamic_part', { PART_TYPE: type, MATERIAL_TYPE: material })
}
function toolFor(equipment) {
  const parts = [part('slag:iron', equipment === 'sword' ? 'slag:sword_blade' : `slag:${equipment}_head`)]
  if (equipment === 'sword') parts.push(part('slag:diamond', 'slag:guard'))
  parts.push(part('createmyway:gold_handle', 'createmyway:handle'))
  return new Stack('slag:modular_item', {
    MODULAR_TYPE: `slag:${equipment}`,
    DYNAMIC_PARTS: new Parts(javaList(parts)),
    DAMAGE: 7,
    CUSTOM_NAME: `Testing ${equipment}`
  })
}

// Check the actual output rolled by Create, not only the preview stack stored
// in a recipe constructed at search time.
function assertOutput(result, equipment, gem) {
  const installed = result.get('DYNAMIC_PARTS').items().filter(item => item.get('PART_TYPE') === 'createmyway:gem')
  assert.equal(installed.length, 1, `${equipment}: exactly one installed gem`)
  assert.equal(installed[0].get('MATERIAL_TYPE'), gem, `${equipment}: actual installed gem`)
  assert.equal(result.get('CUSTOM_DATA').getCompound('cmw_socket').values.gem, gem, `${equipment}: saved socket gem`)
  assert.equal(result.get('DAMAGE'), 7, `${equipment}: damage preserved`)
  assert.equal(result.get('CUSTOM_NAME'), `Testing ${equipment}`, `${equipment}: name preserved`)
  assert.equal(result.get('DYNAMIC_PARTS').items().at(-1).get('PART_TYPE'), 'createmyway:handle')
}

function socket(tool, equipment, gem) {
  currentTool = tool
  heldPart = part(gem, 'createmyway:gem')
  let holder = null
  // Captured hand input deliberately remains stale, as it would in a cached
  // recipe search; only deployer.getPlayer() reads the live held gem.
  const gemAtSearch = heldPart.copy()
  searchRecipe({
    getInventory: () => ({ getItem: index => index === 0 ? currentTool : gemAtSearch }),
    getBlockEntity: () => deployer,
    addRecipe: (supplier, priority) => {
      assert.equal(priority, 1000)
      holder = supplier()
    }
  })
  assert(holder, `${equipment}/${gem}: socket recipe missing`)
  assert.equal(holder.value.inputs.length, 2)
  assert.equal(holder.value.inputs[1].stack.get('MATERIAL_TYPE'), gem)
  assert.equal(typeof holder.value.forcedResult, 'function', 'live output supplier must be installed')
  const result = holder.value.rollResults()
  assertOutput(result, equipment, gem)
  return { result, holder, id: holder.id }
}

function unsocket(tool, equipment, expectedGem) {
  let recovered
  let cancelled = false
  removeWithSaw({
    hand: 'MAIN_HAND',
    level,
    item: tool,
    block: {
      entity: { getSpeed: () => 32 },
      popItemFromFace: item => { recovered = item }
    },
    player: { displayClientMessage() {} },
    facing: 'UP',
    cancel: () => { cancelled = true }
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
  for (const [first, second] of [[rose, diamond], [diamond, rose]]) {
    const original = toolFor(equipment)
    const initial = socket(original, equipment, first)
    const cleared = unsocket(initial.result, equipment, first)

    // Regression for the real report: Create might apply the recipe object
    // selected during the FIRST gem installation. Its preview is still first,
    // but its rolled output must take the current Deployer hand (second).
    currentTool = cleared
    heldPart = part(second, 'createmyway:gem')
    assert.equal(initial.holder.value.output.get('CUSTOM_DATA').getCompound('cmw_socket').values.gem, first)
    const staleRecipeResult = initial.holder.value.rollResults()
    assertOutput(staleRecipeResult, equipment, second)

    const switched = socket(cleared, equipment, second)
    assert.notEqual(initial.id, switched.id, `${equipment}: swapped gem needs a new recipe ID`)
    const clearedAgain = unsocket(switched.result, equipment, second)
    const repeated = socket(clearedAgain, equipment, first)
    assert.notEqual(initial.id, repeated.id, `${equipment}: repeated gem needs a fresh recipe ID`)
    assert.notEqual(switched.id, repeated.id)
  }
}
console.log('Gem resocket regression passed: both gem orders and stale recipe outputs on all five equipment types')
