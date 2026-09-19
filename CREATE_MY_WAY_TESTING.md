# CreateMyWay full-system test pass

Use a **full Minecraft restart** for this release. Startup item registration, modular definitions, and native event listeners are not all covered by `/reload`. Test in a copy of an existing world when checking older equipment.

## 1. Startup and visibility

1. Start the instance and confirm there are no CreateMyWay errors in `logs/kubejs/startup.log`, `logs/kubejs/server.log`, `logs/kubejs/client.log`, or `logs/latest.log`.
2. Confirm all 34 gems and nine handles have readable names and textures. Hover a gem and a handle and check their material descriptions.
3. Confirm the legacy Equipment Grip Core still has no recipe and is hidden from JEI/EMI and the creative tab. The new Sword Guard Core is a **different item** and should remain available through its recipes.
4. Confirm invalid material/part and status-gem/tool combinations remain hidden.

## 2. Parts, plain tools, and two-stage swords

1. Cut any plank with Create to make the Wooden Handle.
2. Spot-check the seven cast handles and the pressed Deep Alloy Handle.
3. Assemble one of each plain utility tool. Each must use Head + Handle and show `Gem Socket: Empty` plus the Deployer instruction when hovered.
4. In JEI, verify that the first sword stage starts with a Handle, deploys an existing S&E Guard, then presses into a uniquely named Sword Guard Core. Expect 17 guards × 9 handles = **153** core recipes.
5. Make two different guards with the **same** handle and two different handles with the **same** guard. Check that each produced core is uniquely named and not mixed up.
6. Start the second sword stage with the exact core, deploy the chosen Blade, and press it into the finished sword. The final item must have Blade + Guard + Handle, no gem, and `Gem Socket: Empty` in its tooltip.
7. Use two different blades on separately produced copies of one core, and verify both recipes select the correct blade. Test different core variants to catch recipe ambiguity.
8. In JEI, confirm 153 plain variants for each utility-tool type and 2601 plain sword variants. The 153 core recipes are additional intermediate recipes, not additional finished swords.

## 3. Deployer gem installation

1. Put a plain finished tool on a belt or depot under a powered Create Deployer facing down.
2. Give the Deployer one compatible gem of the correct S&E dynamic-part variant (e.g., Cut Diamond Gem) and run it once.
3. Confirm precisely one gem is consumed, the tooltip names it, its texture layer appears, and its stats/effect apply.
4. Repeat with a plain sword made from a Guard Core. A sword-only status gem must work on the sword and be rejected by utility tools.
5. A second gem must not be installed while the socket is occupied; an incompatible gem must not change the tool.
6. If it fails, check `logs/kubejs/server.log` and `logs/latest.log` for `cmw_gem_socketing` / `DeployerRecipeSearchEvent` exceptions, and record both tool and gem components.

State-preservation check:

1. Damage a plain tool, rename it, and add a normal enchantment.
2. Install a gem.
3. Confirm damage, name, and the unrelated enchantment are unchanged. Repeat with a different tool/head to ensure results never switch materials or overwrite a different stack.

## 4. Mechanical Saw removal and swapping

1. Hold a gemmed tool and right-click a stopped Create Mechanical Saw. It must refuse removal.
2. Power the saw and right-click it again with the tool.
3. Confirm the socket becomes empty, the exact gem drops out, and the same tool retains damage, name, and unrelated enchantments.
4. Install a different compatible gem with the Deployer.
5. For a gem-granted enchantment, confirm removal restores its prior level. If the player upgraded beyond the granted level after installation, confirm the higher level is preserved.
6. Repeat for a sword, verifying Blade, Guard, and Handle remain unchanged.

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
