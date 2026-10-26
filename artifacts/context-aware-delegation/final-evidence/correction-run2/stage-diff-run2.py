#!/usr/bin/env python3
"""Task4 read-only stage/active inventory.

Compares the isolated generation stage against the active checkout:
  * per-path digest for the packet allowlist,
  * a full-tree drift inventory for reporting only (never a copy source).

Writes artifacts/context-aware-delegation/final-evidence/stage-vs-active.json.
Performs no writes to either tree.
"""

import hashlib
import json
import os
import pathlib
import sys

REPO = pathlib.Path(__file__).resolve().parents[3]
EVIDENCE = REPO / "artifacts" / "context-aware-delegation" / "final-evidence"
BRIEF = REPO / ".agent" / "sdd" / "context-aware-delegation" / "task-4-integration-brief.md"
OWNED_DIR = "artifacts/context-aware-delegation/final-evidence"

SKIP_DIRS = {".git", ".agent", "node_modules", "artifacts", ".skills-lock.json"}


def sha256(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def is_file(path: pathlib.Path) -> bool:
    return path.exists() and path.is_file() and not path.is_symlink()


def allowlist() -> list:
    text = BRIEF.read_text(encoding="utf-8")
    section = text.split("## Owned paths", 1)[1].split("## Acceptance criteria", 1)[0]
    paths = [line.strip()[2:] for line in section.splitlines() if line.strip().startswith("- ")]
    return [p for p in paths if p != OWNED_DIR]


def walk(root: pathlib.Path) -> dict:
    found = {}
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS)
        for name in filenames:
            full = pathlib.Path(dirpath) / name
            if full.is_symlink() or not full.is_file():
                continue
            found[str(full.relative_to(root))] = sha256(full)
    return found


def main() -> None:
    stage = pathlib.Path(sys.argv[1]).resolve()
    if not any(
        str(stage).startswith(prefix)
        for prefix in (
            "/private/tmp/cad-task4-stage.",
            "/tmp/cad-task4-stage.",
            "/private/tmp/cad-task4-correction.",
            "/tmp/cad-task4-correction.",
        )
    ):
        print(f"REFUSED: not a verified scratch prefix: {stage}", file=sys.stderr)
        sys.exit(2)
    paths = allowlist()
    owned = {}
    for rel in paths:
        active = REPO / rel
        staged = stage / rel
        owned[rel] = {
            "active": sha256(active) if is_file(active) else None,
            "stage": sha256(staged) if is_file(staged) else None,
        }

    stage_all = walk(stage)
    active_all = walk(REPO)
    drift = []
    for rel in sorted(set(stage_all) | set(active_all)):
        if rel in owned:
            continue
        left = active_all.get(rel)
        right = stage_all.get(rel)
        if left != right:
            drift.append(
                {
                    "path": rel,
                    "active": left,
                    "stage": right,
                    "change": "added" if left is None else "removed" if right is None else "modified",
                }
            )

    record = {
        "stage_realpath": str(stage),
        "owned_path_count": len(paths),
        "owned_identical": sorted(r for r, v in owned.items() if v["active"] == v["stage"]),
        "owned_changed": sorted(r for r, v in owned.items() if v["active"] != v["stage"]),
        "owned_detail": owned,
        "unowned_drift": drift,
        "unowned_drift_count": len(drift),
    }
    out_name = sys.argv[2] if len(sys.argv) > 2 else "stage-vs-active.json"
    out = EVIDENCE / out_name
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "owned_total": len(paths),
                "owned_identical": len(record["owned_identical"]),
                "owned_changed": len(record["owned_changed"]),
                "unowned_drift_count": len(drift),
                "report": str(out.relative_to(REPO)),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
