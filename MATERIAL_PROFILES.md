# CreateMyWay material profiles

Each JSON file in `data/createmyway/slag/materials/` is the single source of truth for one custom gem or handle. Run `python create_my_way_material_generator.py` after changing a profile.

## Shared fields

- `id`: a unique `createmyway:` material ID.
- `cmw_role`: `gem` or `handle`.
- `cmw_display_name`: the user-facing part name.
- `cmw_description`: an optional one-line material identity shown in its hover tooltip.
- `cmw_equipment`: a non-empty list containing any supported equipment: `pickaxe`, `axe`, `shovel`, `hoe`, and `sword`.
- The remaining defense, durability, enchantability, sharpness, speed, tier, texture, repair, fluid, and order fields are Slag & Embers material data.

Handles normally require `molten_fluid`. The generator creates a 45 mB Create: Metallurgy table-casting recipe using the graphite rod mold. A profile may instead use `"cmw_handle_process": "pressing"` or `"cutting"`; Deep Alloy is pressed and Wooden is cut from `#minecraft:planks`.

## Gem progression

Gem profiles also support:

- `cmw_tier`: `cut`, `refined`, `perfect`, or `single`.
- `cmw_source_ingredient`: an item ID or `#tag` used for cutting and Perfect-tier consumption. If omitted, the repair ingredient is used.
- `cmw_previous`: required for Refined and Perfect profiles; names the preceding material ID.
- `cmw_effects`: equipment-specific effects.

Cut and single gems are cut directly from their source. Refined gems use pressing and cutting in a one-loop Sequenced Assembly. Perfect gems deploy one extra source ingredient, press, and cut the Refined gem.

## Effect schema

Effects are nested under equipment IDs. `pickaxe` is the canonical utility-tool effect: the generator automatically copies it to compatible axes, shovels, and hoes, while `sword` remains independently configurable.

```json
"cmw_effects": {
  "pickaxe": {
    "enchantments": {"minecraft:fortune": 1},
    "block_reach": 0.5,
    "collect_drops": true
  },
  "sword": {
    "enchantments": {"minecraft:looting": 1},
    "attack_reach": 0.25,
    "status_effect": {
      "id": "minecraft:poison",
      "duration_ticks": 60,
      "amplifier": 0
    },
    "fire_seconds": 3
  }
}
```

Only include effects the material grants. `amplifier` is zero-based. Status-gem profiles list only `sword` in `cmw_equipment`, so invalid pickaxes are neither generated nor shown.

## Generated outputs

- `startup_scripts/generated_cmw_material_registry.js`: roles, compatibility, effects, tiers, material names, descriptions, and stats.
- `assets/createmyway/lang/en_us.json`: part translations while preserving unrelated entries.
- `server_scripts/generated_cmw_material_recipes.js`: all acquisition and refinement recipes.

`server_scripts/modular_equipments.js` consumes the registry and automatically generates every plain Head × Handle utility tool and Blade × S&E Guard × Handle sword. There are no material-specific naming or recipe branches.

`server_scripts/cmw_gem_socketing.js` adds compatible gems dynamically through a Create Deployer. Because its output is copied from the actual input stack, damage, custom names, and unrelated components survive the operation. Right-clicking a powered Mechanical Saw with the gemmed tool removes and returns the gem.

`client_scripts/cmw_part_tooltips.js` also consumes the registry. Individual parts show their role, compatible equipment, raw material values, S&E part weighting, traits, and granted effects. Finished modular tools list their installed custom components. Updating the profile and rerunning the generator keeps these tooltips synchronized automatically.

The repository workflow regenerates these outputs when material profiles change. For local testing, regenerate them yourself and restart Minecraft; `/kubejs reload server_scripts` is useful for server recipes, but startup item/material/attribute changes still require a full restart.

## Validation and textures

Run these commands after profile edits:

```text
python create_my_way_material_generator.py
python tools/build_cmw_textures.py
python validate_create_my_way.py
```

`tools/build_cmw_textures.py` creates fallback S&E-aligned pixel layers for every valid custom part. They are intentionally baseline art and can be replaced one-for-one with bespoke PNGs later.
