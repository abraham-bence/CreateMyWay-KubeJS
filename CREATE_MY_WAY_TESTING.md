# CreateMyWay full-system test pass

Use a **full Minecraft restart** for this release. Startup material data, modular definitions, the Wooden Handle, and native event listeners are not all covered by `/reload`.

## 1. Startup and visibility

1. Start the instance and confirm there are no CreateMyWay errors in `logs/kubejs/startup.log`, `logs/kubejs/server.log`, or `logs/latest.log`.
2. Confirm all 34 gems and nine handles have readable names and textures.
3. Confirm the old Equipment Grip Core has no recipe and is hidden from JEI/EMI and the creative tab.
4. Confirm invalid material/part and status-gem/tool combinations remain hidden.

## 2. Parts and plain equipment

1. Cut any plank with Create to make the Wooden Handle.
2. Spot-check the seven cast handles and the pressed Deep Alloy Handle.
3. Assemble one of each plain utility tool. Each must use Head + Handle and show `Gem Socket: Empty`.
4. Assemble several swords. Each must use Blade + S&E Guard + Handle and show all three parts plus an empty socket.
5. In JEI, confirm 153 plain variants for each utility-tool type and 2601 plain sword variants are available through generated combinations.

## 3. Deployer gem installation

1. Put a plain finished tool on a belt or depot under a Create Deployer.
2. Give the Deployer a compatible gem and run it once.
3. Confirm one gem is consumed, the tooltip names it, its texture layer appears, and its stats/effect apply.
4. Confirm a sword-only status gem is rejected by utility tools.
5. Confirm a second gem cannot be installed while the socket is occupied.

State-preservation check:

1. Damage a plain tool, rename it, and add a normal enchantment.
2. Install a gem.
3. Confirm damage, name, and the unrelated enchantment are unchanged.

## 4. Mechanical Saw removal and swapping

1. Hold a gemmed tool and right-click a stopped Create Mechanical Saw. It must refuse removal.
2. Power the saw and right-click it again with the tool.
3. Confirm the socket becomes empty, the exact gem drops out, and the same tool retains damage, name, and unrelated enchantments.
4. Install a different compatible gem with the Deployer.
5. For a gem-granted enchantment, confirm removal restores its prior level. If the player upgraded beyond the granted level after installation, confirm the higher level is preserved.

## 5. Gem effects

Check representative utility and sword effects:

- Emerald: Fortune I/II/III or Looting I/II/III.
- Diamond: Unbreaking I/II/III.
- Quartz: Efficiency II/IV/V or Sharpness I/III/V.
- Amethyst: Silk Touch plus Efficiency, or Sweeping Edge.
- Rose Quartz: held block/attack reach.
- Echo: action drops go directly to the player.
- Venom/Frost/Wither/Dulling: I/II/III for 3/5/7 seconds.
- Ember: target burns for 3/5/7 seconds.

After removing each test gem, confirm its runtime effect stops immediately.

## 6. Regression checks

- Mixed-material armor recipes still complete.
- Existing `createmyway:amethyst_gem` items remain valid and display as Cut Amethyst Gem.
- S&E durability, speed, attack, tier, and model layers reflect the parts actually installed.
- Old already-gemmed tools can have their gem removed; because those legacy stacks lack socket history, unrelated enchantments are left intact.

For a failure, record the exact equipment type, head/blade, guard if present, handle, gem, machine step, and expected/actual result. Include the relevant KubeJS log error and a screenshot of the JEI recipe or tooltip.
