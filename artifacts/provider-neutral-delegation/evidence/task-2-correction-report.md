# Task 2 correction report — resolver containment

Status: implementation and regression cases added; verification not executed in this worker turn per assignment instruction.

## Changed files

- `skills/common/common-subagent-driven-development/scripts/sdd_workspace.py`
  - Added optional `authorized_root` argument to `resolve_workspace`; default remains `None`, preserving existing callers.
  - When provided, realpath containment is checked before creating `.agent/sdd`, creating `.gitignore`, creating candidate directories, opening `plan-path` for read, or writing a new marker. Symlink escapes at primary, fallback, numbered candidates, and marker paths terminate with exit 2 before the outside marker is read or written.
- `skills/common/common-subagent-driven-development/scripts/task_brief.py`
  - Passes validated `assignment["root_real"]` into the resolver. Existing post-resolve and final packet-path containment checks remain.
- `scripts/skill-tests/common-subagent-driven-development/test_task_brief.py`
  - Added regressions for primary, fallback, and numbered candidate-directory symlink escapes; an external `plan-path` marker symlink; and the legacy no-`authorized_root` CLI caller.

## Acceptance mapping

| Acceptance | Evidence added |
| --- | --- |
| Resolver rejects escaped candidate paths before marker operations | `resolve_workspace(..., authorized_root=...)` checks canonical containment before each relevant filesystem operation. |
| Task packet helper constrains resolver writes to the assigned root | `task_brief.py` supplies `assignment["root_real"]`; existing later containment checks are retained. |
| Symlink escape regressions cover every resolver candidate class and marker | Four tests assert exit 2 and no external marker write (marker-symlink test also asserts external content unchanged). |
| Existing callers retain the old unbounded API behavior | Optional argument defaults to `None`; added CLI regression checks successful resolution without it. |

## Verification

No tests, builds, linters, or formatters were run, as directed for this worker turn. Intended parent-run focused command: `rtk proxy python3 scripts/skill-tests/common-subagent-driven-development/test_task_brief.py`.

## Context limitation

The immutable review-package path supplied in the handoff (`immutablepackage review-a2228857-workspace-9086dbbdb0ff-3c29c9b2fbe7.diff`) was not accessible as a workspace path. The finding and required behavior were grounded in `.agent/sdd/provider-neutral-delegation/task-2-report.md` and the current resolver/helper source.
