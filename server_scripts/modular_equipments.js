ServerEvents.recipes(event => {
  event.remove({
    id: 'slag:crafting/modular_item'
  })

  const materials = [
    'wooden',
    'stone',
    'flint',
    'bone',
    'copper',
    'iron',
    'golden',
    'rose_gold',
    'deep_alloy',
    'lapis',
    'quartz',
    'amethyst',
    'emerald',
    'diamond',
    'obsidian',
    'echo',
    'netherite'
  ]

  // =========================================================
  // SINGLE-HEAD TOOLS
  // =========================================================

  const tools = [
    // {
    //     name: 'pickaxe',
    //     part: 'pickaxe_head'
    // },
    {
      name: 'axe',
      part: 'axe_head'
    },
    {
      name: 'shovel',
      part: 'shovel_head'
    },
    {
      name: 'hoe',
      part: 'hoe_head'
    }
  ]

  // =========================================================
  // MODULAR ARMOR
  // Armor Part + Plate -> Finished Armor
  // Full mixed-material support
  // =========================================================

  // =========================================================
  // MODULAR ARMOR
  // Full mixed-material support
  // =========================================================

  const armorTypes = [
    {
      name: 'helmet',
      part: 'helmet'
    },
    {
      name: 'chestplate',
      part: 'chestplate'
    },
    {
      name: 'leggings',
      part: 'leggings'
    },
    {
      name: 'boots',
      part: 'boots'
    }
  ]

  armorTypes.forEach(armor => {
    const incomplete = `kubejs:incomplete_${armor.name}`

    materials.forEach(armorMaterial => {
      // IMPORTANT:
      // Input is an Ingredient, not an ItemStack
      const armorPart = Ingredient.of(
        `slag:dynamic_part[slag:material_type="slag:${armorMaterial}",slag:part_type="slag:${armor.part}"]`
      )

      materials.forEach(plateMaterial => {
        // IMPORTANT:
        // Preserve the plate's data components in the ingredient
        const plate = Ingredient.of(
          `slag:dynamic_part[slag:material_type="slag:${plateMaterial}",slag:part_type="slag:plate"]`
        )

        // Output still needs to be an ItemStack
        const finishedArmor = Item.of(
          `slag:modular_item[slag:dynamic_parts=[{components:{"slag:built":"slag:${armor.name}","slag:material_type":"slag:${plateMaterial}","slag:part_type":"slag:plate"},count:1,id:"slag:dynamic_part"},{components:{"slag:built":"slag:${armor.name}","slag:material_type":"slag:${armorMaterial}","slag:part_type":"slag:${armor.part}"},count:1,id:"slag:dynamic_part"}],slag:modular_type="slag:${armor.name}"]`
        )

        event.recipes.create
          .sequenced_assembly([finishedArmor], armorPart, [
            event.recipes.create.deploying(incomplete, [incomplete, plate]),

            event.recipes.create.pressing(incomplete, incomplete)
          ])
          .transitionalItem(incomplete)
          .loops(1)
          .id(
            `createmyway:${armorMaterial}_${plateMaterial}_${armor.name}_assembly`
          )
      })
    })
  })

  tools.forEach(tool => {
    const incomplete = `kubejs:incomplete_${tool.name}`

    materials.forEach(material => {
      // Input head
      const toolHead = Item.of(
        `slag:dynamic_part[slag:material_type="slag:${material}",slag:part_type="slag:${tool.part}"]`
      )

      // Finished modular tool
      const finishedTool = Item.of(
        `slag:modular_item[slag:dynamic_parts=[{components:{"slag:built":"slag:${tool.name}","slag:material_type":"slag:${material}","slag:part_type":"slag:${tool.part}"},count:1,id:"slag:dynamic_part"},{components:{"slag:built":"slag:${tool.name}"},count:2,id:"minecraft:stick"}],slag:modular_type="slag:${tool.name}"]`
      )

      event.recipes.create
        .sequenced_assembly([finishedTool], toolHead, [
          event.recipes.create.deploying(incomplete, [
            incomplete,
            'minecraft:stick'
          ]),

          event.recipes.create.deploying(incomplete, [
            incomplete,
            'minecraft:stick'
          ]),

          event.recipes.create.pressing(incomplete, incomplete)
        ])
        .transitionalItem(incomplete)
        .loops(1)
        .id(`createmyway:${material}_${tool.name}_assembly`)
    })
  })

  // =========================================================
  // MODULAR SWORDS
  // Blade + Guard + Stick -> Finished Sword
  // Full mixed-material support
  // =========================================================

  materials.forEach(bladeMaterial => {
    const swordBlade = Ingredient.of(
      `slag:dynamic_part[slag:material_type="slag:${bladeMaterial}",slag:part_type="slag:sword_blade"]`
    )

    materials.forEach(guardMaterial => {
      const guard = Ingredient.of(
        `slag:dynamic_part[slag:material_type="slag:${guardMaterial}",slag:part_type="slag:guard"]`
      )

      const finishedSword = Item.of(
        `slag:modular_item[slag:dynamic_parts=[{components:{"slag:built":"slag:sword","slag:material_type":"slag:${bladeMaterial}","slag:part_type":"slag:sword_blade"},count:1,id:"slag:dynamic_part"},{components:{"slag:built":"slag:sword","slag:material_type":"slag:${guardMaterial}","slag:part_type":"slag:guard"},count:1,id:"slag:dynamic_part"},{components:{"slag:built":"slag:sword"},count:1,id:"minecraft:stick"}],slag:modular_type="slag:sword"]`
      )

      event.recipes.create
        .sequenced_assembly([finishedSword], swordBlade, [
          // Install guard
          event.recipes.create.deploying('kubejs:incomplete_sword', [
            'kubejs:incomplete_sword',
            guard
          ]),

          // Install handle
          event.recipes.create.deploying('kubejs:incomplete_sword', [
            'kubejs:incomplete_sword',
            'minecraft:stick'
          ]),

          // Final shaping
          event.recipes.create.pressing(
            'kubejs:incomplete_sword',
            'kubejs:incomplete_sword'
          )
        ])
        .transitionalItem('kubejs:incomplete_sword')
        .loops(1)
        .id(`createmyway:${bladeMaterial}_${guardMaterial}_sword_assembly`)
    })
  })

  // =========================================================
  // TETRA-STYLE PICKAXE TEST
  //
  // Iron Head
  // + Amethyst Gem
  // + Rose Gold Handle
  // =========================================================

  const testHead = Ingredient.of(
    `slag:dynamic_part[slag:material_type="slag:iron",slag:part_type="slag:pickaxe_head"]`
  )

  const testGem = Ingredient.of(
    `slag:dynamic_part[slag:material_type="createmyway:amethyst_gem",slag:part_type="createmyway:gem"]`
  )

  const testHandle = Ingredient.of(
    `slag:dynamic_part[slag:material_type="createmyway:rose_gold_handle",slag:part_type="createmyway:handle"]`
  )

  const testPickaxe = Item.of(
    `slag:modular_item[slag:dynamic_parts=[{components:{"slag:built":"slag:pickaxe","slag:material_type":"slag:iron","slag:part_type":"slag:pickaxe_head"},count:1,id:"slag:dynamic_part"},{components:{"slag:built":"slag:pickaxe","slag:material_type":"createmyway:amethyst_gem","slag:part_type":"createmyway:gem"},count:1,id:"slag:dynamic_part"},{components:{"slag:built":"slag:pickaxe","slag:material_type":"createmyway:rose_gold_handle","slag:part_type":"createmyway:handle"},count:1,id:"slag:dynamic_part"}],slag:modular_type="slag:pickaxe"]`
  )

  event.recipes.create
    .sequenced_assembly([testPickaxe], testHead, [
      // Insert Gem
      event.recipes.create.deploying('kubejs:incomplete_pickaxe', [
        'kubejs:incomplete_pickaxe',
        testGem
      ]),

      // Attach Handle
      event.recipes.create.deploying('kubejs:incomplete_pickaxe', [
        'kubejs:incomplete_pickaxe',
        testHandle
      ]),

      // Final assembly
      event.recipes.create.pressing(
        'kubejs:incomplete_pickaxe',
        'kubejs:incomplete_pickaxe'
      )
    ])
    .transitionalItem('kubejs:incomplete_pickaxe')
    .loops(1)
    .id('createmyway:test_modular_pickaxe')
})
