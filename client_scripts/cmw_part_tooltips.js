// Keep the finished CreateMyWay equipment tooltip unobtrusive: socket status only.
(function () {
  const $CmwTooltipComponents = Java.loadClass('dev.lopyluna.slag.register.AllDataComponents')

  function componentId(stack, component) {
    const value = stack.get(component.get())
    return value ? String(value) : ''
  }

  function gemMaterialFromParts(parts) {
    const iterator = parts.items().iterator()
    let part = null
    while (iterator.hasNext()) {
      part = iterator.next()
      if (componentId(part, $CmwTooltipComponents.PART_TYPE) === 'createmyway:gem') {
        return componentId(part, $CmwTooltipComponents.MATERIAL_TYPE)
      }
    }
    return null
  }

  function displayName(material) {
    const registry = global.cmwEquipmentRegistry
    if (registry && registry.materialNames && registry.materialNames[material]) {
      return registry.materialNames[material]
    }
    return String(material).split(':').pop().split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  ItemEvents.modifyTooltips(event => {
    event.modify('slag:modular_item', tooltip => tooltip.dynamic('createmyway:equipment_details'))
  })

  ItemEvents.dynamicTooltips('createmyway:equipment_details', event => {
    const equipment = componentId(event.item, $CmwTooltipComponents.MODULAR_TYPE).replace(/^slag:/, '')
    if (!['pickaxe', 'axe', 'shovel', 'hoe', 'sword'].includes(equipment)) return

    const parts = event.item.get($CmwTooltipComponents.DYNAMIC_PARTS.get())
    if (!parts) return

    const gemMaterial = gemMaterialFromParts(parts)
    if (gemMaterial) {
      event.lines.add(Text.of(`Gem Socket: ${displayName(gemMaterial)}`).aqua())
    } else {
      event.lines.add(Text.of('Gem Socket: Empty').darkGray())
    }
  })
})()
