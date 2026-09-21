
RecipeViewerEvents.removeEntries('item', event => {
    global.cmwFilterEquipment(event)
})

// Treat component-tagged intermediates as distinct recipe-viewer entries.
RecipeViewerEvents.registerSubtypes('item', event => {
    // Slag stores the entire finished equipment identity in components. Without
    // these, JEI indexes every helmet, chestplate, leggings, and boots variant
    // as the same slag:modular_item entry, so only one variant can expose its
    // generated sequenced-assembly recipe through the output lookup.
    event.useComponents('slag:modular_item', 'slag:modular_type', 'slag:dynamic_parts')

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
