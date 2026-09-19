# CreateMyWay material profiles

Add **one JSON file** in `data/createmyway/slag/materials/` for each new handle or gem profile. Keep the S&E material definitions separate; do not edit the creative-tab or JEI filters for each material.

## ID conventions

- `createmyway:<name>_handle` pairs with part `createmyway:handle`.
- `createmyway:<name>_gem` pairs with part `createmyway:gem`.

The shared filter in `startup_scripts/main.js` recognizes these suffixes; `client_scripts/slag_jei_visibility.js` reuses it. Combinations with the wrong part type are hidden from creative and JEI, without unregistering the base S&E items. Profiles using a different naming convention require updating the shared filter and generator.

## Example: iron handle

See `data/createmyway/slag/materials/iron_handle.json` for a working example. Specify an `id`, S&E material stats, `repair_ingredient`, and `molten_fluid` as appropriate. S&E reads the JSON during game startup.

## Automatic names and recipes

When a material JSON is committed to **main**, `.github/workflows/sync-material-profiles.yml` runs `create_my_way_material_generator.py` and, if anything changed, commits both generated outputs back to `main`:

- `assets/createmyway/lang/en_us.json` — names like `Iron Handle` (not `Iron Handle Handle`). Existing unrelated translations are preserved.
- `server_scripts/generated_cmw_material_recipes.js` — starter acquisition recipes.

The generator makes a graphite-rod-mold casting recipe (45 mB of the profile's molten fluid) for handles and a cutting recipe using `repair_ingredient` for gems. These are **starter recipes**, not the planned Cut/Refined/Perfect gem progression. Opt a special profile out of the starter recipe by adding `"generate_acquisition_recipe": false` to its JSON. The existing amethyst gem already opts out. Add its progression recipe separately when ready.

The workflow requires GitHub Actions to be enabled and permission to push generated commits to `main`. If the action is blocked by repository settings or branch protection, run the generator locally and commit its two outputs yourself.

For immediate local testing, run `py create_my_way_material_generator.py` (or `python create_my_way_material_generator.py`) from the KubeJS folder, then restart Minecraft. GitHub's automated commit does **not** change your local game files: pull/sync the repository to your instance first.

## Adding your next profile

1. Create the new `*_handle.json` or `*_gem.json` material file.
2. Commit/push it to `main`, and let the **Sync material profiles** action finish.
3. Pull/sync the updated KubeJS files and restart Minecraft.
4. Verify the valid part and its name in creative/JEI; check that wrong material/part combinations stay hidden.

No extra whitelist branches or manually added translation/recipe lines are necessary for suffix-conforming profiles. The actual equipment assembly recipe, new gem powers, bespoke models, and new processing tiers remain separate development work.
