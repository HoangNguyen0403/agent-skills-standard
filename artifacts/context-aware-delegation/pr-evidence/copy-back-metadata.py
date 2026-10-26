#!/usr/bin/env python3
"""PR release-prep allowlisted copy-back for skills/metadata.json only.

Guards:
  * source is the verified scratch stage (temp prefix, outside repo),
  * allowlist is exactly `skills/metadata.json`,
  * destination digest must still equal the pre-copy inventory digest,
  * copy is a single file, then re-hashed to equal the staged digest.
Any other stage drift is recorded and never copied.

Writes artifacts/context-aware-delegation/pr-evidence/copy-back-receipt.json.
"""

import hashlib
import json
import pathlib
import shutil
import sys

REPO = pathlib.Path(__file__).resolve().parents[3]
EVIDENCE = REPO / "artifacts" / "context-aware-delegation" / "pr-evidence"
ALLOWLIST = ["skills/metadata.json"]
IGNORED_EXACT = {".git", ".skills-lock.json"}
IGNORED_PREFIXES = (".git/", ".ags/", "node_modules")


def sha256(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    stage = pathlib.Path(sys.argv[1]).resolve()
    if not str(stage).startswith("/private/tmp/cad-pr-stage.") and not str(stage).startswith(
        "/tmp/cad-pr-stage."
    ):
        print(f"REFUSED: not a verified scratch prefix: {stage}", file=sys.stderr)
        sys.exit(2)
    inventory = json.loads((EVIDENCE / "prep-diff.json").read_text(encoding="utf-8"))
    active_hashes = {entry["path"]: entry for entry in inventory["drift"]}
    copied = []
    verified = []
    for rel in ALLOWLIST:
        active = REPO / rel
        staged = stage / rel
        if not staged.is_file() or staged.is_symlink():
            raise SystemExit(f"stage path missing: {rel}")
        if not active.is_file() or active.is_symlink():
            raise SystemExit(f"destination missing: {rel}")
        pre = sha256(active)
        staged_hash = sha256(staged)
        if staged_hash == pre:
            verified.append({"path": rel, "pre": pre, "post": pre, "stage": staged_hash,
                             "state": "already identical (previous run or no delta)"})
            continue
        inventory_entry = active_hashes.get(rel)
        if inventory_entry is None or inventory_entry["active"] != pre:
            raise SystemExit(f"destination changed since stage inventory: {rel}")
        if inventory_entry["stage"] != staged_hash:
            raise SystemExit(f"stage changed since stage inventory: {rel}")
        shutil.copyfile(staged, active)
        post = sha256(active)
        if post != staged_hash:
            raise SystemExit(f"copy verification failed for {rel}: {post} != {staged_hash}")
        copied.append({"path": rel, "pre": pre, "post": post, "stage": staged_hash})

    unowned = [
        entry
        for entry in inventory["drift"]
        if entry["path"] not in ALLOWLIST
        and entry["path"] not in IGNORED_EXACT
        and not entry["path"].startswith(IGNORED_PREFIXES)
    ]
    receipt = {
        "stage_realpath": str(stage),
        "allowlist": ALLOWLIST,
        "copied": copied,
        "already_identical": verified,
        "unowned_drift_not_copied": unowned,
        "ignored_scratch_state": [
            entry["path"]
            for entry in inventory["drift"]
            if entry["path"] not in ALLOWLIST
            and (entry["path"] in IGNORED_EXACT or entry["path"].startswith(IGNORED_PREFIXES))
        ],
    }
    out = EVIDENCE / "copy-back-receipt.json"
    out.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"copied": copied, "unowned_not_copied": [e["path"] for e in unowned]}, indent=2))
    if unowned:
        sys.exit(3)


if __name__ == "__main__":
    main()
