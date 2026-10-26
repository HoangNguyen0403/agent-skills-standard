#!/usr/bin/env python3
"""Task4 correction run2: regenerate host category indices with complete inventory.

Root cause being tested (from source, not assumption):
  scripts/generate-indices.ts:323 runs `applyIndices` before `beginInstall`
  (line 395) and `writeSkills` (line 451). With the two mirror packages absent,
  that pass wrote host `common/_INDEX.md` without their rows. The
  `completeInstall(refreshIndices)` pass (line 459) recomputes complete content,
  but `OwnershipWriter.write` (cli/src/services/install/OwnershipWriter.ts:79-117)
  classifies against `opts.previous` (the dispatch-time lockfile, empty here)
  and never against its own `next` record, so the differing existing index is
  `unknown` and is not overwritten.

Correction sequence: keep every mirror package present, delete only the four
host `common/_INDEX.md` files in the scratch stage, then run the generators.
The pre-pass then sees the complete package inventory.

Guards: scratch realpath prefix, stage outside the active checkout, exact
cleanup targets only, generators with cwd=stage via `rtk proxy`, semantic
assertions over all installed common skill IDs plus the two target rows.
"""

import hashlib
import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import time

REPO = pathlib.Path(__file__).resolve().parents[3]
EVIDENCE = REPO / "artifacts" / "context-aware-delegation" / "final-evidence"
OUT = EVIDENCE / "correction-run2"
HOSTS = [".agents", ".github", ".codex", ".claude"]
CLEANUP = [f"{host}/skills/common/_INDEX.md" for host in HOSTS]
TARGETS = ["common-subagent-driven-development", "common-task-complexity-routing"]
TERMS = ["model routing", "llm model selection", "thinking level", "reasoning effort"]
RSYNC_EXCLUDES = [
    ".agent",
    ".git",
    "node_modules",
    "artifacts",
    ".skills-lock.json",
    ".agents/sdd",
    ".claude/worktrees",
]


def sha256(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def canonical_common_ids() -> list:
    base = REPO / "skills" / "common"
    return sorted(
        p.name for p in base.iterdir() if p.is_dir() and (p / "SKILL.md").is_file()
    )


def index_rows(text: str) -> dict:
    rows = {}
    for line in text.splitlines():
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if not cells or cells[0] in {"Skill", ""} or set(cells[0]) <= {"-", " "}:
            continue
        skill = cells[0].strip("*")
        if not skill or skill.startswith("Skill"):
            continue
        rows[skill] = cells[1:]
    return rows


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    expected_ids = canonical_common_ids()
    active_before = {
        host: index_rows((REPO / host / "skills" / "common" / "_INDEX.md").read_text(encoding="utf-8"))
        for host in HOSTS
    }

    stage = pathlib.Path(tempfile.mkdtemp(prefix="cad-task4-correction.", dir="/tmp")).resolve()
    if not str(stage).startswith("/private/tmp/cad-task4-correction.") and not str(
        stage
    ).startswith("/tmp/cad-task4-correction."):
        raise SystemExit(f"REFUSED: unexpected stage prefix {stage}")
    repo_real = REPO.resolve()
    if stage == repo_real or repo_real in stage.parents:
        raise SystemExit("REFUSED: stage resolves inside the active checkout")

    rsync = shutil.which("rsync") or raise_(SystemExit("rsync not found"))
    command = [rsync, "-a"]
    for pattern in RSYNC_EXCLUDES:
        command += [f"--exclude={pattern}"]
    command += [f"{repo_real}/", f"{stage}/"]
    subprocess.run(command, check=True)

    for relative in ["node_modules", "cli/node_modules", "mcp/node_modules"]:
        link = stage / relative
        link.parent.mkdir(parents=True, exist_ok=True)
        if not link.exists():
            link.symlink_to(repo_real / relative)

    # Packages must be present before the bootstrap index pass.
    present = {
        host: sorted(
            p.name
            for p in (stage / host / "skills" / "common").iterdir()
            if p.is_dir() and (p / "SKILL.md").is_file()
        )
        for host in HOSTS
    }
    inventory_gaps = {host: sorted(set(expected_ids) - set(present[host])) for host in HOSTS}
    if any(inventory_gaps.values()):
        raise SystemExit(f"REFUSED: staged mirror inventory incomplete: {inventory_gaps}")

    removed = []
    for relative in CLEANUP:
        target = (stage / relative).resolve()
        if stage not in target.parents:
            raise SystemExit(f"REFUSED: cleanup target escapes stage: {relative}")
        if target.exists():
            target.unlink()
            removed.append(relative)

    rtk = shutil.which("rtk")
    node = shutil.which("node") or raise_(SystemExit("node not found"))
    runs = []
    for name, script, log_name in [
        ("generate-indices", "scripts/generate-indices.ts", "run2-generate-indices.log"),
        (
            "generate-capabilities",
            "scripts/generate-capabilities-doc.ts",
            "run2-generate-capabilities.log",
        ),
    ]:
        argv = (["rtk", "proxy", "node", "--import", "tsx"] if rtk else [node, "--import", "tsx"]) + [script]
        started = time.strftime("%Y-%m-%dT%H:%M:%S%z")
        proc = subprocess.run(argv, cwd=stage, capture_output=True, text=True)
        finished = time.strftime("%Y-%m-%dT%H:%M:%S%z")
        (OUT / log_name).write_text(
            f"$ (cd {stage} && {' '.join(argv)})\nstarted: {started}\nfinished: {finished}\n"
            f"exit: {proc.returncode}\n\n--- stdout ---\n{proc.stdout}\n--- stderr ---\n{proc.stderr}\n",
            encoding="utf-8",
        )
        runs.append(
            {
                "name": name,
                "command": argv,
                "cwd": str(stage),
                "started": started,
                "finished": finished,
                "exit": proc.returncode,
                "log": str((OUT / log_name).relative_to(REPO)),
            }
        )

    checks = []
    for host in HOSTS:
        staged_text = (stage / host / "skills" / "common" / "_INDEX.md").read_text(encoding="utf-8")
        rows = index_rows(staged_text)
        missing = sorted(set(expected_ids) - set(rows))
        extra = sorted(set(rows) - set(expected_ids))
        row = rows.get("common-task-complexity-routing", [])
        row_text = " | ".join(row).lower()
        checks.append(
            {
                "host": host,
                "row_count": len(rows),
                "missing_ids": missing,
                "unexpected_ids": extra,
                "target_ids_present": all(target in rows for target in TARGETS),
                "discovery_terms_present": {term: term in row_text for term in TERMS},
                "before_row_count": len(active_before[host]),
                "before_missing_ids": sorted(set(expected_ids) - set(active_before[host])),
            }
        )

    canonical_index = index_rows((stage / "skills" / "common" / "_INDEX.md").read_text(encoding="utf-8"))
    canonical_check = {
        "row_count": len(canonical_index),
        "missing_ids": sorted(set(expected_ids) - set(canonical_index)),
        "unexpected_ids": sorted(set(canonical_index) - set(expected_ids)),
        "target_ids_present": all(target in canonical_index for target in TARGETS),
    }

    record = {
        "run": "correction-run2",
        "stage_realpath": str(stage),
        "expected_common_ids": len(expected_ids),
        "cleanup_removed": removed,
        "cleanup_scope": "host common/_INDEX.md only; all mirror packages stayed present",
        "inventory_gaps_before_generation": inventory_gaps,
        "node": subprocess.run([node, "--version"], capture_output=True, text=True).stdout.strip(),
        "rtk_available": bool(rtk),
        "runs": runs,
        "host_checks": checks,
        "canonical_index_check": canonical_check,
        "semantic_proof": {
            "all_hosts_complete": all(
                not c["missing_ids"] and not c["unexpected_ids"] and c["target_ids_present"] for c in checks
            ),
            "all_hosts_have_discovery_terms": all(
                all(c["discovery_terms_present"].values()) for c in checks
            ),
        },
    }
    (OUT / "run2-stage-run.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(record["semantic_proof"], indent=2))
    print(json.dumps({"stage": str(stage), "removed": removed, "exits": [r["exit"] for r in runs]}, indent=2))
    if not (record["semantic_proof"]["all_hosts_complete"] and record["semantic_proof"]["all_hosts_have_discovery_terms"]):
        raise SystemExit("semantic proof failed")
    if any(r["exit"] != 0 for r in runs):
        raise SystemExit("generator failed")
    (OUT / "stage-path.txt").write_text(str(stage) + "\n", encoding="utf-8")


def raise_(exception):
    raise exception


if __name__ == "__main__":
    main()
