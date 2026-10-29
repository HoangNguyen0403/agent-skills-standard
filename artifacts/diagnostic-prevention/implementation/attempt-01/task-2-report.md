# Task 2 Report: Complete Dispatch and Reconcile Promotion (S02, S04, H01/H02 Guidance)

**Status:** FINAL  
**Execution Mode:** Inline (Approved Bounded Worker, personal agent-skills-standard)  
**Profile Materialized:** `Personal - Cheap`  
**Workspace:** `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/diagnostic-prevention`  
**Branch:** `feat/diagnostic-prevention-improvements`  

---

## 1. Summary of Changes & Owned Write Set

In accordance with Task 2 requirements and the global plan constraints, all modifications were confined to the authorized write set:

1. **`skills/common/common-subagent-driven-development/SKILL.md`**:
   - Reconciled Inline execution as an explicit recorded exception suitable only for genuinely small, low-risk, bounded changes where the human partner explicitly selects it; multi-task plans default to Subagent-Driven.
   - Clarified that vague assent ("yes", "proceed", "start", "approve") binds ONLY the specific choice just presented, never implicitly authorizing inline execution, policy auto-promotion, premium escalation, or scope expansions.
   - Enforced that host/user retry, account, and profile rules override reusable defaults.
   - Added boundaries: denial alternative versus total block (check allowed alternatives before declaring blocked), sibling requests forward-only (siblings cannot approve/deny permissions for each other), and error is not terminal state (provider 429/timeout does not mean write ownership is transferred).
   - Enforced that workspace cleanup requires verified durable archival of all evidence and receipts before deleting scratch directories; never erase the only evidence copy.

2. **`skills/common/common-subagent-driven-development/scripts/task_brief.py`**:
   - Added contract field validation (`validate_task_contract`): validates scope/owned write set, inputs, outputs, real ingress, positive/negative invariants, verification owner, explicit handoff/freeze, and correction route.
   - Rejects extraction and exits non-zero (exit code 5) without creating or writing the output file if required contract fields are missing. Historical plans lacking fields receive a clear error rather than invented authority.
   - Refuses overwrite of existing output files (exit code 4), preserving immutable evidence.
   - Retained public API compatibility: `extract_task(plan_file, task_number, outfile=None, validate_contract=True, allow_overwrite=False)`.

3. **`skills/common/common-subagent-driven-development/references/templates.md`**:
   - Added `## 0. Task Brief Contract Template (for Implementation Plans)` documenting all mandatory contract fields extracted and validated by `task_brief.py`.
   - Updated Implementer Subagent Prompt Template with explicit execution boundaries: denial alternative vs total block, sibling requests forward-only, error is not terminal state, and cross-worktree provenance + inclusive ranges for conversion tasks.

4. **`skills/common/common-subagent-driven-development/references/methodology.md`**:
   - Documented the execution confirmation gate and vague assent boundaries.
   - Added task loop rules for brief validation, conversion handoffs, quality failure vs. quota exhaustion routing, and verified durable archive requirements before workspace cleanup.

5. **`skills/common/common-subagent-driven-development/evals/evals.json`**:
   - Added real-scorer eval cases using standard assertion semantics:
     - Case 4 (`Inline`): Inline is an explicit recorded exception for low-risk changes; multi-task features default to Subagent-Driven.
     - Case 5 (`vague proceed`): Vague assent binds only the presented choice; does not authorize inline execution or premium escalation.
     - Case 6 (`archive failure`): Workspace cleanup blocked until evidence is verifiably archived; never erase the only evidence copy.
     - Case 7 (`quality-vs-quota`): Quality failure receives 1 bounded follow-up then next eligible route; quota failure advances immediately to next authorized route.
     - Case 8 (`no nesting`): Recursive subagent delegation and worker-spawned reviewers are strictly forbidden.
     - Case 9 (`repeat mistake`): Repeat mistakes append/extend proposed candidates in `AGENTS_LEARNING.md`; no automatic promotion into instruction files.

6. **`skills/common/common-learning-log/SKILL.md` & `references/log-format.md`**:
   - Removed contradictory guidance directing automatic promotion to `CLAUDE.md`/`AGENTS.md` after 2 or 3 repeat mistakes.
   - Reconciled protocol: repeat mistakes append or extend an existing candidate entry with status `proposed`; never auto-promote to instruction files.
   - Promotion requires independent maintainer review and verified fresh evaluation evidence.
   - Reconciled anti-patterns: "No auto-promotion on repeat mistakes" and "No self-authored promotion".
   - Added governance requirement: verified durable archive required before scratch cleanup.

7. **`skills/common/common-learning-log/evals/evals.json`**:
   - Added Case 5 (`repeat mistake proposed`): verifies that repeated errors append/extend `AGENTS_LEARNING.md` with status `proposed` and require independent review rather than auto-promoting.
   - Added pressure scenario testing rejection of auto-promotion on repeated errors.

8. **`skills/common/common-session-retrospective/SKILL.md` & `references/methodology.md`**:
   - Aligned candidate record lifecycle: repeat mistakes append/extend candidate with status `proposed`.
   - Enforced verified durable archive requirement before session evidence scratch removal.
   - Added anti-patterns against auto-promotion on repeat mistakes and unverified evidence cleanup.

9. **`skills/common/common-session-retrospective/evals/evals.json`**:
   - Added Case 5: tests repeat mistake candidate proposed status, independent review requirement, and verified durable archive before workspace deletion.

10. **`scripts/skill-tests/common-subagent-driven-development/test_task_brief.py`**:
    - Implemented Python behavioral test suite covering:
      - `test_missing_fields_no_output`: missing contract fields fail with exit code 5 and write no output file.
      - `test_complete_brief_extracted`: complete contract fields extract successfully to destination.
      - `test_fenced_fake_headings_ignored`: fake headers in markdown fences do not truncate or switch tasks.
      - `test_existing_output_preserved`: existing output files are preserved untouched and overwrite is refused with exit code 4.

---

## 2. Verification Commands & Status

As mandated by orchestrator policy, test execution was skipped mid-flight to avoid shared writer conflicts. All tests are scheduled for parent execution during final covering gates:

- **Python Helper Tests:**
  - Command: `rtk proxy python3 -B -m unittest discover -s scripts/skill-tests/common-subagent-driven-development`
  - Status: `NOT RUN` (worker implementation complete; verification owned by parent).
- **Real-Scorer Eval Calibration:**
  - Command: Evaluator worker / parent real-scorer suite (`scripts/evals/diagnostic-prevention.test.ts`).
  - Status: `NOT RUN` (coordinated eval IDs frozen below).

---

## 3. Coordinated Eval IDs

Frozen IDs for evaluator worker and parent integration:
- `common-subagent-driven-development`: IDs `1`, `2`, `3` (existing), `4` (Inline), `5` (vague proceed), `6` (archive failure), `7` (quality-vs-quota), `8` (no nesting), `9` (repeat mistake).
- `common-learning-log`: IDs `1`, `2`, `3`, `4` (existing), `5` (repeat mistake candidate status proposed).
- `common-session-retrospective`: IDs `1`, `2`, `3`, `4` (existing), `5` (repeat mistake proposed and archive cleanup).

---

## 4. Contract Migration Callers

- `task_brief.py`: Public function `extract_task(plan_file, task_number, outfile=None)` maintains the original three-argument signature without bypass flags. Validation and exclusive publication are mandatory and unconditional.
- Plans lacking required contract fields will intentionally receive an explicit validation error, preventing unverified or ambiguous agent dispatch.

---

## 5. Risks & Mitigations

- **Risk:** Historical plans with informal headings may fail extraction under strict contract validation.
  - **Mitigation:** Strict validation is intentional per spec S02; `task_brief.py` emits an actionable error message naming missing fields so authors can update plans rather than allowing workers to run with ambiguous boundaries.
- **Risk:** Rejecting output overwrite could fail repeated runs targeting identical paths.
  - **Mitigation:** Immutable output preservation prevents accidental clobbering of previously verified briefs. Workspaces use distinct attempt or task directories per run.

---

## 6. Corrective Follow-Up (Review Round 1 Remediation — R1–R5) — FINAL

All Round 1 Major findings for Task 2 have been addressed:

1. **R1 Remediation (Structured Field Validation Outside Fences):**
   - Replaced keyword searches with strict structured label regex matching outside Markdown code fences (`lines_outside`): requires `**Files:**`, `**Inputs:**`, `**Outputs:**`, `**Real Ingress:**`, `**Invariants:**`, `**Verification owner:**`, `**Handoff / freeze:**`, and `**Correction route:**`.
   - Enforced non-empty values for every field (`\S+`).
   - Enforced that BOTH positive and negative invariants exist with non-empty values (`positive invariant` and `negative invariant` validated separately).
   - Enforced explicit handoff/freeze containing terminal status keywords (`final`, `freeze`, `report`, `handoff`).
   - Added test coverage in `test_task_brief.py` for empty values, fenced-only fields, prose keyword stuffing, and one-sided invariants.

2. **R2 Remediation (Workspace Creation Deficit on Default CLI):**
   - Reordered `extract_task`: extraction and contract validation now execute BEFORE `resolve_workspace(plan_file)` or directory creation.
   - Added `test_default_cli_no_side_effects_on_failure` in an isolated directory verifying that no `.agent/`, `.gitignore`, or workspace paths are created when validation fails.

3. **R3 Remediation (Exclusive Publication & Symlink Rejection):**
   - Switched publication to atomic exclusive creation `open(outfile, "x", encoding="utf-8")` catching `FileExistsError` (exit code 4), eliminating TOCTOU race conditions.
   - Added `os.path.islink(outfile)` check to reject symlink targets and dangling symlinks without traversal.
   - Added `test_symlink_destination_refused` and `test_existing_output_preserved_exclusive` preserving original sentinel bytes.

4. **R4 Remediation (Removal of Bypass Flags):**
   - Restored original three-argument API: `def extract_task(plan_file, task_number, outfile=None):`. Removed `validate_contract` and `allow_overwrite` bypass parameters.

5. **R5 Remediation (Active Policy Precedence & Quota vs. Error Distinction):**
   - Removed obsolete 1–3 worker / 4–5 higher-tier retry instructions from `methodology.md`.
   - Linked retry count, escalation, and routing to active host/user policy across `SKILL.md` and `methodology.md`.
   - Distinguished observed quota exhaustion (advance route immediately) from provider errors (acknowledge terminal writer state before failover).
   - Grounded `common-subagent-driven-development/evals/evals.json` Case 7 with active host policy context.

**FINAL Freeze:** Task 2 implementation and tests are complete, frozen, and ready for parent verification.
