// Explain individual part/material trade-offs without cluttering finished tools.
// S&E averages the installed parts and then applies their part modifiers; these
// figures are inputs for comparison, NOT predictions of finished-tool totals.
(function () {
  const $CmwTooltipComponents = Java.loadClass('dev.lopyluna.slag.register.AllDataComponents')
  const $CmwDynamicTypes = Java.loadClass('dev.lopyluna.slag.register.AllDynamicTypes')
  const $CmwResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
  const CMW_UTILITY_TOOLS = ['pickaxe', 'axe', 'shovel', 'hoe']
  const CMW_EQUIPMENT = ['pickaxe', 'axe', 'shovel', 'hoe', 'sword']

  function componentId(stack, component) {
    const value = stack.get(component.get())
    return value ? String(value) : ''
  }

  function title(id) {
    return String(id).split(':').pop().split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  function number(value) {
    // KubeJS Rhino does not consistently expose Number.isFinite. The ES5
    // global isFinite works there and with numeric values from Java objects.
    const numeric = Number(value)
    return isFinite(numeric) ? numeric.toFixed(2).replace(/\.?0+$/, '') : '?'
  }

  function roman(level) {
    return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][level] || String(level)
  }

  function displayName(material) {
    const registry = global.cmwEquipmentRegistry
    if (registry && registry.materialNames && registry.materialNames[material]) {
      return registry.materialNames[material]
    }
    return title(material)
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

  // Describe the effect for the actual equipment instead of expecting players
  // to infer a sword's behavior from an unrelated utility-tool enchantment.
  // Both part comparisons and finished equipment use this same formatter.
  function effectSummary(effect, equipment) {
    if (!effect) return ''
    const descriptions = []
    const enchantments = effect.enchantments || {}
    Object.keys(enchantments).forEach(id => {
      descriptions.push(`Grants ${title(id)} ${roman(enchantments[id])}`)
    })
    if (effect.block_reach) descriptions.push(`While held: +${number(effect.block_reach)} block reach`)
    if (effect.attack_reach) descriptions.push(`While held: +${number(effect.attack_reach)} attack reach`)
    if (effect.collect_drops) descriptions.push(equipment === 'sword'
      ? 'Mob drops from your kills go to your inventory'
      : 'Mined block drops go to your inventory')
    if (effect.status_effect) {
      descriptions.push(`On hit: ${title(effect.status_effect.id)} ${roman(effect.status_effect.amplifier + 1)} for ${number(effect.status_effect.duration_ticks / 20)}s`)
    }
    if (effect.fire_seconds) descriptions.push(`On hit: ignites targets for ${number(effect.fire_seconds)}s`)
    return descriptions.join('; ')
  }

  function addGemEffects(lines, registry, materialId) {
    const effects = (registry.materialEffects || {})[materialId] || {}
    const compatible = (registry.materialEquipment || {})[materialId] || []
    const noAbility = 'No extra ability; contributes material stats only'

    // Render the sword first. Avoid a block-scoped const here: repeated tooltip
    // evaluation has triggered Rhino redeclaration errors in earlier scripts.
    if (compatible.includes('sword')) {
      lines.add(Text.of(`Sword: ${effectSummary(effects.sword, 'sword') || noAbility}`).green())
    }

    const utilities = CMW_UTILITY_TOOLS.filter(kind => compatible.includes(kind))
    const summaries = utilities.map(kind => effectSummary(effects[kind], kind))
    const shared = summaries.length > 0 && summaries.every(summary => summary === summaries[0])
    if (shared) {
      lines.add(Text.of(`Tools (${utilities.map(title).join(' / ')}): ${summaries[0] || noAbility}`).green())
    } else {
      utilities.forEach(kind => {
        lines.add(Text.of(`${title(kind)}: ${effectSummary(effects[kind], kind) || noAbility}`).green())
      })
    }
  }

  function materialStats(materialId, registry) {
    const material = $CmwDynamicTypes.getMaterial($CmwResourceLocation.parse(materialId)).orElse(null)
    if (material) {
      return {
        durability: material.dura,
        miningSpeed: material.speed,
        attackPower: material.sharp,
        miningTier: material.tier,
        enchantability: material.ench,
        fireproof: material.fireProof
      }
    }
    return (registry.materialStats || {})[materialId] || null
  }

  function addPartProperties(lines, partId) {
    const part = $CmwDynamicTypes.getPart($CmwResourceLocation.parse(partId)).orElse(null)
    if (!part) return
    const bonuses = []
    if (part.dura) bonuses.push(`durability +${number(part.dura)}`)
    if (part.speed) bonuses.push(`mining speed +${number(part.speed)}`)
    if (part.sharp) bonuses.push(`attack +${number(part.sharp)}`)
    if (part.tier) bonuses.push(`tier +${number(part.tier)}`)
    if (part.ench) bonuses.push(`enchantability +${number(part.ench)}`)
    if (bonuses.length) lines.add(Text.of(`Part bonuses: ${bonuses.join(', ')}`).gray())

    const multipliers = []
    if (part.duraMod !== 1) multipliers.push(`durability ×${number(part.duraMod)}`)
    if (part.sharpMod !== 1) multipliers.push(`attack ×${number(part.sharpMod)}`)
    if (part.tierMod !== 1) multipliers.push(`tier ×${number(part.tierMod)}`)
    if (part.enchMod !== 1) multipliers.push(`enchantability ×${number(part.enchMod)}`)
    if (part.speedMod !== 1) multipliers.push(`attack speed ×${number(part.speedMod)}`)
    if (multipliers.length) lines.add(Text.of(`Part modifiers: ${multipliers.join(', ')}`).gray())
  }

  ItemEvents.modifyTooltips(event => {
    event.modify('slag:dynamic_part', tooltip => tooltip.dynamic('createmyway:part_comparison'))
    event.modify('slag:modular_item', tooltip => tooltip.dynamic('createmyway:equipment_details'))
  })

  ItemEvents.dynamicTooltips('createmyway:part_comparison', event => {
    const registry = global.cmwEquipmentRegistry
    if (!registry) return
    const materialId = componentId(event.item, $CmwTooltipComponents.MATERIAL_TYPE)
    const partId = componentId(event.item, $CmwTooltipComponents.PART_TYPE)
    if (!materialId || !partId) return
    const stats = materialStats(materialId, registry)
    if (!stats) return
    const gem = partId === 'createmyway:gem' && registry.materialParts[materialId] === partId
    const handle = partId === 'createmyway:handle' && registry.materialParts[materialId] === partId

    event.lines.add(Text.of(`Part comparison: ${title(partId)}`).gold())
    if (gem || handle) {
      const description = (registry.materialDescriptions || {})[materialId]
      if (description) event.lines.add(Text.of(description).gray())
    }
    if (gem) {
      event.lines.add(Text.of(`Quality: ${title(registry.materialTiers[materialId] || 'single')}`).aqua())
      event.lines.add(Text.of(`Compatible with: ${(registry.materialEquipment[materialId] || []).map(title).join(', ')}`).aqua())
      event.lines.add(Text.of('Gem abilities by equipment:').aqua())
      addGemEffects(event.lines, registry, materialId)
    }
    event.lines.add(Text.of('Material values (not final equipment stats):').darkGray())
    event.lines.add(Text.of(`  Durability ${number(stats.durability)}  |  Mining speed ${number(stats.miningSpeed)}`).gray())
    event.lines.add(Text.of(`  Attack power ${number(stats.attackPower)}  |  Mining tier ${number(stats.miningTier)}`).gray())
    event.lines.add(Text.of(`  Enchantability ${number(stats.enchantability)}`).gray())
    if (stats.fireproof) event.lines.add(Text.of('  Fireproof material').red())
    addPartProperties(event.lines, partId)
    event.lines.add(Text.of('Final stats depend on all installed parts and their modifiers.').darkGray())
  })

  // Finished equipment shows only the installed gem and its effect for THIS tool.
  // Never report a different equipment type's ability or repeat part statistics.
  ItemEvents.dynamicTooltips('createmyway:equipment_details', event => {
    const equipment = componentId(event.item, $CmwTooltipComponents.MODULAR_TYPE).replace(/^slag:/, '')
    if (!CMW_EQUIPMENT.includes(equipment)) return
    const parts = event.item.get($CmwTooltipComponents.DYNAMIC_PARTS.get())
    if (!parts) return
    const gemMaterial = gemMaterialFromParts(parts)
    if (!gemMaterial) {
      event.lines.add(Text.of('Gem Socket: Empty').darkGray())
      return
    }

    event.lines.add(Text.of(`Gem Socket: ${displayName(gemMaterial)}`).aqua())
    const registry = global.cmwEquipmentRegistry
    const effects = registry && registry.materialEffects && registry.materialEffects[gemMaterial]
    const bonus = effectSummary(effects && effects[equipment], equipment)
    event.lines.add(Text.of(`Gem Bonus: ${bonus || 'No extra ability; contributes material stats only'}`).green())
  })
})()
