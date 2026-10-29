#!/usr/bin/env python3
"""
task_brief.py - Extract one task's full text from an implementation plan into
a standalone task brief file.

Usage: python3 task_brief.py <PLAN_FILE> <TASK_NUMBER> [OUTFILE]
"""

import os
import re
import sys

# Import resolve_workspace from sibling sdd_workspace
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sdd_workspace import resolve_workspace


def extract_task(plan_file, task_number, outfile=None):
    if not os.path.isfile(plan_file):
        sys.stderr.write(f"Error: plan file not found: {plan_file}\n")
        sys.exit(2)

    try:
        t_num = int(task_number)
    except ValueError:
        sys.stderr.write(f"Error: task number must be an integer, got: {task_number}\n")
        sys.exit(2)

    if not outfile:
        workspace = resolve_workspace(plan_file)
        outfile = os.path.join(workspace, f"task-{t_num}-brief.md")

    # Pattern for opening task header
    # Matches: # Task 1, ## Task 1:, ### Task 1 - Title, etc.
    header_regex = re.compile(r"^(#{1,6})\s+Task\s+(\d+)\b", re.IGNORECASE)
    any_task_header = re.compile(r"^(#{1,6})\s+Task\s+\d+\b", re.IGNORECASE)

    extracted_lines = []
    in_target_task = False
    in_fence = False
    target_depth = None

    with open(plan_file, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            stripped = line.strip()
            if stripped.startswith("```"):
                in_fence = not in_fence

            if not in_fence:
                m = header_regex.match(stripped)
                if m:
                    depth = len(m.group(1))
                    curr_num = int(m.group(2))
                    if curr_num == t_num:
                        in_target_task = True
                        target_depth = depth
                        extracted_lines.append(line)
                        continue
                    elif in_target_task:
                        # Reached another task header
                        break
                elif in_target_task:
                    # Check if reached same or higher-level header (e.g. ## Next Section)
                    hdr_match = re.match(r"^(#{1,6})\s+", stripped)
                    if hdr_match:
                        depth = len(hdr_match.group(1))
                        if target_depth is not None and depth <= target_depth:
                            break

            if in_target_task:
                extracted_lines.append(line)

    if not extracted_lines:
        sys.stderr.write(
            f"Error: task {t_num} not found in {plan_file} (no heading matching 'Task {t_num}')\n"
        )
        sys.exit(3)

    os.makedirs(os.path.dirname(os.path.abspath(outfile)), exist_ok=True)
    with open(outfile, "w", encoding="utf-8") as out:
        out.writelines(extracted_lines)

    line_count = len(extracted_lines)
    print(f"wrote {outfile}: {line_count} lines")
    return outfile


def main():
    if len(sys.argv) < 3 or len(sys.argv) > 4:
        sys.stderr.write("Usage: python3 task_brief.py <PLAN_FILE> <TASK_NUMBER> [OUTFILE]\n")
        sys.exit(2)

    plan_file = sys.argv[1]
    task_num = sys.argv[2]
    outfile = sys.argv[3] if len(sys.argv) == 4 else None
    extract_task(plan_file, task_num, outfile)


if __name__ == "__main__":
    main()
