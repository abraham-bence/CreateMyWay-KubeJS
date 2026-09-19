"""Build fallback pixel layers for every valid custom gem/handle combination."""
from pathlib import Path
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
MATERIALS = ROOT / "data/createmyway/slag/materials"
ASSETS = ROOT / "assets/createmyway/textures/item"
JAR = next((ROOT.parent / "mods").glob("Slag-n-Embers-1.21.1-*.jar"))


def extract(archive, source, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(archive.read(source))


def main():
    written = 0
    with zipfile.ZipFile(JAR) as archive:
        for file in MATERIALS.glob("*.json"):
            profile = json.loads(file.read_text(encoding="utf-8-sig"))
            name = profile["id"].split(":", 1)[1]
            role = profile["cmw_role"]
            style = profile.get("texture", "base")

            # The guard is a compact, centered part and makes a clear standalone
            # placeholder for a gem. Built handle layers align with finished tools.
            dynamic_source = f"assets/slag/textures/item/dynamic_parts/{style}/guard.png"
            if role == "handle":
                dynamic_source = "assets/slag/textures/item/built/handle/sword.png"
            extract(archive, dynamic_source,
                    ASSETS / "dynamic_parts" / style / f"{role}_{name}.png")
            written += 1

            for equipment in profile.get("cmw_equipment", ["pickaxe", "sword"]):
                if role == "gem":
                    source = f"assets/slag/textures/item/modular/sword/{style}/guard.png"
                else:
                    source = f"assets/slag/textures/item/built/handle/{equipment}.png"
                extract(archive, source,
                        ASSETS / "modular" / equipment / style / f"{role}_{name}.png")
                written += 1
    print(f"Wrote {written} valid custom-part texture layers")


if __name__ == "__main__":
    main()
