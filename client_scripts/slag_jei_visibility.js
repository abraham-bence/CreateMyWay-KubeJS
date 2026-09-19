
RecipeViewerEvents.removeEntries('item', event => {
    global.cmwFilterEquipment(event)
})

// Treat component-tagged intermediates as distinct recipe-viewer entries.
RecipeViewerEvents.registerSubtypes('item', event => {
    event.useComponents('kubejs:incomplete_pickaxe', 'custom_data')
    event.useComponents('kubejs:incomplete_axe', 'custom_data')
    event.useComponents('kubejs:incomplete_shovel', 'custom_data')
    event.useComponents('kubejs:incomplete_hoe', 'custom_data')
    event.useComponents('kubejs:incomplete_sword', 'custom_data')
    event.useComponents('kubejs:incomplete_refined_gem', 'custom_data')
    event.useComponents('kubejs:incomplete_perfect_gem', 'custom_data')
})
