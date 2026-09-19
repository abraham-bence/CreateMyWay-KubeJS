"""Structural validation for the generated CreateMyWay equipment system."""
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parent
MATERIALS = ROOT / "data/createmyway/slag/materials"


def fail(message):
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def main():
    profiles = [json.loads(p.read_text(encoding="utf-8-sig")) for p in sorted(MATERIALS.glob("*.json"))]
    ids = [p["id"] for p in profiles]
    if len(ids) != len(set(ids)):
        fail("duplicate material IDs")
    gems = [p for p in profiles if p.get("cmw_role") == "gem"]
    handles = [p for p in profiles if p.get("cmw_role") == "handle"]
    expected_handles = {
        "createmyway:wooden_handle",
        "createmyway:copper_handle", "createmyway:iron_handle",
        "createmyway:rose_gold_handle", "createmyway:diamond_handle",
        "createmyway:obsidian_handle", "createmyway:gold_handle",
        "createmyway:deep_alloy_handle", "createmyway:netherite_handle",
    }
    if len(gems) != 34 or {p["id"] for p in handles} != expected_handles:
        fail(f"expected 34 gems and the nine planned handles, found {len(gems)} and {len(handles)}")

    registry_text = (ROOT / "startup_scripts/generated_cmw_material_registry.js").read_text(encoding="utf-8")
    match = re.search(r"global\.cmwEquipmentRegistry\s*=\s*(\{.*\})\s*$", registry_text, re.S)
    if not match:
        fail("generated registry is not parseable")
    registry = json.loads(match.group(1))
    if set(registry["materialStats"]) != set(ids) or set(registry["materialDescriptions"]) != set(ids):
        fail("generated tooltip metadata does not cover every material")
    if set(registry["partStats"]) != {"gem", "handle"}:
        fail("generated tooltip metadata is missing gem or handle part stats")
    if "gripCoreNames" in registry or "equipmentAssemblyNames" in registry:
        fail("legacy grip-core assembly metadata is still present")

    equipment_types = ("pickaxe", "axe", "shovel", "hoe", "sword")
    gem_counts = {kind: sum(kind in p.get("cmw_equipment", []) for p in gems) for kind in equipment_types}
    expected_counts = {"pickaxe": 19, "axe": 19, "shovel": 19, "hoe": 19, "sword": 34}
    plain_recipe_counts = {
        "pickaxe": 17 * len(handles),
        "axe": 17 * len(handles),
        "shovel": 17 * len(handles),
        "hoe": 17 * len(handles),
        "sword": 17 * 17 * len(handles),
    }
    expected_plain_recipes = {"pickaxe": 153, "axe": 153, "shovel": 153, "hoe": 153, "sword": 2601}
    if gem_counts != expected_counts or plain_recipe_counts != expected_plain_recipes:
        fail("plain equipment or gem compatibility matrix has unexpected dimensions")

    generated_recipes = (ROOT / "server_scripts/generated_cmw_material_recipes.js").read_text(encoding="utf-8")
    if generated_recipes.count(".id(\"createmyway:form_") != 43:
        fail("expected one acquisition/progression recipe per material profile")
    if 'create.cutting(Item.of("slag:dynamic_part[slag:material_type=\\"createmyway:wooden_handle\\"' not in generated_recipes:
        fail("wooden handle is not generated through Create cutting")

    missing_textures = []
    texture_count = 0
    for p in profiles:
        name = p["id"].split(":", 1)[1]
        role = p["cmw_role"]
        style = p.get("texture", "base")
        expected = [ROOT / f"assets/createmyway/textures/item/dynamic_parts/{style}/{role}_{name}.png"]
        expected += [ROOT / f"assets/createmyway/textures/item/modular/{kind}/{style}/{role}_{name}.png" for kind in p.get("cmw_equipment", [])]
        for path in expected:
            texture_count += 1
            if not path.is_file() or not path.read_bytes().startswith(b"\x89PNG\r\n\x1a\n"):
                missing_textures.append(str(path.relative_to(ROOT)))
    if missing_textures:
        fail("missing valid-part textures: " + ", ".join(missing_textures[:5]))
    if texture_count != 198:
        fail(f"expected 198 valid custom-part texture layers, found {texture_count}")

    equipment_script = (ROOT / "server_scripts/modular_equipments.js").read_text(encoding="utf-8")
    if "equipment_grip_core" in equipment_script or "cmw_gem" in equipment_script:
        fail("plain equipment assembly still contains legacy grip-core or gem logic")
    if "'slag:guard'" not in equipment_script or "cmw_guard" not in equipment_script:
        fail("plain sword assembly does not use S&E guards")
    socket_script = (ROOT / "server_scripts/cmw_gem_socketing.js").read_text(encoding="utf-8")
    for marker in ("DeployerRecipeSearchEvent", "create:mechanical_saw", "previous_enchantments", "DYNAMIC_PARTS"):
        if marker not in socket_script:
            fail(f"gem socketing script is missing {marker}")

    sword = json.loads((ROOT / "data/slag/slag/modulars/sword.json").read_text(encoding="utf-8"))
    expected_segments = ["slag:parts/sword_blades", "slag:parts/guards", "createmyway:parts/gems", "createmyway:parts/handles"]
    if sword.get("segments") != expected_segments:
        fail("sword modular segments are not Blade + Guard + optional Gem + Handle")

    required = [
        "server_scripts/cmw_gem_abilities.js",
        "server_scripts/cmw_gem_socketing.js",
        "client_scripts/cmw_part_tooltips.js",
        "startup_scripts/cmw_reach_attributes.js",
        "data/slag/slag/modulars/pickaxe.json",
        "data/slag/slag/modulars/axe.json",
        "data/slag/slag/modulars/shovel.json",
        "data/slag/slag/modulars/hoe.json",
        "data/slag/slag/modulars/sword.json",
    ]
    for relative in required:
        if not (ROOT / relative).is_file():
            fail(f"missing required file: {relative}")

    print("CreateMyWay validation passed")
    print(f"  profiles: 43 (34 gems, 9 handles)")
    print(f"  plain equipment recipes: {sum(plain_recipe_counts.values())}")
    print("    " + ", ".join(f"{count} {kind}s" for kind, count in plain_recipe_counts.items()))
    print("  gem installation: dynamic Create Deployer recipe")
    print("  gem removal: powered Create Mechanical Saw interaction")
    print(f"  valid custom-part texture layers: {texture_count}")


if __name__ == "__main__":
    main()
