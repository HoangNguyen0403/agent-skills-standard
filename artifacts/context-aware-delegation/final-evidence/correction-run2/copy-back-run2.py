#!/usr/bin/env python3
"""Task4 allowlisted, hash-checked copy-back.

Guards:
  * source must be the verified scratch stage; destination paths must come from
    the assignment packet's Owned paths,
  * active destination digest must still equal the packet digest / pre-copy
    inventory digest recorded by stage-diff.py (no concurrent writer),
  * single-file copy only, then re-hash the destination and require equality
    with the staged digest,
  * identical files are left untouched and reported instead of rewritten.

Writes artifacts/context-aware-delegation/final-evidence/copy-back-receipt.json.
"""

import hashlib
import json
import pathlib
import re
import shutil
import sys

REPO = pathlib.Path(__file__).resolve().parents[3]
EVIDENCE = REPO / "artifacts" / "context-aware-delegation" / "final-evidence"
BRIEF = REPO / ".agent" / "sdd" / "context-aware-delegation" / "task-4-integration-brief.md"
INVENTORY = EVIDENCE / "stage-vs-active.json"
OWNED_DIR = "artifacts/context-aware-delegation/final-evidence"


def sha256(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def allowlist() -> list:
    text = BRIEF.read_text(encoding="utf-8")
    section = text.split("## Owned paths", 1)[1].split("## Acceptance criteria", 1)[0]
    paths = [line.strip()[2:] for line in section.splitlines() if line.strip().startswith("- ")]
    return [p for p in paths if p != OWNED_DIR]


def packet_digests() -> dict:
    text = BRIEF.read_text(encoding="utf-8")
    section = text.split("## Source files", 1)[1].split("## Source revision", 1)[0]
    digests = {}
    for match in re.finditer(r"^- (\S+) \(SHA-256 ([0-9a-f]{64})\)$", section, re.M):
        digests[match.group(1)] = match.group(2)
    return digests


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
    owned = allowlist()
    packet = packet_digests()
    allow_superseded = "--allow-superseded-packet" in sys.argv[3:]
    inventory_path = INVENTORY
    for argument in sys.argv[3:]:
        if argument.startswith("--inventory="):
            inventory_path = EVIDENCE / argument.split("=", 1)[1]
    inventory = json.loads(inventory_path.read_text(encoding="utf-8"))

    copied, identical, skipped = [], [], []
    for rel in owned:
        active = REPO / rel
        staged = stage / rel
        if not staged.exists() or not staged.is_file() or staged.is_symlink():
            skipped.append({"path": rel, "reason": "stage path missing or not a regular file"})
            continue
        if not active.exists() or not active.is_file() or active.is_symlink():
            skipped.append({"path": rel, "reason": "active destination missing or not a regular file"})
            continue
        pre = sha256(active)
        staged_hash = sha256(staged)
        if staged_hash == pre:
            identical.append(rel)
            continue
        expected = packet.get(rel)
        packet_superseded = expected is not None and pre != expected
        if packet_superseded and not allow_superseded:
            skipped.append(
                {"path": rel, "reason": "destination changed since dispatch", "pre": pre, "packet": expected}
            )
            continue
        inventory_active = inventory["owned_detail"].get(rel, {}).get("active")
        if inventory_active is not None and pre != inventory_active:
            skipped.append(
                {"path": rel, "reason": "destination changed since stage inventory", "pre": pre, "inventory": inventory_active}
            )
            continue
        if staged_hash == pre:
            identical.append(rel)
            continue
        before = staged_hash
        shutil.copyfile(staged, active)
        post = sha256(active)
        if post != before:
            raise SystemExit(f"copy verification failed for {rel}: {post} != {before}")
        copied.append(
            {
                "path": rel,
                "pre": pre,
                "post": post,
                "stage": staged_hash,
                "packet_digest": expected,
                "packet_match": expected is None or expected == pre,
                "packet_superseded_by_prior_run": packet_superseded,
            }
        )

    # Canonical source -> mirror byte parity for the two changed skills.
    # Scope: exactly the classes the generator emits (SKILL.md, references/,
    # scripts/, assets/, LICENSE/NOTICE). `evals/` is deliberately not shipped
    # to agent mirrors and is excluded rather than treated as a mismatch.
    def generated(path: pathlib.Path) -> bool:
        rel = path.name
        parts = path.parts
        if "__pycache__" in parts:
            return False
        if rel == "SKILL.md":
            return True
        if re.match(r"^(LICENSE|NOTICE)(?:\.(?:md|txt))?$", rel, re.I):
            return True
        parent = path.parent.name
        return parent in {"references", "scripts", "assets"}

    parity = []
    skills = [
        "common-subagent-driven-development",
        "common-task-complexity-routing",
    ]
    root_license = REPO / "LICENSE"
    for host in [".agents", ".github", ".codex", ".claude"]:
        for skill in skills:
            canonical_dir = REPO / "skills" / "common" / skill
            mirror_dir = REPO / host / "skills" / "common" / skill
            expected = {}
            for path in canonical_dir.rglob("*"):
                if not path.is_file() or not generated(path):
                    continue
                rel = path.relative_to(canonical_dir).as_posix()
                expected[rel] = sha256(path)
            if any(rel.lower().startswith(("license", "notice")) for rel in expected) is False:
                expected["LICENSE"] = sha256(root_license)
            mirror_files = sorted(
                p.relative_to(mirror_dir).as_posix()
                for p in mirror_dir.rglob("*")
                if p.is_file() and "__pycache__" not in p.parts
            )
            mismatches = [
                rel
                for rel in sorted(expected)
                if rel not in mirror_files
                or sha256(mirror_dir / rel) != expected[rel]
            ]
            parity.append(
                {
                    "host": host,
                    "skill": skill,
                    "generated_files": len(expected),
                    "mirror_files": len(mirror_files),
                    "extra_mirror_files": sorted(set(mirror_files) - set(expected)),
                    "mismatches": mismatches,
                    "identical": not mismatches,
                }
            )

    host_indices = [REPO / h / "skills" / "common" / "_INDEX.md" for h in
                    [".agents", ".github", ".codex", ".claude"]]
    host_index_hashes = {str(p.relative_to(REPO)): sha256(p) for p in host_indices}

    receipt = {
        "stage_realpath": str(stage),
        "owned_path_count": len(owned),
        "copied": copied,
        "identical": identical,
        "skipped": skipped,
        "canonical_mirror_parity": parity,
        "host_category_index_hashes": host_index_hashes,
        "host_category_indices_identical": len(set(host_index_hashes.values())) == 1,
    }
    receipt_name = sys.argv[2] if len(sys.argv) > 2 else "copy-back-receipt.json"
    out = EVIDENCE / receipt_name
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "copied": len(copied),
                "identical": len(identical),
                "skipped": len(skipped),
                "parity_all_identical": all(p["identical"] for p in parity),
                "host_category_indices_identical": receipt["host_category_indices_identical"],
                "receipt": str(out.relative_to(REPO)),
            },
            indent=2,
        )
    )
    if skipped:
        print(json.dumps(skipped, indent=2), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
