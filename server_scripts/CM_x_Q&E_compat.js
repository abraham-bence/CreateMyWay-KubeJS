ServerEvents.recipes(event => {

    // =========================================================
    // CREATE METALLURGY -> SLAG N' EMBERS PART CASTING
    // =========================================================

    /*
     * baseMultiplier:
     *
     * Most S&E materials use:
     * Guard / Shovel       = 1 unit
     * Blade / Hoe / Plate  = 2 units
     * Boots                = 2 units
     * Pickaxe / Axe        = 3 units
     * Helmet               = 3 units
     * Leggings             = 5 units
     * Chestplate           = 6 units
     *
     * Create Metallurgy uses 90 mB per ingot-equivalent.
     *
     * Obsidian is special in S&E:
     * its casting costs are 9x the normal material costs.
     *
     * Netherite is also special:
     * every S&E Netherite part costs exactly one ingot-equivalent.
     */

    const castingMaterials = [

        // =====================================================
        // CREATE METALLURGY NATIVE FLUIDS
        // =====================================================

        {
            material: 'iron',
            fluid: 'createmetallurgy:molten_iron',
            mode: 'normal'
        },

        {
            material: 'copper',
            fluid: 'createmetallurgy:molten_copper',
            mode: 'normal'
        },

        {
            material: 'golden',
            fluid: 'createmetallurgy:molten_gold',
            mode: 'normal'
        },

        {
            material: 'netherite',
            fluid: 'createmetallurgy:molten_netherite',
            mode: 'netherite'
        },


        // =====================================================
        // S&E SPECIAL / GEM FLUIDS
        // Used inside the Create Metallurgy Casting Table
        // =====================================================

        {
            material: 'amethyst',
            fluid: 'slag:molten_amethyst',
            mode: 'normal'
        },

        {
            material: 'diamond',
            fluid: 'slag:molten_diamond',
            mode: 'normal'
        },

        {
            material: 'emerald',
            fluid: 'slag:molten_emerald',
            mode: 'normal'
        },

        {
            material: 'lapis',
            fluid: 'slag:molten_lapis',
            mode: 'normal'
        },

        {
            material: 'quartz',
            fluid: 'slag:molten_quartz',
            mode: 'normal'
        },

        {
            material: 'rose_gold',
            fluid: 'slag:molten_rose_gold',
            mode: 'normal'
        },

        {
            material: 'obsidian',
            fluid: 'slag:molten_obsidian',
            mode: 'obsidian'
        }
    ]


    // =========================================================
    // PART DEFINITIONS
    // =========================================================

    const parts = [

        {
            part: 'shovel_head',
            cast: 'shovel_heads',
            units: 1
        },

        {
            part: 'guard',
            cast: 'guards',
            units: 1
        },

        {
            part: 'sword_blade',
            cast: 'sword_blades',
            units: 2
        },

        {
            part: 'hoe_head',
            cast: 'hoe_heads',
            units: 2
        },

        {
            part: 'plate',
            cast: 'plates',
            units: 2
        },

        {
            part: 'boots',
            cast: 'boots',
            units: 2
        },

        {
            part: 'pickaxe_head',
            cast: 'pickaxe_heads',
            units: 3
        },

        {
            part: 'axe_head',
            cast: 'axe_heads',
            units: 3
        },

        {
            part: 'helmet',
            cast: 'helmets',
            units: 3
        },

        {
            part: 'leggings',
            cast: 'leggings',
            units: 5
        },

        {
            part: 'chestplate',
            cast: 'chestplates',
            units: 6
        }
    ]


    // =========================================================
    // CALCULATE MATERIAL COST
    // =========================================================

    function getFluidAmount(materialData, partData) {

        // S&E Netherite is weird:
        // every single part costs exactly one Netherite unit.
        if (materialData.mode === 'netherite') {
            return 90
        }

        // S&E Obsidian uses 9x normal material quantity.
        if (materialData.mode === 'obsidian') {
            return partData.units * 90 * 9
        }

        // Standard material
        return partData.units * 90
    }


    // =========================================================
    // GENERATE EVERY CASTING RECIPE
    // =========================================================

    castingMaterials.forEach(materialData => {

        parts.forEach(partData => {

            const result = Item.of(
                `slag:dynamic_part[slag:material_type="slag:${materialData.material}",slag:part_type="slag:${partData.part}"]`
            )

            const mold = Ingredient.of(
                `slag:terracotta_mold[slag:cast_type="slag:cast/${partData.cast}"]`
            )

            const fluidAmount = getFluidAmount(
                materialData,
                partData
            )

            event.recipes.createmetallurgy
                .casting_in_table(
                    result,
                    [
                        Fluid.of(
                            materialData.fluid,
                            fluidAmount
                        ),
                        mold
                    ]
                )
                .processingTime(100)
                .id(
                    `createmyway:cm_${materialData.material}_${partData.part}`
                )
        })
    })
})