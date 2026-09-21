// Source-level guard for JEI's component-sensitive recipe lookup. This is not
// an in-game JEI test; it ensures the subtype registration cannot be removed
// accidentally while the armor recipes keep component-bearing outputs.
const assert = require('node:assert/strict')
const fs = require('node:fs')

const source = fs.readFileSync('client_scripts/slag_jei_visibility.js', 'utf8')

assert.match(
  source,
  /event\.useComponents\('slag:modular_item', 'slag:modular_type', 'slag:dynamic_parts'\)/,
  'finished modular equipment must be a component-sensitive recipe-viewer subtype'
)

for (const equipment of ['helmet', 'chestplate', 'leggings', 'boots']) {
  assert.match(
    source,
    new RegExp(`event\\.useComponents\\('kubejs:incomplete_${equipment}', 'custom_data'\\)`),
    `${equipment} transitional assemblies must remain distinct in the recipe viewer`
  )
}

console.log('JEI modular subtype regression test passed')
