#!/usr/bin/env python3
"""
sdd_workspace.py - Resolve and ensure an isolated directory for plan artifacts.
Artifacts: task briefs, implementer reports, review packages, and progress ledger.

Usage: python3 sdd_workspace.py <PLAN_FILE>
Outputs: Absolute path to the plan's isolated SDD directory.
"""

import os
import subprocess
import sys


def get_git_root():
    try:
        res = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            check=True,
        )
        return res.stdout.strip()
    except Exception:
        return os.getcwd()


def resolve_workspace(plan_file):
    if not os.path.isfile(plan_file):
        sys.stderr.write(f"Error: plan file not found: {plan_file}\n")
        sys.exit(2)

    plan_abs = os.path.abspath(plan_file)
    slug = os.path.splitext(os.path.basename(plan_abs))[0]
    if not slug or slug in (".", ".."):
        sys.stderr.write(f"Error: cannot derive valid slug from {plan_file}\n")
        sys.exit(2)

    root = get_git_root()
    base_dir = os.path.join(root, ".agent", "sdd")
    os.makedirs(base_dir, exist_ok=True)

    # Maintain self-ignoring .gitignore
    gitignore_path = os.path.join(base_dir, ".gitignore")
    if not os.path.exists(gitignore_path):
        with open(gitignore_path, "w") as f:
            f.write("*\n")

    plan_dir = os.path.dirname(plan_abs)
    try:
        plan_rel = os.path.relpath(plan_abs, root)
        plan_id = plan_rel if not plan_rel.startswith("..") else plan_abs
    except Exception:
        plan_id = plan_abs

    workspace_dir = os.path.join(base_dir, slug)

    def owns(target_dir):
        marker = os.path.join(target_dir, "plan-path")
        if os.path.exists(marker):
            try:
                with open(marker, "r") as f:
                    return f.read().strip() == plan_id
            except Exception:
                return False
        else:
            os.makedirs(target_dir, exist_ok=True)
            with open(marker, "w") as f:
                f.write(plan_id + "\n")
            return True

    if not owns(workspace_dir):
        parent_name = os.path.basename(plan_dir)
        workspace_dir = os.path.join(base_dir, f"{slug}-{parent_name}")
        if not owns(workspace_dir):
            idx = 2
            while True:
                candidate = os.path.join(base_dir, f"{slug}-{parent_name}-{idx}")
                if owns(candidate):
                    workspace_dir = candidate
                    break
                idx += 1

    return workspace_dir


def main():
    if len(sys.argv) != 2:
        sys.stderr.write("Usage: python3 sdd_workspace.py <PLAN_FILE>\n")
        sys.exit(2)
    workspace = resolve_workspace(sys.argv[1])
    print(workspace)


if __name__ == "__main__":
    main()
