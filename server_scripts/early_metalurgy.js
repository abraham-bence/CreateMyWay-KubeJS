ServerEvents.recipes(event => {

    // =========================================================
    // CREATE MY WAY - EARLY METALLURGY
    // =========================================================


    // ---------------------------------------------------------
    // Deep Alloy
    // Raw Iron + Polished Deepslate -> Deep Alloy
    // ---------------------------------------------------------

    event.remove({ id: 'slag:double_smelting/deep_alloy' })

    event.custom({
        type: 'slag:double_smelting',
        cookingTime: 200,
        experience: 1.4,
        ingredientA: {
            item: 'minecraft:raw_iron'
        },
        ingredientB: {
            item: 'minecraft:polished_deepslate'
        },
        result: {
            count: 1,
            id: 'slag:deep_alloy'
        }
    }).id('createmyway:deep_alloy_from_raw_iron')


    // ---------------------------------------------------------
    // Melter
    // 8 Deep Alloy -> Melter
    // ---------------------------------------------------------

    event.remove({ id: 'slag:crafting/melter' })

    event.shaped(
        'slag:melter',
        [
            'AAA',
            'A A',
            'AAA'
        ],
        {
            A: 'slag:deep_alloy'
        }
    ).id('createmyway:melter')


    // =========================================================
    // MELTER CONTROL
    // =========================================================

    // Remove every stock Slag n' Embers melting recipe.
    event.remove({ type: 'slag:melting' })


    // Only Raw Iron can be melted in the early Melter.
    // 1 Raw Iron -> 36 mB
    // 2 Raw Iron -> 72 mB
    event.custom({
        type: 'slag:melting',
        ingredient: {
            item: 'minecraft:raw_iron'
        },
        ingredients: [],
        result: [
            {
                amount: 24,
                id: 'slag:molten_iron'
            }
        ]
    }).id('createmyway:raw_iron_melting')


    // =========================================================
    // IRON INGOT PROGRESSION LOCK
    // =========================================================

    // Delete every recipe from every mod that produces Iron Ingots.
    event.remove({
        output: 'minecraft:iron_ingot'
    })


    // ---------------------------------------------------------
    // APPROVED METHOD #1:
    // Slag n' Embers Casting Table
    // ---------------------------------------------------------

    event.custom({
        type: 'slag:table_casting',
        cast: 'slag:cast/ingots',
        ingredient: {
            amount: 72,
            id: 'slag:molten_iron'
        },
        result: {
            count: 1,
            id: 'minecraft:iron_ingot'
        }
    }).id('createmyway:iron_ingot_from_slag_casting')



    // =========================================================
    // SLAG N' EMBERS PARTS - NO CRAFTING TABLE RECIPES
    // =========================================================

    const slagPartTypes = [
        'axe_head',
        'boots',
        'chestplate',
        'guard',
        'helmet',
        'hoe_head',
        'leggings',
        'pickaxe_head',
        'plate',
        'shovel_head',
        'sword_blade'
    ]

    const slagPartMaterials = [
        'amethyst',
        'bone',
        'copper',
        'deep_alloy',
        'diamond',
        'echo',
        'emerald',
        'flint',
        'golden',
        'iron',
        'lapis',
        'obsidian',
        'quartz',
        'rose_gold',
    ]

    slagPartTypes.forEach(part => {
        slagPartMaterials.forEach(material => {
            event.remove({
                id: `slag:crafting/parts/${part}_${material}`
            })
        })
    })

})