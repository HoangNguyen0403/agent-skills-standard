#!/usr/bin/env python3
"""
review_package.py - Generate a self-contained review package containing:
- Commit log list
- Stat summary
- Net diff with extended context (-U10)
Written to a standalone file so the reviewer reads it in one call without
polluting the orchestrator context.

Usage: python3 review_package.py <PLAN_FILE> <BASE_SHA> <HEAD_SHA> [OUTFILE]
"""

import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sdd_workspace import resolve_workspace


def run_git(args, check=True):
    res = subprocess.run(
        ["git"] + args,
        capture_output=True,
        text=True,
        check=check,
    )
    return res.stdout


def generate_package(plan_file, base, head, outfile=None):
    if not os.path.isfile(plan_file):
        sys.stderr.write(f"Error: plan file not found: {plan_file}\n")
        sys.exit(2)

    # Validate BASE and HEAD
    try:
        run_git(["rev-parse", "--verify", "--quiet", base])
    except Exception:
        sys.stderr.write(f"Error: bad BASE ref: {base}\n")
        sys.exit(2)

    try:
        run_git(["rev-parse", "--verify", "--quiet", head])
    except Exception:
        sys.stderr.write(f"Error: bad HEAD ref: {head}\n")
        sys.exit(2)

    # Validate ancestor
    try:
        subprocess.run(
            ["git", "merge-base", "--is-ancestor", base, head],
            check=True,
            capture_output=True,
        )
    except subprocess.CalledProcessError:
        sys.stderr.write(f"Error: HEAD ({head}) is not a descendant of BASE ({base})\n")
        sys.exit(3)

    rev_count = run_git(["rev-list", "--count", f"{base}..{head}"]).strip()
    if int(rev_count) == 0:
        sys.stderr.write(f"Error: empty commit range: {base}..{head}\n")
        sys.exit(3)

    base7 = run_git(["rev-parse", "--short", base]).strip()
    head7 = run_git(["rev-parse", "--short", head]).strip()

    if not outfile:
        workspace = resolve_workspace(plan_file)
        outfile = os.path.join(workspace, f"review-{base7}..{head7}.diff")

    commits_log = run_git(["log", "--oneline", f"{base}..{head}"])
    diff_stat = run_git(["diff", "--stat", f"{base}..{head}"])
    full_diff = run_git(["diff", "-U10", f"{base}..{head}"])

    os.makedirs(os.path.dirname(os.path.abspath(outfile)), exist_ok=True)
    with open(outfile, "w", encoding="utf-8") as f:
        f.write(f"# Review package: {base}..{head}\n\n")
        f.write("## Commits\n")
        f.write(commits_log + "\n\n")
        f.write("## Files changed\n")
        f.write(diff_stat + "\n\n")
        f.write("## Diff\n")
        f.write(full_diff + "\n")

    byte_size = os.path.getsize(outfile)
    print(f"wrote {outfile}: {rev_count} commit(s), {byte_size} bytes")
    return outfile


def main():
    if len(sys.argv) < 4 or len(sys.argv) > 5:
        sys.stderr.write("Usage: python3 review_package.py <PLAN_FILE> <BASE_SHA> <HEAD_SHA> [OUTFILE]\n")
        sys.exit(2)

    plan_file = sys.argv[1]
    base = sys.argv[2]
    head = sys.argv[3]
    outfile = sys.argv[4] if len(sys.argv) == 5 else None
    generate_package(plan_file, base, head, outfile)


if __name__ == "__main__":
    main()
