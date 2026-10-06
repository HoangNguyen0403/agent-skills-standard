#!/usr/bin/env python3
"""Generate a review package from a commit range or an owned workspace scope."""

import argparse
import hashlib
import os
import re
import stat
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sdd_workspace import resolve_workspace


class GitCommandError(RuntimeError):
    """A Git command failed while collecting review evidence."""

def run_git(args, allowed=(0,), env=None):
    result = subprocess.run(["git", *args], capture_output=True, env=env)
    if result.returncode not in allowed:
        detail = result.stderr.decode(errors="replace").strip()
        raise GitCommandError(f"git {' '.join(args)} failed ({result.returncode}): {detail}")
    return result.stdout


def decode_path(raw_path):
    return os.fsdecode(raw_path)


def validate_scope(paths):
    if not paths:
        raise ValueError("workspace mode requires explicit owned --paths")
    normalized = []
    for path in paths:
        candidate = path.replace("\\", "/")
        if (not candidate or candidate.startswith("/") or re.match(r"^[A-Za-z]:", candidate) or
                any(part in ("", ".", "..") for part in candidate.rstrip("/").split("/")) or
                any(char in candidate for char in "*?[]") or candidate.startswith(":")):
            raise ValueError(f"invalid or ambiguous owned path: {path!r}")
        normalized.append(candidate.rstrip("/"))
    if len(set(normalized)) != len(normalized):
        raise ValueError("duplicate owned paths are ambiguous")
    for path in normalized:
        if any(other != path and other.startswith(path + "/") for other in normalized):
            raise ValueError(f"overlapping owned paths are ambiguous: {path!r}")
    return sorted(normalized)


def in_scope(path, scopes):
    return any(path == scope or path.startswith(scope + "/") for scope in scopes)


def validate_commit(ref, label):
    try:
        return run_git(["rev-parse", "--verify", "--quiet", f"{ref}^{{commit}}"]).decode().strip()
    except GitCommandError as error:
        raise ValueError(f"bad {label} commit ref {ref!r}: {error}") from error


def collect_workspace_diff(base, scopes):
    with tempfile.TemporaryDirectory(prefix="ags-review-index-") as index_dir:
        index_env = os.environ.copy()
        index_env["GIT_INDEX_FILE"] = os.path.join(index_dir, "index")

        run_git(["read-tree", base], env=index_env)
        current_tracked_paths = [
            decode_path(path)
            for path in run_git(
                ["ls-files", "--cached", "-z", "--", *scopes]
            ).split(b"\0")
            if path and in_scope(decode_path(path), scopes)
        ]
        # BASE seeding loses files added to the caller's index after BASE.
        tracked_worktree_paths = []
        # Force only present file leaves; forcing a directory imports ignored neighbors.
        for path in current_tracked_paths:
            try:
                mode = os.lstat(path).st_mode
            except (FileNotFoundError, NotADirectoryError):
                continue
            if stat.S_ISREG(mode) or stat.S_ISLNK(mode):
                tracked_worktree_paths.append(f":(literal){path}")
        if tracked_worktree_paths:
            run_git(
                ["add", "-f", "--", *tracked_worktree_paths],
                env=index_env,
            )

        run_git(["add", "-A", "--", *scopes], env=index_env)
        changed_paths = [
            decode_path(item)
            for item in run_git(
                ["diff", "--cached", "--name-only", "-z", base, "--", *scopes],
                env=index_env,
            ).split(b"\0")
            if item
        ]
        if not changed_paths:
            raise LookupError("no changes found in workspace within owned scope")

        path_args = ["--", *scopes]
        stat_output = run_git(
            ["diff", "--cached", "--stat", base, *path_args], env=index_env
        ).decode(errors="surrogateescape").strip()
        diff = run_git(
            ["diff", "--cached", "-U10", base, *path_args], env=index_env
        ).decode(errors="surrogateescape").strip()
        return stat_output, diff, sorted(changed_paths)

def write_exclusive(outfile, contents):
    directory = os.path.dirname(os.path.abspath(outfile))
    os.makedirs(directory, exist_ok=True)
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", errors="surrogateescape", dir=directory, delete=False) as stream:
            temporary_path = stream.name
            stream.write(contents)
        os.link(temporary_path, outfile)
    except FileExistsError as error:
        raise FileExistsError(f"refusing to overwrite existing review package: {outfile}") from error
    finally:
        if temporary_path and os.path.exists(temporary_path):
            os.unlink(temporary_path)


def generate_package(plan_file, base, head="WORKSPACE", outfile=None, paths=None):
    if not os.path.isfile(plan_file):
        sys.stderr.write(f"Error: plan file not found: {plan_file}\n")
        raise SystemExit(2)
    if not base:
        sys.stderr.write("Error: missing base ref\n")
        raise SystemExit(2)

    try:
        base_commit = validate_commit(base, "BASE")
        is_workspace = head is None or head.upper() in ("WORKSPACE", "WORKING_TREE", "INDEX")
        base7 = run_git(["rev-parse", "--short", base_commit]).decode().strip()
        workspace_dir = resolve_workspace(plan_file)

        if is_workspace:
            scopes = validate_scope(paths)
            diff_stat, full_diff, changed_paths = collect_workspace_diff(base_commit, scopes)
            scope_text = "\n".join(f"- {path}" for path in scopes)
            package = (f"# Review package: {base}..WORKSPACE (cumulative uncommitted snapshot)\n\n"
                       f"## Scope\n{scope_text}\n\n## Files changed\n{diff_stat}\n\n## Diff\n{full_diff}\n")
            if not outfile:
                scope_digest = hashlib.sha256("\0".join(scopes).encode()).hexdigest()[:12]
                snapshot_digest = hashlib.sha256(package.encode("utf-8", errors="surrogateescape")).hexdigest()[:12]
                outfile = os.path.join(workspace_dir, f"review-{base7}-workspace-{scope_digest}-{snapshot_digest}.diff")
            write_exclusive(outfile, package)
            print(f"wrote {outfile}: cumulative workspace snapshot ({len(changed_paths)} changed file(s)), {os.path.getsize(outfile)} bytes")
            return outfile

        head_commit = validate_commit(head, "HEAD")
        try:
            run_git(["merge-base", "--is-ancestor", base_commit, head_commit])
        except GitCommandError as error:
            raise ValueError(f"HEAD ({head}) is not a descendant of BASE ({base})") from error
        rev_count = int(run_git(["rev-list", "--count", f"{base_commit}..{head_commit}"]).decode().strip())
        if rev_count == 0:
            raise LookupError(f"empty commit range: {base}..{head}")
        head7 = run_git(["rev-parse", "--short", head_commit]).decode().strip()
        scoped_args = ["--", *paths] if paths else []
        commits = run_git(["log", "--oneline", f"{base_commit}..{head_commit}", *scoped_args]).decode(errors="surrogateescape")
        diff_stat = run_git(["diff", "--stat", f"{base_commit}..{head_commit}", *scoped_args]).decode(errors="surrogateescape")
        full_diff = run_git(["diff", "-U10", f"{base_commit}..{head_commit}", *scoped_args]).decode(errors="surrogateescape")
        if not outfile:
            outfile = os.path.join(workspace_dir, f"review-{base7}..{head7}.diff")
        package = f"# Review package: {base}..{head}\n\n## Commits\n{commits}\n## Files changed\n{diff_stat}\n## Diff\n{full_diff}"
        write_exclusive(outfile, package)
        print(f"wrote {outfile}: {rev_count} commit(s), {os.path.getsize(outfile)} bytes")
        return outfile
    except (ValueError, LookupError, FileNotFoundError, GitCommandError, FileExistsError) as error:
        sys.stderr.write(f"Error: {error}\n")
        raise SystemExit(2 if isinstance(error, ValueError) else 3) from error


def main():
    parser = argparse.ArgumentParser(description="Generate a review package from a scoped workspace diff or committed ref range.")
    parser.add_argument("plan_file", help="Path to the plan file")
    parser.add_argument("base", nargs="?", default=None, help="Base commit ref")
    parser.add_argument("head", nargs="?", default=None, help="Head commit ref or WORKSPACE")
    parser.add_argument("outfile", nargs="?", default=None, help="Output package path")
    parser.add_argument("--base", dest="flag_base", help="Base commit ref")
    parser.add_argument("--head", dest="flag_head", default=None, help="Head commit ref or WORKSPACE")
    parser.add_argument("--paths", nargs="+", default=None, help="Explicit owned paths for workspace mode")
    parser.add_argument("--outfile", dest="flag_outfile", help="Output package path")
    args = parser.parse_args()
    base = args.flag_base or args.base
    if not base:
        parser.error("missing base ref")
    generate_package(args.plan_file, base, args.flag_head or args.head or "WORKSPACE", args.flag_outfile or args.outfile, args.paths)


if __name__ == "__main__":
    main()
