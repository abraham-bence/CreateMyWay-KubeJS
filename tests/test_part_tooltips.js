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

function equipmentLines(gemMaterial) {
  const output = []
  const parts = gemMaterial ? [{ get(component) {
    return component === 'PART_TYPE' ? 'createmyway:gem'
      : component === 'MATERIAL_TYPE' ? gemMaterial : null
  } }] : []
  const item = { get(component) {
    if (component === 'MODULAR_TYPE') return 'slag:sword'
    if (component === 'DYNAMIC_PARTS') return { items() {
      return { iterator() {
        let index = 0
        return { hasNext: () => index < parts.length, next: () => parts[index++] }
      } }
    } }
    return null
  } }
  handlers['createmyway:equipment_details']({ item, lines: { add(line) { output.push(line.value) } } })
  return output
}
assert.deepEqual(equipmentLines(null), ['Gem Socket: Empty'])
assert.deepEqual(equipmentLines('createmyway:perfect_rose_quartz_gem'), ['Gem Socket: Perfect Rose Quartz Gem'])
console.log(`Tooltip regression tests passed: ${gemCount} gems, ${handleCount} handles, sword and socket cases`)
