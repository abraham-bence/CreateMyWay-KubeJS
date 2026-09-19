// Data-driven tooltips for CreateMyWay components and finished equipment.
(function () {
  function number(value) {
    const numeric = Number(value)
    return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
  }

  function title(id) {
    const path = String(id).split(':').pop()
    return path.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  function roman(level) {
    return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][level] || String(level)
  }

  function effectSummary(effect) {
    const lines = []
    if (!effect) return lines

    const enchantments = effect.enchantments || {}
    Object.keys(enchantments).forEach(id => {
      lines.push(`${title(id)} ${roman(enchantments[id])}`)
    })
    if (effect.block_reach) lines.push(`+${number(effect.block_reach)} Block Reach`)
    if (effect.attack_reach) lines.push(`+${number(effect.attack_reach)} Attack Reach`)
    if (effect.collect_drops) lines.push('Collects action drops directly')
    if (effect.status_effect) {
      const status = effect.status_effect
      lines.push(`${title(status.id)} ${roman(status.amplifier + 1)} for ${number(status.duration_ticks / 20)}s`)
    }
    if (effect.fire_seconds) lines.push(`Ignites targets for ${number(effect.fire_seconds)}s`)
    return lines
  }

  function addEffectLines(lines, registry, material) {
    const effects = registry.materialEffects[material] || {}
    const tools = ['pickaxe', 'axe', 'shovel', 'hoe']
    const toolSummaries = tools
      .filter(equipment => effects[equipment])
      .map(equipment => effectSummary(effects[equipment]).join(', '))
    const uniqueToolSummaries = Array.from(new Set(toolSummaries)).filter(Boolean)

    if (uniqueToolSummaries.length === 1) {
      lines.add(Text.of(`Tools: ${uniqueToolSummaries[0]}`).green())
    } else {
      tools.forEach(equipment => {
        const summary = effectSummary(effects[equipment])
        if (summary.length) lines.add(Text.of(`${title(equipment)}: ${summary.join(', ')}`).green())
      })
    }

    const swordSummary = effectSummary(effects.sword)
    if (swordSummary.length) {
      lines.add(Text.of(`Sword: ${swordSummary.join(', ')}`).green())
    }
  }

  ItemEvents.dynamicTooltips('slag:dynamic_part', event => {
    const registry = global.cmwEquipmentRegistry
    if (!registry) return

    const stack = event.item
    const material = String(stack.get('slag:material_type'))
    const partId = String(stack.get('slag:part_type'))
    if (registry.materialParts[material] !== partId) return

    const stats = registry.materialStats[material]
    if (!stats) return

    const role = stats.role
    const part = registry.partStats[role] || {}
    const equipment = (registry.materialEquipment[material] || []).map(title).join(', ')

    event.lines.add(Text.of(`CreateMyWay ${title(role)} Component`).gold())
    event.lines.add(Text.of(registry.materialDescriptions[material]).gray())
    event.lines.add(Text.of(`Used in: ${equipment}`).darkGray())
    event.lines.add(Text.of('Material values averaged into the finished tool:').aqua())
    event.lines.add(Text.of(`  Durability: ${number(stats.durability)}  |  Mining Speed: ${number(stats.miningSpeed)}`).gray())
    event.lines.add(Text.of(`  Attack Power: ${number(stats.attackPower)}  |  Enchantability: ${number(stats.enchantability)}`).gray())

    if (stats.miningTier) {
      event.lines.add(Text.of(`  Mining Tier: ${number(stats.miningTier)}`).gray())
    }
    if (stats.fireproof) {
      event.lines.add(Text.of('Trait: Fireproof').red())
    }

    event.lines.add(Text.of(
      `Part weighting: Durability ×${number(part.durability_modifier || 1)}, ` +
      `Tier ×${number(part.tier_modifier || 1)}, ` +
      `Enchantability ×${number(part.enchantability_modifier || 1)}`
    ).darkGray())
    addEffectLines(event.lines, registry, material)
  })

  ItemEvents.dynamicTooltips('slag:modular_item', event => {
    const registry = global.cmwEquipmentRegistry
    const parts = event.item.get('slag:dynamic_parts')
    if (!registry || !parts) return

    let hasCustomPart = false
    let gemMaterial = null
    const structuralParts = []
    for (const part of parts.items()) {
      const material = String(part.get('slag:material_type'))
      const partId = String(part.get('slag:part_type'))
      if (registry.materialNames[material]) hasCustomPart = true
      if (partId === 'createmyway:gem') gemMaterial = material
      if (partId === 'createmyway:handle') {
        structuralParts.push(['Handle', registry.materialNames[material] || title(material)])
      } else if (partId === 'slag:guard') {
        structuralParts.push(['Guard', title(material)])
      } else if (partId === 'slag:sword_blade') {
        structuralParts.push(['Blade', title(material)])
      } else if (partId.endsWith('_head')) {
        structuralParts.push(['Head', title(material)])
      }
    }
    if (!hasCustomPart) return

    event.lines.add(Text.of('CreateMyWay Components').gold())
    structuralParts.forEach(entry => {
      event.lines.add(Text.of(`  ${entry[0]}: ${entry[1]}`).gray())
    })
    if (gemMaterial) {
      event.lines.add(Text.of(`  Gem Socket: ${registry.materialNames[gemMaterial] || title(gemMaterial)}`).aqua())
      addEffectLines(event.lines, registry, gemMaterial)
    } else {
      event.lines.add(Text.of('  Gem Socket: Empty').darkGray())
      event.lines.add(Text.of('  Install: use a Create Deployer').darkGray())
    }
    event.lines.add(Text.of('  Remove gem: right-click a powered Create Mechanical Saw').darkGray())
  })
})()
