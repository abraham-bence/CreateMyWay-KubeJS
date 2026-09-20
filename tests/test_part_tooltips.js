// Run the tooltip callbacks with lightweight KubeJS/Java stubs. This is not a
// Minecraft runtime test, but catches missing lines and unsupported JS APIs.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')

const handlers = {}
const attachments = {}
const components = {}
for (const key of ['MATERIAL_TYPE', 'PART_TYPE', 'MODULAR_TYPE', 'DYNAMIC_PARTS']) {
  components[key] = { get: () => key }
}

function text(value) {
  const formatted = { value: String(value) }
  for (const color of ['gold', 'gray', 'aqua', 'darkGray', 'red', 'green']) {
    formatted[color] = () => formatted
  }
  return formatted
}

const globalData = {}
const sandbox = {
  global: globalData,
  Java: {
    loadClass(name) {
      if (name === 'dev.lopyluna.slag.register.AllDataComponents') return components
      if (name === 'net.minecraft.resources.ResourceLocation') return { parse: id => id }
      if (name === 'dev.lopyluna.slag.register.AllDynamicTypes') {
        return {
          getMaterial: () => ({ orElse: () => null }),
          getPart: () => ({ orElse: () => null })
        }
      }
      throw new Error(`Unexpected Java class: ${name}`)
    }
  },
  Text: { of: text },
  ItemEvents: {
    modifyTooltips(register) {
      register({ modify(itemId, callback) {
        callback({ dynamic(handlerId) { attachments[itemId] = handlerId } })
      } })
    },
    dynamicTooltips(id, callback) { handlers[id] = callback }
  }
}

const context = vm.createContext(sandbox)
// Simulate the Rhino environment that does not expose Number.isFinite.
vm.runInContext('Number.isFinite = undefined', context)
vm.runInContext(fs.readFileSync('startup_scripts/generated_cmw_material_registry.js', 'utf8'), context)
vm.runInContext(fs.readFileSync('client_scripts/cmw_part_tooltips.js', 'utf8'), context)

assert.equal(attachments['slag:dynamic_part'], 'createmyway:part_comparison')
assert.equal(attachments['slag:modular_item'], 'createmyway:equipment_details')

function linesForPart(materialId, partId) {
  const output = []
  const item = { get(component) {
    if (component === 'MATERIAL_TYPE') return materialId
    if (component === 'PART_TYPE') return partId
    return null
  } }
  handlers['createmyway:part_comparison']({ item, lines: { add(line) { output.push(line.value) } } })
  return output
}

const registry = globalData.cmwEquipmentRegistry
let gemCount = 0
let handleCount = 0
for (const [materialId, partId] of Object.entries(registry.materialParts)) {
  const lines = linesForPart(materialId, partId)
  assert(lines.some(line => line.startsWith('Material values (not final equipment stats):')), materialId)
  assert(lines.some(line => line.startsWith('  Durability ')), materialId)
  assert(lines.some(line => line.startsWith('Final stats depend on all installed parts')), materialId)
  if (partId === 'createmyway:gem') {
    gemCount++
    assert(lines.includes('Gem abilities by equipment:'), materialId)
    if (registry.materialEquipment[materialId].includes('sword')) {
      assert(lines.some(line => line.startsWith('Sword: ')), materialId)
    }
  } else if (partId === 'createmyway:handle') {
    handleCount++
  }
}
assert.equal(gemCount, 34)
assert.equal(handleCount, 9)

const rose = linesForPart('createmyway:perfect_rose_quartz_gem', 'createmyway:gem')
assert(rose.some(line => line.includes('Sword: While held: +0.75 attack reach')))
assert(rose.some(line => line.includes('Tools (') && line.includes('+1.5 block reach')))
assert(linesForPart('createmyway:cut_emerald_gem', 'createmyway:gem')
  .some(line => line.includes('Sword: Grants Looting I')))
assert(linesForPart('createmyway:cut_lapis_gem', 'createmyway:gem')
  .some(line => line.includes('Sword: No extra ability; contributes material stats only')))

function gemPart(materialId) {
  return { get(component) {
    if (component === 'PART_TYPE') return 'createmyway:gem'
    if (component === 'MATERIAL_TYPE') return materialId
    return null
  } }
}

function equipmentItem(equipment, gemMaterial) {
  // Keep the actual parts array mutable to test repeated calls after a saw
  // removes a gem and a Deployer replaces it with a different one.
  const parts = gemMaterial ? [gemPart(gemMaterial)] : []
  const item = { get(component) {
    if (component === 'MODULAR_TYPE') return `slag:${equipment}`
    if (component === 'DYNAMIC_PARTS') return { items() {
      return { iterator() {
        let index = 0
        return { hasNext: () => index < parts.length, next: () => parts[index++] }
      } }
    } }
    return null
  } }
  return { item, parts }
}

function equipmentLines(item) {
  const output = []
  handlers['createmyway:equipment_details']({ item, lines: { add(line) { output.push(line.value) } } })
  return output
}

function installedLines(equipment, gem) {
  return equipmentLines(equipmentItem(equipment, gem).item)
}

const emptySocket = ['Gem Socket: Empty']
for (const equipment of ['pickaxe', 'axe', 'shovel', 'hoe', 'sword']) {
  assert.deepEqual(installedLines(equipment, null), emptySocket, `${equipment} empty socket`)
}
assert.deepEqual(installedLines('sword', 'createmyway:perfect_rose_quartz_gem'), [
  'Gem Socket: Perfect Rose Quartz Gem',
  'Gem Bonus: While held: +0.75 attack reach'
])
assert.deepEqual(installedLines('pickaxe', 'createmyway:perfect_rose_quartz_gem'), [
  'Gem Socket: Perfect Rose Quartz Gem',
  'Gem Bonus: While held: +1.5 block reach'
])
assert.deepEqual(installedLines('axe', 'createmyway:perfect_rose_quartz_gem'), [
  'Gem Socket: Perfect Rose Quartz Gem',
  'Gem Bonus: While held: +1.5 block reach'
])
assert.deepEqual(installedLines('sword', 'createmyway:perfect_emerald_gem'), [
  'Gem Socket: Perfect Emerald Gem',
  'Gem Bonus: Grants Looting III'
])
assert.deepEqual(installedLines('pickaxe', 'createmyway:perfect_emerald_gem'), [
  'Gem Socket: Perfect Emerald Gem',
  'Gem Bonus: Grants Fortune III'
])
assert.deepEqual(installedLines('sword', 'createmyway:cut_venom_gem'), [
  'Gem Socket: Cut Venom Gem',
  'Gem Bonus: On hit: Poison I for 3s'
])
assert.deepEqual(installedLines('sword', 'createmyway:cut_lapis_gem'), [
  'Gem Socket: Cut Lapis Gem',
  'Gem Bonus: No extra ability; contributes material stats only'
])

// Test every profile on every compatible equipment type, including gems with
// multiple effects and status/enchanted gems not individually listed above.
let compatibleCombinations = 0
for (const [gem, partId] of Object.entries(registry.materialParts)) {
  if (partId !== 'createmyway:gem') continue
  for (const equipment of registry.materialEquipment[gem]) {
    const lines = installedLines(equipment, gem)
    assert.equal(lines.length, 2, `${equipment}/${gem}: only socket and bonus lines`)
    assert.equal(lines[0], `Gem Socket: ${registry.materialNames[gem]}`)
    assert(lines[1].startsWith('Gem Bonus: '), `${equipment}/${gem}: bonus missing`)
    assert(!lines[1].includes('undefined'), `${equipment}/${gem}: malformed bonus`)
    compatibleCombinations++
  }
}

// The same sword must always reflect its *current* installed gem. Removing it
// must clear the bonus, and a replacement must never show a stale Rose Quartz.
const sword = equipmentItem('sword', 'createmyway:perfect_rose_quartz_gem')
assert(equipmentLines(sword.item)[1].includes('+0.75 attack reach'))
sword.parts.pop()
assert.deepEqual(equipmentLines(sword.item), emptySocket)
sword.parts.push(gemPart('createmyway:cut_venom_gem'))
assert.deepEqual(equipmentLines(sword.item), [
  'Gem Socket: Cut Venom Gem',
  'Gem Bonus: On hit: Poison I for 3s'
])
console.log(`Tooltip regression tests passed: ${gemCount} gems, ${handleCount} handles, ${compatibleCombinations} equipped gem/tool pairs and re-socketing`)
