"""Generate CreateMyWay runtime data, names, and Create recipes from material profiles."""

from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parent
MATERIALS = ROOT / "data/createmyway/slag/materials"
REGISTRY = ROOT / "startup_scripts/generated_cmw_material_registry.js"
LANG = ROOT / "assets/createmyway/lang/en_us.json"
RECIPES = ROOT / "server_scripts/generated_cmw_material_recipes.js"

ROLES = {"handle": "createmyway:handle", "gem": "createmyway:gem"}
TOOL_EQUIPMENT = {"pickaxe", "axe", "shovel", "hoe"}
EQUIPMENT = TOOL_EQUIPMENT | {"sword"}
TIERS = {"cut", "refined", "perfect", "single"}
FLUID_ALIASES = {"slag:molten_iron": "createmetallurgy:molten_iron"}
RESOURCE_ID = re.compile(r"^[a-z0-9_.-]+:[a-z0-9_./-]+$")


def js(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def resource_id(value, label):
    if not isinstance(value, str) or not RESOURCE_ID.fullmatch(value):
        raise ValueError(f"{label}: invalid resource ID {value!r}")
    return value


def acquisition_input(material, file):
    explicit = material.get("cmw_source_ingredient")
    if explicit is not None:
        if not isinstance(explicit, str) or not explicit:
            raise ValueError(f"{file.name}: cmw_source_ingredient must be a string")
        value = explicit
    else:
        repair = material.get("repair_ingredient", {})
        if "tag" in repair:
            value = "#" + repair["tag"]
        elif "item" in repair:
            value = repair["item"]
        else:
            raise ValueError(f"{file.name}: missing acquisition ingredient")
    resource_id(value[1:] if value.startswith("#") else value, file.name)
    return value


def get_profile(material, file):
    material_id = resource_id(material.get("id"), file.name)
    namespace, name = material_id.split(":", 1)
    if namespace != "createmyway":
        raise ValueError(f"{file.name}: material id must use createmyway namespace")
    role = material.get("cmw_role")
    if role not in ROLES:
        raise ValueError(f"{file.name}: cmw_role must be gem or handle")
    return material_id, name, role, ROLES[role]


def display_name(material, name, role):
    value = material.get("cmw_display_name")
    if value is not None:
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"{material['id']}: cmw_display_name must be non-empty")
        return value.strip()
    suffix = "_" + role
    base = name[:-len(suffix)] if name.endswith(suffix) else name
    return " ".join(word.capitalize() for word in base.split("_")) + " " + role.capitalize()


def profile_equipment(material, file, role):
    value = material.get("cmw_equipment", sorted(EQUIPMENT) if role == "gem" else sorted(EQUIPMENT))
    if not isinstance(value, list) or not value:
        raise ValueError(f"{file.name}: cmw_equipment must be a non-empty list")
    result = []
    for equipment in value:
        if equipment not in EQUIPMENT:
            raise ValueError(f"{file.name}: unsupported equipment {equipment!r}")
        if equipment not in result:
            result.append(equipment)
    return result


def profile_tier(material, file, role):
    if role == "handle":
        return "single"
    value = material.get("cmw_tier", "single")
    if value not in TIERS:
        raise ValueError(f"{file.name}: cmw_tier must be cut, refined, perfect, or single")
    return value


def enchantments(value, label):
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ValueError(f"{label}: enchantments must be an object")
    result = {}
    for key, level in value.items():
        resource_id(key, label)
        if isinstance(level, bool) or not isinstance(level, int) or level < 1:
            raise ValueError(f"{label}: enchantment levels must be positive integers")
        result[key] = level
    return result


def positive_number(value, label):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or value <= 0:
        raise ValueError(f"{label}: must be a positive number")
    return value


def profile_effects(material, file, equipment):
    raw = material.get("cmw_effects")
    legacy = material.get("cmw_enchantments")
    if raw is None:
        raw = {kind: {"enchantments": legacy} for kind in equipment} if legacy else {}
    if not isinstance(raw, dict):
        raise ValueError(f"{file.name}: cmw_effects must be an object")
    result = {}
    for kind, effect in raw.items():
        if kind not in EQUIPMENT or kind not in equipment:
            raise ValueError(f"{file.name}: effects configured for unsupported {kind!r}")
        if not isinstance(effect, dict):
            raise ValueError(f"{file.name}: {kind} effect must be an object")
        allowed = {"enchantments", "block_reach", "attack_reach", "collect_drops", "status_effect", "fire_seconds"}
        unknown = set(effect) - allowed
        if unknown:
            raise ValueError(f"{file.name}: unknown effect keys: {sorted(unknown)}")
        clean = {}
        ench = enchantments(effect.get("enchantments"), file.name)
        if ench:
            clean["enchantments"] = ench
        for key in ("block_reach", "attack_reach", "fire_seconds"):
            if key in effect:
                clean[key] = positive_number(effect[key], f"{file.name}.{key}")
        if "collect_drops" in effect:
            if effect["collect_drops"] is not True:
                raise ValueError(f"{file.name}: collect_drops must be true")
            clean["collect_drops"] = True
        if "status_effect" in effect:
            status = effect["status_effect"]
            if not isinstance(status, dict) or set(status) != {"id", "duration_ticks", "amplifier"}:
                raise ValueError(f"{file.name}: status_effect requires id, duration_ticks, amplifier")
            resource_id(status["id"], file.name)
            if not isinstance(status["duration_ticks"], int) or status["duration_ticks"] <= 0:
                raise ValueError(f"{file.name}: duration_ticks must be positive")
            if not isinstance(status["amplifier"], int) or status["amplifier"] < 0:
                raise ValueError(f"{file.name}: amplifier must be zero or greater")
            clean["status_effect"] = status
        result[kind] = clean
    # Pickaxe effects are the shared utility-tool effect definition. Expand
    # them explicitly so runtime scripts remain simple and data-driven.
    if "pickaxe" in result:
        for kind in TOOL_EQUIPMENT:
            if kind in equipment and kind not in result:
                result[kind] = json.loads(json.dumps(result["pickaxe"]))
    return result


def dynamic_part(material_id, part_id):
    return f'slag:dynamic_part[slag:material_type="{material_id}",slag:part_type="{part_id}"]'


def handle_recipe(material, material_id, name, part_id, file):
    process = material.get("cmw_handle_process", "casting")
    if process in {"pressing", "cutting"}:
        source = acquisition_input(material, file)
        item = dynamic_part(material_id, part_id)
        recipe_type = "pressing" if process == "pressing" else "cutting"
        return [
            f"  event.recipes.create.{recipe_type}(Item.of({js(item)}), Ingredient.of({js(source)}))",
            f"    .id({js('createmyway:form_' + name)})",
            "",
        ]
    if process != "casting":
        raise ValueError(f"{material_id}: cmw_handle_process must be casting, pressing, or cutting")
    fluid = material.get("molten_fluid")
    if not fluid:
        raise ValueError(f"{material_id}: handle requires molten_fluid")
    fluid = FLUID_ALIASES.get(fluid, fluid)
    resource_id(fluid, material_id)
    item = dynamic_part(material_id, part_id)
    return [
        f"  event.recipes.createmetallurgy.casting_in_table(Item.of({js(item)}), [Fluid.of({js(fluid)}, 45), 'createmetallurgy:graphite_rod_mold'])",
        f"    .processingTime(30).id({js('createmyway:form_' + name)})",
        "",
    ]


def gem_recipe(material, material_id, name, part_id, tier, file):
    source = acquisition_input(material, file)
    output = dynamic_part(material_id, part_id)
    recipe_id = "createmyway:form_" + name
    if tier in {"cut", "single"}:
        return [
            f"  event.recipes.create.cutting(Item.of({js(output)}), Ingredient.of({js(source)}))",
            f"    .id({js(recipe_id)})",
            "",
        ]
    previous = resource_id(material.get("cmw_previous"), file.name)
    previous_part = dynamic_part(previous, part_id)
    incomplete_id = "kubejs:incomplete_refined_gem" if tier == "refined" else "kubejs:incomplete_perfect_gem"
    incomplete = f'{incomplete_id}[minecraft:custom_data={{cmw_result:"{material_id}"}}]'
    steps = [
        f"      event.recipes.create.pressing({js(incomplete)}, {js(incomplete)}),",
        f"      event.recipes.create.cutting({js(incomplete)}, {js(incomplete)})",
    ]
    if tier == "perfect":
        steps = [
            f"      event.recipes.create.deploying({js(incomplete)}, [{js(incomplete)}, Ingredient.of({js(source)})]),",
            f"      event.recipes.create.pressing({js(incomplete)}, {js(incomplete)}),",
            f"      event.recipes.create.cutting({js(incomplete)}, {js(incomplete)})",
        ]
    return [
        f"  event.recipes.create.sequenced_assembly([Item.of({js(output)})], Ingredient.of({js(previous_part)}), [",
        *steps,
        "    ])",
        f"    .transitionalItem(Item.of({js(incomplete)}).withCustomName({js('Incomplete ' + display_name(material, name, 'gem'))}))",
        f"    .loops(1).id({js(recipe_id)})",
        "",
    ]


def main():
    translations = json.loads(LANG.read_text(encoding="utf-8-sig")) if LANG.exists() else {}
    if not isinstance(translations, dict):
        raise ValueError("en_us.json must contain an object")
    profiles = []
    seen = set()
    for file in sorted(MATERIALS.glob("*.json")):
        material = json.loads(file.read_text(encoding="utf-8-sig"))
        material_id, name, role, part_id = get_profile(material, file)
        if material_id in seen:
            raise ValueError(f"duplicate material id {material_id}")
        seen.add(material_id)
        equipment = profile_equipment(material, file, role)
        tier = profile_tier(material, file, role)
        effects = profile_effects(material, file, equipment) if role == "gem" else {}
        description = material.get("cmw_description")
        if description is not None and (not isinstance(description, str) or not description.strip()):
            raise ValueError(f"{file.name}: cmw_description must be a non-empty string")
        profiles.append({"file": file, "data": material, "id": material_id, "name": name, "role": role, "part": part_id, "equipment": equipment, "tier": tier, "effects": effects, "display": display_name(material, name, role)})
    for profile in profiles:
        if profile["tier"] in {"refined", "perfect"}:
            previous = profile["data"].get("cmw_previous")
            if previous not in seen:
                raise ValueError(f"{profile['file'].name}: cmw_previous {previous!r} does not exist")

    recipes = ["// AUTO-GENERATED BY create_my_way_material_generator.py", "// Do not edit this file manually.", "", "ServerEvents.recipes(event => {", ""]
    names = {}
    for profile in profiles:
        translations[f"item.createmyway.{profile['name']}_{profile['part'].split(':')[1]}"] = profile["display"]
        names[profile["id"]] = profile["display"]
        if not profile["data"].get("generate_acquisition_recipe", True):
            continue
        if profile["role"] == "handle":
            recipes.extend(handle_recipe(profile["data"], profile["id"], profile["name"], profile["part"], profile["file"]))
        else:
            recipes.extend(gem_recipe(profile["data"], profile["id"], profile["name"], profile["part"], profile["tier"], profile["file"]))
    recipes.append("})")

    gems = [p for p in profiles if p["role"] == "gem"]
    handles = [p for p in profiles if p["role"] == "handle"]

    registry_data = {
        "materialParts": {p["id"]: p["part"] for p in profiles},
        "materialEquipment": {p["id"]: p["equipment"] for p in profiles},
        "materialEffects": {p["id"]: p["effects"] for p in gems if p["effects"]},
        "materialTiers": {p["id"]: p["tier"] for p in profiles},
        "materialNames": names,
        "materialDescriptions": {
            p["id"]: p["data"].get(
                "cmw_description",
                "Adds a special ability and tunes the finished tool's stats."
                if p["role"] == "gem"
                else "Shapes the finished tool's handling, speed, and durability."
            )
            for p in profiles
        },
        "materialStats": {
            p["id"]: {
                "role": p["role"],
                "durability": p["data"].get("durability", 0),
                "miningSpeed": p["data"].get("speed", 0),
                "attackPower": p["data"].get("sharpness", 0),
                "enchantability": p["data"].get("enchantability", 0),
                "miningTier": p["data"].get("tier", 0),
                "defense": p["data"].get("defense", 0),
                "toughness": p["data"].get("toughness", 0),
                "knockbackResistance": p["data"].get("knockback_resistance", 0),
                "fireproof": bool(p["data"].get("fireproof", False)),
            }
            for p in profiles
        },
        "partStats": {
            role: json.loads(
                (ROOT / f"data/createmyway/slag/parts/{role}.json").read_text(encoding="utf-8-sig")
            )
            for role in ROLES
        },
        "customPartIds": sorted(set(ROLES.values())),
    }
    registry = ["// AUTO-GENERATED BY create_my_way_material_generator.py", "// Do not edit this file manually.", "", "global.cmwEquipmentRegistry = " + json.dumps(registry_data, ensure_ascii=False, indent=2), ""]
    REGISTRY.write_text("\n".join(registry), encoding="utf-8")
    LANG.write_text(json.dumps(translations, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    RECIPES.write_text("\n".join(recipes) + "\n", encoding="utf-8")
    print(f"CreateMyWay generation complete: {len(profiles)} profiles ({len(gems)} gems, {len(handles)} handles)")


if __name__ == "__main__":
    main()
