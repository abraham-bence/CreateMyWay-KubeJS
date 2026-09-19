ServerEvents.recipes(event => {
  event.remove({ id: 'slag:crafting/modular_item' })

  const baseMaterials = [
    'wooden', 'stone', 'flint', 'bone', 'copper', 'iron', 'golden',
    'rose_gold', 'deep_alloy', 'lapis', 'quartz', 'amethyst', 'emerald',
    'diamond', 'obsidian', 'echo', 'netherite'
  ]

  // Original mixed-material armor progression.
  const armorTypes = [
    { name: 'helmet', part: 'helmet' },
    { name: 'chestplate', part: 'chestplate' },
    { name: 'leggings', part: 'leggings' },
    { name: 'boots', part: 'boots' }
  ]
  armorTypes.forEach(armor => {
    const incomplete = `kubejs:incomplete_${armor.name}`
    baseMaterials.forEach(armorMaterial => {
      const armorPart = Ingredient.of(`slag:dynamic_part[slag:material_type="slag:${armorMaterial}",slag:part_type="slag:${armor.part}"]`)
      baseMaterials.forEach(plateMaterial => {
        const plate = Ingredient.of(`slag:dynamic_part[slag:material_type="slag:${plateMaterial}",slag:part_type="slag:plate"]`)
        const finished = Item.of(`slag:modular_item[slag:dynamic_parts=[{components:{"slag:built":"slag:${armor.name}","slag:material_type":"slag:${plateMaterial}","slag:part_type":"slag:plate"},count:1,id:"slag:dynamic_part"},{components:{"slag:built":"slag:${armor.name}","slag:material_type":"slag:${armorMaterial}","slag:part_type":"slag:${armor.part}"},count:1,id:"slag:dynamic_part"}],slag:modular_type="slag:${armor.name}"]`)
        event.recipes.create.sequenced_assembly([finished], armorPart, [
          event.recipes.create.deploying(incomplete, [incomplete, plate]),
          event.recipes.create.pressing(incomplete, incomplete)
        ]).transitionalItem(incomplete).loops(1)
          .id(`createmyway:${armorMaterial}_${plateMaterial}_${armor.name}_assembly`)
      })
    })
  })

  const registry = global.cmwEquipmentRegistry
  if (!registry) {
    console.error('[CreateMyWay] Missing generated registry; plain equipment recipes were skipped.')
    return
  }

  const title = value => String(value).split(':').pop().split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  const materialPath = id => String(id).split(':')[1]
  const dynamicPart = (material, part) =>
    `slag:dynamic_part[slag:material_type="${material}",slag:part_type="${part}"]`
  const builtPart = (equipment, material, part) =>
    `{components:{"slag:built":"slag:${equipment}","slag:material_type":"${material}","slag:part_type":"${part}"},count:1,id:"slag:dynamic_part"}`
  const modularItem = (equipment, parts) =>
    Item.of(`slag:modular_item[slag:dynamic_parts=[${parts.join(',')}],slag:modular_type="slag:${equipment}"]`)
  const handles = Object.keys(registry.materialParts)
    .filter(id => registry.materialParts[id] === 'createmyway:handle')
  const allows = (material, equipment) =>
    (registry.materialEquipment[material] || []).includes(equipment)

  const utilityTools = {
    pickaxe: 'pickaxe_head',
    axe: 'axe_head',
    shovel: 'shovel_head',
    hoe: 'hoe_head'
  }

  // Plain tools are Head + Handle. Gems are socketed later with a Deployer.
  Object.keys(utilityTools).forEach(equipment => {
    const headPart = utilityTools[equipment]
    baseMaterials.forEach(headMaterial => {
      const headMaterialId = `slag:${headMaterial}`
      const head = Ingredient.of(dynamicPart(headMaterialId, `slag:${headPart}`))
      handles.filter(handle => allows(handle, equipment)).forEach(handle => {
        const handleIngredient = Ingredient.of(dynamicPart(handle, 'createmyway:handle'))
        const assembly = `kubejs:incomplete_${equipment}[minecraft:custom_data={cmw_equipment:"${equipment}",cmw_head:"${headMaterialId}",cmw_handle:"${handle}",cmw_stage:"plain_assembly"}]`
        const assemblyName = `${title(headMaterial)} + ${registry.materialNames[handle]} Plain ${title(equipment)} Assembly`
        const assemblyStack = Item.of(assembly).withCustomName(assemblyName)
        const finished = modularItem(equipment, [
          builtPart(equipment, headMaterialId, `slag:${headPart}`),
          builtPart(equipment, handle, 'createmyway:handle')
        ])

        event.recipes.create.sequenced_assembly([finished], head, [
          event.recipes.create.deploying(assemblyStack, [assemblyStack, handleIngredient]),
          event.recipes.create.pressing(assemblyStack, assemblyStack)
        ]).transitionalItem(assemblyStack).loops(1)
          .id(`createmyway:${headMaterial}_${materialPath(handle)}_${equipment}_assembly`)
      })
    })
  })

  // Step 1: Handle + S&E Guard -> uniquely component-tagged Sword Guard Core.
  // Every handle/guard pair has a distinct first Deployer operation; no gem
  // or blade is required to construct the reusable structural core.
  const swordCores = []
  handles.filter(handle => allows(handle, 'sword')).forEach(handle => {
    const handleIngredient = Ingredient.of(dynamicPart(handle, 'createmyway:handle'))
    baseMaterials.forEach(guardMaterial => {
      const guardMaterialId = `slag:${guardMaterial}`
      const guard = Ingredient.of(dynamicPart(guardMaterialId, 'slag:guard'))
      const coreData = `cmw_guard:"${guardMaterialId}",cmw_handle:"${handle}"`
      const coreName = `${registry.materialNames[handle]} + ${title(guardMaterial)} Guard Sword Core`
      const coreStack = Item.of(`kubejs:sword_guard_core[minecraft:custom_data={${coreData}}]`)
        .withCustomName(coreName)
      const coreAssembly = Item.of(`kubejs:sword_guard_core[minecraft:custom_data={${coreData},cmw_stage:"guard_assembly"}]`)
        .withCustomName(`${coreName} Assembly`)

      event.recipes.create.sequenced_assembly([coreStack], handleIngredient, [
        event.recipes.create.deploying(coreAssembly, [coreAssembly, guard]),
        event.recipes.create.pressing(coreAssembly, coreAssembly)
      ]).transitionalItem(coreAssembly).loops(1)
        .id(`createmyway:${guardMaterial}_${materialPath(handle)}_sword_guard_core`)

      swordCores.push({ handle, guardMaterialId, guardMaterial, coreStack })
    })
  })

  // Step 2: The exact Sword Guard Core receives its Blade, then is pressed.
  // This distinguishes every Blade x Guard x Handle combination immediately.
  swordCores.forEach(core => {
    const coreIngredient = Ingredient.of(core.coreStack)
    baseMaterials.forEach(bladeMaterial => {
      const bladeMaterialId = `slag:${bladeMaterial}`
      const blade = Ingredient.of(dynamicPart(bladeMaterialId, 'slag:sword_blade'))
      const assembly = `kubejs:incomplete_sword[minecraft:custom_data={cmw_blade:"${bladeMaterialId}",cmw_guard:"${core.guardMaterialId}",cmw_handle:"${core.handle}",cmw_stage:"blade_assembly"}]`
      const assemblyName = `${title(bladeMaterial)} Blade + ${title(core.guardMaterial)} Guard + ${registry.materialNames[core.handle]} Sword Assembly`
      const assemblyStack = Item.of(assembly).withCustomName(assemblyName)
      const finished = modularItem('sword', [
        builtPart('sword', bladeMaterialId, 'slag:sword_blade'),
        builtPart('sword', core.guardMaterialId, 'slag:guard'),
        builtPart('sword', core.handle, 'createmyway:handle')
      ])

      event.recipes.create.sequenced_assembly([finished], coreIngredient, [
        event.recipes.create.deploying(assemblyStack, [assemblyStack, blade]),
        event.recipes.create.pressing(assemblyStack, assemblyStack)
      ]).transitionalItem(assemblyStack).loops(1)
        .id(`createmyway:${bladeMaterial}_${core.guardMaterial}_${materialPath(core.handle)}_sword_assembly`)
    })
  })
})
