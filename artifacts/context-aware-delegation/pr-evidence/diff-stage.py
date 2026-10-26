#!/usr/bin/env python3
"""PR prep read-only stage/active inventory (context-aware-delegation PR).

Full-tree digest comparison excluding node_modules, .git, .agent, artifacts and
.skills-lock.json. Writes artifacts/context-aware-delegation/pr-evidence/prep-diff.json.
No writes to either tree.
"""

import hashlib
import json
import os
import pathlib
import sys

REPO = pathlib.Path(__file__).resolve().parents[3]
EVIDENCE = REPO / "artifacts" / "context-aware-delegation" / "pr-evidence"
SKIP = {".git", ".agent", "node_modules", "artifacts", ".skills-lock.json", ".agents/sdd"}


def sha256(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def walk(root: pathlib.Path) -> dict:
    found = {}
    for dirpath, dirnames, filenames in os.walk(root):
        rel_dir = pathlib.Path(dirpath).relative_to(root).as_posix()
        keep = []
        for name in sorted(dirnames):
            if name in SKIP:
                continue
            # keep canonical .agents/workflows but skip other .agents mirrors
            if name == ".agents" and rel_dir == ".":
                keep.append(name)
                continue
            keep.append(name)
        dirnames[:] = keep
        for name in filenames:
            full = pathlib.Path(dirpath) / name
            if full.is_symlink() or not full.is_file():
                continue
            rel = full.relative_to(root).as_posix()
            found[rel] = sha256(full)
    return found


def main() -> None:
    stage = pathlib.Path(sys.argv[1]).resolve()
    if not str(stage).startswith("/private/tmp/cad-pr-stage.") and not str(stage).startswith(
        "/tmp/cad-pr-stage."
    ):
        print(f"REFUSED: not a verified scratch prefix: {stage}", file=sys.stderr)
        sys.exit(2)
    active = walk(REPO.resolve())
    staged = walk(stage)
    drift = []
    for rel in sorted(set(active) | set(staged)):
        left = active.get(rel)
        right = staged.get(rel)
        if left == right:
            continue
        change = "added" if left is None else "removed" if right is None else "modified"
        drift.append({"path": rel, "active": left, "stage": right, "change": change})
    record = {
        "stage_realpath": str(stage),
        "active_files": len(active),
        "stage_files": len(staged),
        "drift": drift,
        "drift_count": len(drift),
    }
    out = EVIDENCE / "prep-diff.json"
    out.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"drift_count": len(drift), "changed": [d["path"] for d in drift]}, indent=2))


if __name__ == "__main__":
    main()
