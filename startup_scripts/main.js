StartupEvents.registry('item', event => {

    // TOOLS
    event.create('incomplete_pickaxe', 'create:sequenced_assembly')
        .displayName('Incomplete Pickaxe')
        .texture('minecraft:item/iron_pickaxe')

    event.create('incomplete_axe', 'create:sequenced_assembly')
        .displayName('Incomplete Axe')
        .texture('minecraft:item/iron_axe')

    event.create('incomplete_shovel', 'create:sequenced_assembly')
        .displayName('Incomplete Shovel')
        .texture('minecraft:item/iron_shovel')

    event.create('incomplete_hoe', 'create:sequenced_assembly')
        .displayName('Incomplete Hoe')
        .texture('minecraft:item/iron_hoe')

    // SWORD
    event.create('incomplete_sword', 'create:sequenced_assembly')
        .displayName('Incomplete Sword')
        .texture('minecraft:item/iron_sword')

    event.create('equipment_grip_core', 'create:sequenced_assembly')
        .displayName('Equipment Grip Core')
        .texture('minecraft:item/blaze_rod')

    event.create('incomplete_refined_gem', 'create:sequenced_assembly')
        .displayName('Incomplete Refined Gem')
        .texture('minecraft:item/diamond')

    event.create('incomplete_perfect_gem', 'create:sequenced_assembly')
        .displayName('Incomplete Perfect Gem')
        .texture('minecraft:item/nether_star')


    // ARMOR
    event.create('incomplete_helmet', 'create:sequenced_assembly')
        .displayName('Incomplete Helmet')
        .texture('minecraft:item/iron_helmet')

    event.create('incomplete_chestplate', 'create:sequenced_assembly')
        .displayName('Incomplete Chestplate')
        .texture('minecraft:item/iron_chestplate')

    event.create('incomplete_leggings', 'create:sequenced_assembly')
        .displayName('Incomplete Leggings')
        .texture('minecraft:item/iron_leggings')

    event.create('incomplete_boots', 'create:sequenced_assembly')
        .displayName('Incomplete Boots')
        .texture('minecraft:item/iron_boots')
})


 // =========================================================
 // CREATE MY WAY - SHARED EQUIPMENT VISIBILITY FILTER
 // =========================================================

 // Material roles are generated from each material JSON's cmw_role field.
 // See generated_cmw_material_registry.js.

 global.cmwIsInvalidPart = stack => {
     if (stack.id !== 'slag:dynamic_part') {
         return false
     }

     const material = String(stack.get('slag:material_type'))
     const part = String(stack.get('slag:part_type'))

     const registry = global.cmwEquipmentRegistry

     if (!registry) {
         return false
     }

     const expectedPart = registry.materialParts[material] || null
     const customPart = registry.customPartIds.includes(part)

     // Normal S&E combinations remain untouched.
     if (expectedPart === null && !customPart) {
         return false
     }

     // A custom part must match its material profile.
     return part !== expectedPart
 }


 // This handles both individual parts and assembled equipment.
 global.cmwIsInvalidEquipment = stack => {

     // Kept registered only so existing worlds do not lose the old item ID.
     // The redesigned system no longer exposes or recipes the legacy grip core.
     if (stack.id === 'kubejs:equipment_grip_core') {
         return true
     }

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

     const modularType = String(stack.get('slag:modular_type'))
         .replace(/^slag:/, '')
     const registry = global.cmwEquipmentRegistry

     // A custom material may deliberately support only one equipment type
     // (status gems, for example, are sword-only).
     for (const part of data.items()) {
         const material = String(part.get('slag:material_type'))
         const allowed = registry.materialEquipment[material]

         if (allowed && !allowed.includes(modularType)) {
             return true
         }
     }

     return false
 }


 // A single filter function shared by creative and JEI.
 global.cmwFilterEquipment = event => {
     if (!global.cmwEquipmentRegistry) {
         console.error('[CreateMyWay] Missing generated material registry; equipment visibility was not filtered.')
         return
     }

     event.remove(stack => global.cmwIsInvalidEquipment(stack))
 }


 // Creative inventory
 StartupEvents.modifyCreativeTab('slag:tools_parts_tab', event => {
     global.cmwFilterEquipment(event)
 })
