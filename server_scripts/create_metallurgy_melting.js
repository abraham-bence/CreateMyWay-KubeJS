ServerEvents.recipes(event => {

    // =========================================================
    // CREATE METALLURGY -> S&E GEM MELTING
    //
    // 1 material item = 90 mB molten material
    // =========================================================

    const gemMaterials = [
        {
            name: 'amethyst',
            input: 'minecraft:amethyst_shard',
            fluid: 'slag:molten_amethyst'
        },
        {
            name: 'diamond',
            input: 'minecraft:diamond',
            fluid: 'slag:molten_diamond'
        },
        {
            name: 'emerald',
            input: 'minecraft:emerald',
            fluid: 'slag:molten_emerald'
        },
        {
            name: 'lapis',
            input: 'minecraft:lapis_lazuli',
            fluid: 'slag:molten_lapis'
        },
        {
            name: 'quartz',
            input: 'minecraft:quartz',
            fluid: 'slag:molten_quartz'
        }
    ]


    // =========================================================
    // GENERATE MELTING RECIPES
    // =========================================================

    gemMaterials.forEach(material => {

        event.recipes.createmetallurgy
            .melting(
                Fluid.of(material.fluid, 90),
                material.input
            )
            .heated()
            .processingTime(48)
            .id(`createmyway:melting_${material.name}`)
    })

    event.recipes.createmetallurgy
        .melting(
            Fluid.of('slag:molten_obsidian', 810),
            'minecraft:obsidian'
        )
        .heated()
        .processingTime(96)
        .id('createmyway:melting_obsidian')
})