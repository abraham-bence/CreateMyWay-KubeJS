StartupEvents.registry('item', event => {

    // TOOLS
    event.create('incomplete_pickaxe', 'create:sequenced_assembly')
        .displayName('Incomplete Pickaxe')

    event.create('incomplete_axe', 'create:sequenced_assembly')
        .displayName('Incomplete Axe')

    event.create('incomplete_shovel', 'create:sequenced_assembly')
        .displayName('Incomplete Shovel')

    event.create('incomplete_hoe', 'create:sequenced_assembly')
        .displayName('Incomplete Hoe')

    // SWORD
    event.create('incomplete_sword', 'create:sequenced_assembly')
        .displayName('Incomplete Sword')


    // ARMOR
    event.create('incomplete_helmet', 'create:sequenced_assembly')
        .displayName('Incomplete Helmet')

    event.create('incomplete_chestplate', 'create:sequenced_assembly')
        .displayName('Incomplete Chestplate')

    event.create('incomplete_leggings', 'create:sequenced_assembly')
        .displayName('Incomplete Leggings')

    event.create('incomplete_boots', 'create:sequenced_assembly')
        .displayName('Incomplete Boots')
})


 // =========================================================
 // CREATE MY WAY - SHARED EQUIPMENT VISIBILITY FILTER
 // =========================================================

 // Material naming convention:
 // createmyway:iron_handle      -> createmyway:handle
 // createmyway:amethyst_gem     -> createmyway:gem
 // createmyway:cut_diamond_gem  -> createmyway:gem

 global.cmwIsInvalidPart = stack => {
     if (stack.id !== 'slag:dynamic_part') {
         return false
     }

     const material = String(stack.get('slag:material_type'))
     const part = String(stack.get('slag:part_type'))

     const customMaterial = material.startsWith('createmyway:')

     const expectedPart =
         customMaterial && material.endsWith('_gem')
             ? 'createmyway:gem'
             : customMaterial && material.endsWith('_handle')
                 ? 'createmyway:handle'
                 : null

     const customPart =
         part === 'createmyway:gem' ||
         part === 'createmyway:handle'

     // Normal S&E combinations remain untouched.
     if (expectedPart === null && !customPart) {
         return false
     }

     // A custom part must match its material profile.
     return part !== expectedPart
 }


 // This handles both individual parts and assembled equipment.
 global.cmwIsInvalidEquipment = stack => {

     if (stack.id === 'slag:dynamic_part') {
         return global.cmwIsInvalidPart(stack)
     }

     if (stack.id !== 'slag:modular_item') {
         return false
     }

     const data = stack.get('slag:dynamic_parts')

     if (!data) {
         return false
     }

     for (const part of data.items()) {
         if (global.cmwIsInvalidPart(part)) {
             return true
         }
     }

     return false
 }


 // A single filter function shared by creative and JEI.
 global.cmwFilterEquipment = event => {
     event.remove(stack => global.cmwIsInvalidEquipment(stack))
 }


 // Creative inventory
 StartupEvents.modifyCreativeTab('slag:tools_parts_tab', event => {
     global.cmwFilterEquipment(event)
 })