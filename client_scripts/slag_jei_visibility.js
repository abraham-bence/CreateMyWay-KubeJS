RecipeViewerEvents.removeEntries('item', event => {
    global.cmwFilterEquipment(event)
})

// Treat component-tagged intermediates as distinct recipe-viewer entries.
RecipeViewerEvents.registerSubtypes('item', event => {
    // Slag already provides its own JEI subtype interpreter for slag:modular_item.
    // Do NOT override it with KubeJS's generic component interpreter.

    event.useComponents('kubejs:incomplete_pickaxe', 'custom_data')
    event.useComponents('kubejs:incomplete_axe', 'custom_data')
    event.useComponents('kubejs:incomplete_shovel', 'custom_data')
    event.useComponents('kubejs:incomplete_hoe', 'custom_data')
    event.useComponents('kubejs:sword_guard_core', 'custom_data')
    event.useComponents('kubejs:incomplete_sword', 'custom_data')
    event.useComponents('kubejs:incomplete_helmet', 'custom_data')
    event.useComponents('kubejs:incomplete_chestplate', 'custom_data')
    event.useComponents('kubejs:incomplete_leggings', 'custom_data')
    event.useComponents('kubejs:incomplete_boots', 'custom_data')
    event.useComponents('kubejs:incomplete_refined_gem', 'custom_data')
    event.useComponents('kubejs:incomplete_perfect_gem', 'custom_data')
})

// Register every generated modular equipment variant as an explicit JEI entry.
//
// JEI knows the recipe exists, but the finished slag:modular_item variants
// are dynamically generated through components and therefore aren't all
// discovered as item entries automatically.

const CMW_ARMOR_MATERIALS = [
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

const CMW_ARMOR_TYPES = [
    'helmet',
    'chestplate',
    'leggings',
    'boots'
]

const CMW_TOOL_TYPES = {
    pickaxe: 'pickaxe_head',
    axe: 'axe_head',
    shovel: 'shovel_head',
    hoe: 'hoe_head'
}

const CMW_HANDLE_MATERIALS = Object.keys(global.cmwEquipmentRegistry.materialParts)
    .filter(id => global.cmwEquipmentRegistry.materialParts[id] === 'createmyway:handle')


const cmwBuiltPart = (equipment, material, part) =>
    `{components:{` +
        `"slag:built":"slag:${equipment}",` +
        `"slag:material_type":"${material}",` +
        `"slag:part_type":"${part}"` +
    `},count:1,id:"slag:dynamic_part"}`


const cmwModularItem = (equipment, parts) =>
    Item.of(
        `slag:modular_item[` +
            `slag:dynamic_parts=[${parts.join(',')}],` +
            `slag:modular_type="slag:${equipment}"` +
        `]`
    )


RecipeViewerEvents.addEntries('item', event => {

    // ============================================================
    // ARMOR
    // ============================================================

    for (const armor of CMW_ARMOR_TYPES) {
        for (const armorMaterial of CMW_ARMOR_MATERIALS) {
            for (const plateMaterial of CMW_ARMOR_MATERIALS) {

                const finished = cmwModularItem(armor, [
                    cmwBuiltPart(
                        armor,
                        `slag:${plateMaterial}`,
                        'slag:plate'
                    ),
                    cmwBuiltPart(
                        armor,
                        `slag:${armorMaterial}`,
                        `slag:${armor}`
                    )
                ])

                event.add(finished)
            }
        }
    }


    // ============================================================
    // TOOLS
    // ============================================================

    for (const equipment of Object.keys(CMW_TOOL_TYPES)) {
        const headPart = CMW_TOOL_TYPES[equipment]

        for (const headMaterial of CMW_ARMOR_MATERIALS) {
            for (const handle of CMW_HANDLE_MATERIALS) {

                // Matches modular_equipments.js:
                //
                // [
                //   head,
                //   handle
                // ]

                const finished = cmwModularItem(equipment, [
                    cmwBuiltPart(
                        equipment,
                        `slag:${headMaterial}`,
                        `slag:${headPart}`
                    ),
                    cmwBuiltPart(
                        equipment,
                        handle,
                        'createmyway:handle'
                    )
                ])

                event.add(finished)
            }
        }
    }


    // ============================================================
    // SWORDS
    // ============================================================

    for (const bladeMaterial of CMW_ARMOR_MATERIALS) {
        for (const guardMaterial of CMW_ARMOR_MATERIALS) {
            for (const handle of CMW_HANDLE_MATERIALS) {

                // Matches modular_equipments.js:
                //
                // [
                //   blade,
                //   guard,
                //   handle
                // ]

                const finished = cmwModularItem('sword', [
                    cmwBuiltPart(
                        'sword',
                        `slag:${bladeMaterial}`,
                        'slag:sword_blade'
                    ),
                    cmwBuiltPart(
                        'sword',
                        `slag:${guardMaterial}`,
                        'slag:guard'
                    ),
                    cmwBuiltPart(
                        'sword',
                        handle,
                        'createmyway:handle'
                    )
                ])

                event.add(finished)
            }
        }
    }
})