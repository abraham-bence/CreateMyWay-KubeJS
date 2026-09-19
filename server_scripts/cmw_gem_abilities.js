// Event-driven CreateMyWay gem abilities. No inventory tick scanning.

const $CmwServerPlayer = Java.loadClass('net.minecraft.server.level.ServerPlayer')

function cmwGemMaterial(stack, requiredEquipment) {
  if (!stack || stack.empty || stack.id !== 'slag:modular_item') return null

  const modularType = String(stack.get('slag:modular_type')).replace(/^slag:/, '')
  if (requiredEquipment && modularType !== requiredEquipment) return null

  const parts = stack.get('slag:dynamic_parts')
  if (!parts) return null

  for (const part of parts.items()) {
    if (String(part.get('slag:part_type')) === 'createmyway:gem') {
      return String(part.get('slag:material_type'))
    }
  }
  return null
}

function cmwGemEffect(stack, equipment) {
  const gem = cmwGemMaterial(stack, equipment)
  if (!gem || !global.cmwEquipmentRegistry) return null
  const effects = global.cmwEquipmentRegistry.materialEffects[gem] || {}
  const actualEquipment = String(stack.get('slag:modular_type')).replace(/^slag:/, '')
  return effects[actualEquipment] || null
}

BlockEvents.drops(event => {
  const player = event.entity
  if (!(player instanceof $CmwServerPlayer)) return

  const equipment = String(event.tool.get('slag:modular_type')).replace(/^slag:/, '')
  if (!['pickaxe', 'axe', 'shovel', 'hoe'].includes(equipment)) return

  const effect = cmwGemEffect(event.tool)
  if (!effect || !effect.collect_drops) return

  const itemEntities = event.getItemEntities()
  itemEntities.forEach(itemEntity => player.give(itemEntity.item.copy()))
  itemEntities.clear()
})

EntityEvents.drops(event => {
  const attacker = event.source.actual
  if (!(attacker instanceof $CmwServerPlayer)) return

  const effect = cmwGemEffect(attacker.mainHandItem, 'sword')
  if (!effect || !effect.collect_drops) return

  event.drops.forEach(itemEntity => attacker.give(itemEntity.item.copy()))
  event.drops.clear()
})

EntityEvents.afterHurt(event => {
  if (event.damage <= 0) return

  const attacker = event.source.actual
  if (!(attacker instanceof $CmwServerPlayer)) return

  const effect = cmwGemEffect(attacker.mainHandItem, 'sword')
  if (!effect) return

  if (effect.status_effect) {
    const status = effect.status_effect
    // Vanilla addEffect refreshes an equal/stronger instance instead of stacking it.
    event.entity.potionEffects.add(status.id, status.duration_ticks, status.amplifier)
  }

  if (effect.fire_seconds) {
    event.entity.setRemainingFireTicks(Math.round(effect.fire_seconds * 20))
  }
})
