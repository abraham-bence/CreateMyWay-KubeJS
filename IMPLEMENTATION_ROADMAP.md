# CreateMyWay modular equipment roadmap

This roadmap is the implementation contract for the current full-system pass. The goal is a profile-driven system that can be tested as one package after every phase is complete.

## Design rules

- Material JSON files are the single source of truth for role, equipment compatibility, tier, acquisition, names, enchantments, reach, drop collection, and status effects.
- The Python generator validates profiles and writes runtime registries, language entries, and acquisition/refinement recipes.
- Abilities react only to relevant events. No player-tick or inventory-scan handlers are allowed.
- Existing material IDs remain stable. `createmyway:amethyst_gem` is treated as Cut Amethyst to avoid invalidating existing items.
- Plain Pickaxe/Axe/Shovel/Hoe recipes are Head + Handle. Plain swords are Blade + S&E Guard + Handle.
- Gems are optional upgrades installed later with a Create Deployer and removed with a powered Create Mechanical Saw.
- Status gems are sword-only; utility gems support pickaxes, axes, shovels, hoes, and swords.
- Balance values in this pass are a coherent first baseline, not a claim of final balance.

## Tier effects

| Family | Cut | Refined | Perfect |
| --- | --- | --- | --- |
| Emerald | Fortune I / Looting I | Fortune II / Looting II | Fortune III / Looting III |
| Diamond | Unbreaking I | Unbreaking II | Unbreaking III |
| Quartz | Efficiency II / Sharpness I | Efficiency IV / Sharpness III | Efficiency V / Sharpness V |
| Amethyst | Silk Touch / Sweeping Edge I | Silk Touch + Efficiency II / Sweeping Edge II | Silk Touch + Efficiency IV / Sweeping Edge III |
| Lapis | +5 enchantability | +10 enchantability | +15 enchantability |
| Rose Quartz | +0.5 block / +0.25 attack reach | +1.0 / +0.5 | +1.5 / +0.75 |

Echo Shard has one tier and collects only block or mob drops produced by the action that triggered it.

Sword status tiers refresh rather than stack:

- Venom: Poison I/II/III for 3/5/7 seconds.
- Frost: Slowness I/II/III for 3/5/7 seconds.
- Ember: 3/5/7 seconds of fire.
- Wither: Wither I/II/III for 3/5/7 seconds.
- Dulling: Weakness I/II/III for 3/5/7 seconds.

## Manufacturing progression

- Cut or single-tier gems: Create cutting from the profile's source ingredient.
- Refined gems: one-loop Sequenced Assembly from the Cut gem using cutting and pressing.
- Perfect gems: one-loop Sequenced Assembly from the Refined gem, consuming one additional source ingredient, then pressing and cutting.
- Handles: Create: Metallurgy table casting with 45 mB of the profile's molten fluid and a graphite rod mold. Deep Alloy uses Create pressing; Wooden uses Create cutting from any plank.
- Utility equipment: deploy a Handle onto an S&E Head, then press once.
- Swords: deploy an existing S&E Guard and a Handle onto an S&E Blade, then press once.
- Gem installation: put a plain finished tool on a belt/depot and use a Deployer holding a compatible gem.
- Gem removal: hold the gemmed tool and right-click a powered Create Mechanical Saw. The exact gem is returned.
- Installing or removing a gem preserves durability, custom names, unrelated components, and player enchantments. Gem-granted enchantments are restored safely when removed.

## Execution checklist

- [x] Establish a generated material-role registry and shared creative/JEI filtering.
- [x] Generate combination names automatically from material profiles (the old grip-core stage was later retired).
- [x] Prove profile-driven enchantment application with Cut and Refined Diamond.
- [x] Upgrade the profile schema and generator for equipment compatibility, tier progression, and all ability types.
- [x] Add Perfect Diamond and all Emerald, Quartz, Amethyst, Lapis, Rose Quartz, Echo, and status-gem profiles.
- [x] Generate Cut → Refined → Perfect Create processing recipes.
- [x] Add Obsidian and Diamond handles with casting recipes.
- [x] Expand the first sword implementation, then migrate it to the final Blade + Guard + Handle socket design.
- [x] Add event-driven status and Echo abilities.
- [x] Add reach modifiers compatible with Better Combat.
- [x] Repair incomplete-item and valid custom-part visuals.
- [x] Add automated structural validation and verify generated recipe counts.
- [x] Produce the final in-game test matrix and handoff notes.
- [x] Add the ninth, Wooden Handle through Create cutting.
- [x] Replace grip cores with plain Head + Handle utility-tool assembly.
- [x] Replace sword assembly with Blade + existing S&E Guard + Handle.
- [x] Add dynamic Create Deployer gem installation for every compatible tool/gem pair.
- [x] Add powered Create Mechanical Saw gem removal and state preservation.

## Deferred until playtesting data exists

- Fine balance tuning after real mining/combat comparisons.
- S&E's `3.99` mining-tier display rounding, unless it proves functionally different from tier 4.
- Bespoke final art beyond eliminating missing textures and making parts visually distinguishable.
