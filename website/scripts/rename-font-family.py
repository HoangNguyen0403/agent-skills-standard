from __future__ import annotations

import sys
from pathlib import Path

from fontTools.ttLib import TTFont


def rename_font(font_path: Path, family_name: str) -> None:
    font = TTFont(font_path)
    name_table = font["name"]
    subfamily_name = name_table.getDebugName(2) or name_table.getDebugName(17) or "Regular"
    postscript_family = family_name.replace(" ", "")
    replacements = {
        1: family_name,
        4: f"{family_name} {subfamily_name}",
        6: f"{postscript_family}-{subfamily_name.replace(' ', '')}",
        16: family_name,
        21: family_name,
    }

    for record in name_table.names:
        replacement = replacements.get(record.nameID)
        if replacement is not None:
            record.string = replacement.encode(record.getEncoding())
    font.recalcTimestamp = False

    font.save(font_path)
    verified_font = TTFont(font_path)
    verified_families = {
        verified_font["name"].getDebugName(name_id)
        for name_id in (1, 16, 21)
        if verified_font["name"].getDebugName(name_id)
    }
    if verified_families != {family_name}:
        raise ValueError(f"Font name table did not retain the safe family name: {verified_families}")
    print(f"Verified modified font family metadata: {family_name}")


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: rename-font-family.py FONT_FILE SAFE_FAMILY_NAME")

    font_path = Path(sys.argv[1])
    family_name = sys.argv[2]
    if not font_path.is_file() or not family_name.strip():
        raise SystemExit("A font file and non-empty safe family name are required.")

    rename_font(font_path, family_name)


if __name__ == "__main__":
    main()
