# Task 2 report — complete immutable assignment packets

Status: handed off. Orchestrator observed all 24 packet regressions GREEN. One remaining MAJOR review finding (resolver candidate/marker symlink can still write outside `workspace_root` before the post-resolve check) is reassigned to Personal · Delivery agent `ee6e3723-1b01-4625-8b21-a39699b3346b`, which now owns `sdd_workspace.py`, `task_brief.py` and the packet tests. This session made no further source/test edits and ran no checks after that handoff.

Retained work from this session (kept as-is for the new owner):
- single raw-buffer reads for plan and dependency evidence (digest + decode/parse from one buffer), receipt-revision comparison preserved;
- limits validation (explicit `unavailable`/`advisory` status or concrete positive numeric limit);
- OSError → exit 2 mapping with collision exit 3 and temp cleanup;
- preflight of the resolver's `.agent/sdd` root and ancestor realpaths, owned-path symlink containment (outside and == root rejected), and the associated regressions.

No tests, builds, linters or formatters were run in the handoff turn.

Owner: packet/helper owner (Task 2). Workspace: `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/flawless-mule`.

## Changed files

- `skills/common/common-subagent-driven-development/scripts/task_brief.py` — D2 packet helper (681 lines).
- `scripts/skill-tests/common-subagent-driven-development/test_task_brief.py` — 24 behavioral regressions.
- Untouched: `sdd_workspace.py`, `review_package.py`, `sdd_progress.py` APIs, mirrors, root changelog, unrelated tests/docs.

## Verification command (parent runs; not executed here)

```
rtk proxy python3 scripts/skill-tests/common-subagent-driven-development/test_task_brief.py
```

Existing lanes that must stay intact: `rtk proxy python3 scripts/skill-tests/common-subagent-driven-development/test_review_package.py`, `rtk proxy python3 scripts/skill-tests/test_sdd_progress.py`.

## Review findings addressed

1. **Default output containment before resolver mutation.** `preflight_artifact_root()` reproduces the resolver's candidate root (`<git-root-from-CWD>/.agent/sdd` via the existing, non-mutating `get_git_root()`), resolves it with ancestor symlinks (`realpath`), and refuses preparation (exit 2) when it is not inside the declared `workspace_root` — *before* `resolve_workspace()` can create `.agent/sdd` or ownership markers. The returned workspace dir is containment-checked again, and the final output path is checked with `ensure_output_within()` for both default and explicit paths.
   - Tests: `test_default_output_outside_declared_workspace_refused` (declared root is a subproject of the Git root; asserts no `.agent` created), `test_default_artifact_root_symlink_escape_refused` (`.agent` symlinked outside; asserts no escaped `sdd`/`.md`), `test_default_artifact_root_different_invocation_cwd_refused` (helper run from a foreign CWD; asserts no `.agent` created there).

2. **Owned-path symlink containment.** `validate_owned_path()` now realpath-resolves every entry: rejected when the resolved target is outside `workspace_root` *or equal to it* (directory symlink back to the root disguised as a bounded path). New paths with contained existing ancestors remain valid.
   - Tests: `test_owned_directory_symlink_back_to_root_refused_and_new_paths_allowed` (rejects `linked` -> root; accepts `newdir/new.py` and `src/generated.py`).

3. **Single-read identity.** Plan bytes and dependency evidence are each read once as raw bytes; the digest and the decode/parse consume the same buffer (`sha256_bytes` + `read_bytes`, `parse_receipt(raw, ...)`). Source files are hashed from one read. Producer-revision comparison still reads `revision` from the receipt content and compares it to `required_revision`.
   - Behavioral surface: `test_non_utf8_plan_rejected`, `test_non_utf8_dependency_receipt_rejected` (undecodable buffers rejected with exit 2, no packet). Note: the same-buffer property itself is a code-level race fix; a deterministic TOCTOU test would require a read seam or a blocking FIFO, so none was added rather than asserting internal read choreography.

4. **Limits validation.** `limits` must either declare a recognized authorization status (`unavailable`/`advisory`) or contain at least one concrete positive numeric resource/attempt limit. `{note: ...}` alone is rejected; no new authorization semantics are invented.
   - Test: `test_limits_require_concrete_declaration_or_status`.

5. **I/O failures are prerequisite errors.** Read/hash/write/publish failures (`read_bytes`, existing-output read, `os.makedirs`, temp write, `os.link`) map to exit 2; content collision remains exit 3; temp files are always cleaned up (unlink errors ignored after the primary failure).
   - Tests: `test_unwritable_output_parent_reports_prerequisite` (output parent is a regular file), `test_unreadable_source_file_reports_prerequisite` (non-root POSIX permission boundary, skipped as root), plus the non-UTF-8 cases.

## Other retained behavior

Mandatory `--assignment`; schema v1 with all D2 fields; empty/missing authority never permission; plan digest, source digests and dependency digests verified; traversal/symlink/remote/binary evidence refused; duplicate or absent task headings → exit 3; unrelated tasks/preamble excluded; fenced pseudo-headings ignored (backtick and tilde); content-addressed immutable default packets with identical reuse and explicit-collision preservation (exit 3); success prints path/lines/digest; Git index untouched.

## Residual risks / limits

- Preflight covers the resolver's `.agent/sdd` root and existing ancestor symlinks; a symlinked `<sdd>/<slug>` created between preflight and resolver return could still receive a `plan-path` marker before the post-resolve containment check fails the packet (no packet/authority file is published; marker is not authorization). Closing that would require changing `resolve_workspace`, which is explicitly out of scope.
- `os.link` publication keeps the `review_package.py` filesystem assumption.
- `required_approvals` may be an explicit empty list; `allowed_operations`/`forbidden_actions` must be nonempty.
- `verification.cwd` containment is enforced, existence is not (explicit working directory, not a runtime execution claim).
- No passing/ failing evidence observed in this session; parent runs the command above.
