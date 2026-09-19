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
  build() { return { inputs: this.inputs, output: this.output } }
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

const first = 'createmyway:perfect_rose_quartz_gem'
const second = 'createmyway:cut_venom_gem'
const registry = {
  materialParts: { [first]: 'createmyway:gem', [second]: 'createmyway:gem' },
  materialEquipment: { [first]: ['sword'], [second]: ['sword'] },
  materialEffects: { [first]: {}, [second]: {} }
}
const level = { isClientSide: () => false }
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
const sword = new Stack('slag:modular_item', {
  MODULAR_TYPE: 'slag:sword',
  DYNAMIC_PARTS: new Parts(javaList([
    part('slag:iron', 'slag:sword_blade'),
    part('slag:iron', 'slag:guard'),
    part('createmyway:iron_handle', 'createmyway:handle')
  ])),
  DAMAGE: 7,
  CUSTOM_NAME: 'Testing Sword'
})

function socket(tool, gem) {
  const gemStack = part(gem, 'createmyway:gem')
  let holder = null
  searchRecipe({
    getInventory: () => ({ getItem: index => index === 0 ? tool : gemStack }),
    getBlockEntity: () => ({ getLevel: () => level }),
    addRecipe: (supplier, priority) => {
      assert.equal(priority, 1000)
      holder = supplier()
    }
  })
  assert(holder, `${gem}: socket recipe missing`)
  assert.equal(holder.value.inputs.length, 2)
  assert.equal(holder.value.inputs[1].stack.get('MATERIAL_TYPE'), gem)
  const result = holder.value.output
  const installed = result.get('DYNAMIC_PARTS').items().filter(item => item.get('PART_TYPE') === 'createmyway:gem')
  assert.equal(installed.length, 1)
  assert.equal(installed[0].get('MATERIAL_TYPE'), gem)
  assert.equal(result.get('CUSTOM_DATA').getCompound('cmw_socket').values.gem, gem)
  assert.equal(result.get('DAMAGE'), 7)
  assert.equal(result.get('CUSTOM_NAME'), 'Testing Sword')
  return { result, id: holder.id }
}

function unsocket(tool, expectedGem) {
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
}

const initial = socket(sword, first)
unsocket(initial.result, first)
const switched = socket(initial.result, second)
assert.notEqual(initial.id, switched.id, 'Different socket searches must not reuse a recipe ID')
unsocket(switched.result, second)
const repeated = socket(switched.result, first)
assert.notEqual(initial.id, repeated.id, 'Resocketing the same gem must also produce a fresh recipe ID')
assert.notEqual(switched.id, repeated.id)
console.log('Gem resocket regression passed: Rose Quartz -> remove -> Venom -> remove -> Rose Quartz')
