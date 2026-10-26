#!/usr/bin/env python3
"""PR release-preparation generator runner (context-aware-delegation PR).

Guards:
  * scratch stage must resolve under the system temp prefix and outside the repo,
  * rsync excludes .agent, .git, node_modules, artifacts, .skills-lock.json,
    .agents/sdd and .claude/worktrees,
  * the complete mirror inventory is copied in; nothing is deleted before the
    index bootstrap,
  * generators run with cwd=stage through `rtk proxy`, full logs and exit codes.

Writes only under artifacts/context-aware-delegation/pr-evidence/.
"""

import hashlib
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile
import time

REPO = pathlib.Path(__file__).resolve().parents[3]
EVIDENCE = REPO / "artifacts" / "context-aware-delegation" / "pr-evidence"
EXCLUDES = [
    ".agent",
    ".git",
    "node_modules",
    "artifacts",
    ".skills-lock.json",
    ".agents/sdd",
    ".claude/worktrees",
]


def main() -> None:
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    stage = pathlib.Path(tempfile.mkdtemp(prefix="cad-pr-stage.", dir="/tmp")).resolve()
    if str(stage).startswith(str(REPO.resolve())):
        raise SystemExit("REFUSED: stage inside repository")
    rsync = shutil.which("rsync") or raise_(SystemExit("rsync missing"))
    command = [rsync, "-a"] + [f"--exclude={pattern}" for pattern in EXCLUDES] + [
        f"{REPO.resolve()}/",
        f"{stage}/",
    ]
    subprocess.run(command, check=True)
    for relative in ["node_modules", "cli/node_modules", "mcp/node_modules"]:
        link = stage / relative
        link.parent.mkdir(parents=True, exist_ok=True)
        if not link.exists():
            link.symlink_to(REPO.resolve() / relative)

    rtk = shutil.which("rtk")
    node = shutil.which("node") or raise_(SystemExit("node missing"))
    runs = []
    for name, script, log_name in [
        ("generate-indices", "scripts/generate-indices.ts", "generate-indices.log"),
        ("calculate-tokens", "scripts/calculate-tokens.ts", "calculate-tokens.log"),
    ]:
        argv = (["rtk", "proxy", "node", "--import", "tsx"] if rtk else [node, "--import", "tsx"]) + [script]
        started = time.strftime("%Y-%m-%dT%H:%M:%S%z")
        proc = subprocess.run(argv, cwd=stage, capture_output=True, text=True)
        finished = time.strftime("%Y-%m-%dT%H:%M:%S%z")
        (EVIDENCE / log_name).write_text(
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
                "stdout_lines": len(proc.stdout.splitlines()),
                "stderr_lines": len(proc.stderr.splitlines()),
                "log": str((EVIDENCE / log_name).relative_to(REPO)),
            }
        )
    record = {
        "stage_realpath": str(stage),
        "active_realpath": str(REPO.resolve()),
        "node": subprocess.run([node, "--version"], capture_output=True, text=True).stdout.strip(),
        "rtk_available": bool(rtk),
        "runs": runs,
    }
    (EVIDENCE / "prep-run.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    (EVIDENCE / "stage-path.txt").write_text(str(stage) + "\n", encoding="utf-8")
    print(json.dumps(record, indent=2))
    if any(run["exit"] != 0 for run in runs):
        sys.exit(1)


def raise_(exception):
    raise exception


if __name__ == "__main__":
    main()
