# Agent Learning Log

This file is auto-maintained by AI agents as a self-improving mistake log.
Each iteration captures a concrete mistake, the pattern to avoid, and the better approach.
Do not edit past entries; append only.

---

## Agent Learning Log: Iteration #1

**Date**: 2026-05-08 | **Task**: Consolidate Antigravity folders and fix sync issues.
**Signal**: User correction

### ❌ Mistake Made
- Refactored `.antigravity/mcp_config.json` to `.agents/mcp_config.json` without confirming if the original path was a requirement for the Antigravity agent.
- Implemented a destructive cleanup of the `.agent` folder using `fs.remove` without migrating existing user content (custom skills) first.

### 🚫 Pattern to Avoid
- **No arbitrary path consolidation**: Do not change agent-specific configuration paths based on naming "consistency" assumptions without verifying requirements.
- **No destructive cleanup without migration**: Never delete folders that could contain unique user-created content (e.g., custom skills) without a merge/migration step.

### ✅ Better Approach
Verify agent configuration paths against documentation or current user state before refactoring. Implement a "Migrate and Clean" protocol: check for source existence, merge non-duplicate items to the destination, and only then perform the deletion.

---

## Agent Learning Log: Iteration #2

**Date**: 2026-07-12 | **Task**: Improve live skill evaluation quality.
**Signal**: User correction

### ❌ Mistake Made
I reported evaluator safety and incremental-run improvements without making the remaining skills-improvement work equally explicit. That risked treating measurement infrastructure as completion while the report still showed below-gate skills.

### 🚫 Pattern to Avoid
- **No infrastructure-as-outcome reporting**: A safer runner does not prove that skill bodies, activation boundaries, or live outcomes meet the stated quality gate.

### ✅ Better Approach
Track source repair, fresh evidence, and category promotion as separate deliverables. Report the remaining below-gate skills and continue the remediation waves until current evidence proves the release gate.

---

## Agent Learning Log: Iteration #3

**Date**: 2026-07-13 | **Task**: Verify the skill-remediation eval runs.
**Signal**: User correction

### ❌ Mistake Made
I repeatedly asked for a run after the user had already completed `all-v2.6.0-2026-07-12T15-40-45-083Z-1d558d66`. I inspected incomplete prepared manifests before checking the newest completed `results.json`, then continued changing sources after the completed run without clearly freezing the verification batch.

### 🚫 Pattern to Avoid
- **No run-state assumptions**: Never ask for execution, quota approval, or reruns before enumerating and verifying the newest completed eval run.
- **No moving verification target**: Freeze a remediation batch before a user runs it; do not silently add more source changes and then describe a new run as the same required step.

### ✅ Better Approach
At each user update, inspect `manifest.json`, `results.json`, and `completedAt` first. Treat the latest completed run as authoritative, finish analysis against that immutable evidence, and present any later verification as a separately named, one-time frozen batch with its exact scope.

---

## Agent Learning Log: Iteration #4

**Date**: 2026-10-01 | **Task**: Correct skill release version bumps.
**Signal**: User correction

### ❌ Mistake Made
I used minor version bumps for small additive workflow and skill guidance changes without matching the requested release scale.

### 🚫 Pattern to Avoid
- **No scope inflation in semantic versioning**: A small, backward-compatible guidance change does not automatically justify a minor bump.

### ✅ Better Approach
Classify the user-visible change by its actual impact and follow repository release conventions; use patch bumps for small compatible corrections, and align category/workflow metadata with the changelog.

---

## Agent Learning Log: Iteration #5

**Date**: 2026-10-06 | **Task**: Coordinate model-aware instruction modernization.
**Signal**: User correction
**Skills**: common/common-subagent-driven-development, common/common-session-retrospective
**Scope**: session
**Candidate**: modernization-worker-handoff | **Status**: proposed
**Provenance**: base `1fb0537c`; `.agents/sdd/2026-10-05-model-aware-instruction-modernization/progress.md`
**Evaluation**: not-run; no skill-policy change proposed as verified
**Review**: pending
**Rollback**: not-applicable

### Mistake Made
Repeated status replies described verification as pending or running without checking whether the responsible integration worker had become idle. A user-requested diagnostic found the worker idle with no pending permissions; integration required an explicit resume prompt.

### Pattern to Avoid
- **No inferred worker progress**: A previous dispatch or a stale running label is not evidence of current execution.
- **No status-only handoff loop**: A worker's completed correction must trigger its dependent review or verification action, not another unassigned wait.

### Better Approach
On each completion notification, assign the next dependency with exact ownership and verification commands. On a user-reported stall, inspect active-turn state, latest activity, saved evidence, and permissions once; resume the idle owner or report a concrete blocker. Keep ordinary asynchronous work notification-driven rather than polling.

---

## Agent Learning Log: Iteration #6

**Date**: 2026-10-06 | **Task**: Finish PR223 remediation evidence.
**Signal**: Session retrospective
**Skills**: common/common-session-retrospective, common/common-learning-log
**Scope**: project
**Candidate**: evidence-namespace-selection | **Status**: proposed
**Provenance**: base `fbb30b5`; `artifacts/evidence/pr223-remediation/integration-evidence.json`
**Evaluation**: actual outcome audit passed 21 templates and 5 records after correction; no held-out skill evaluation
**Review**: pending independent maintainer approval
**Rollback**: not-applicable; no registry policy changed

### Mistake Made
Six readiness and verification JSON files were placed under `artifacts/runs`, where the auditor requires genuine Outcome Report records. The first integration audit rejected them.

### Pattern to Avoid
- **No evidence-schema impersonation**: Do not invent outcome fields or timestamps, weaken validation, or overwrite historical observations to make ad hoc evidence fit a reserved namespace.

### Better Approach
Inspect the namespace contract before writing artifacts. Put raw verification evidence under `artifacts/evidence`; create an Outcome Report only when its actual workflow state and required fields are known. Move misclassified files byte-for-byte and update citations, then run outcome and trace audits.

---

## Agent Learning Log: Iteration #7

**Date**: 2026-10-06 | **Task**: Validate the bundled source-map boundary.
**Signal**: Session retrospective
**Skills**: javascript/javascript-language, common/common-session-retrospective
**Scope**: session
**Candidate**: javascript-router-base-fallback | **Status**: proposed
**Provenance**: base `fbb30b5`; MCP file routing returned no match for `.mjs`; direct lookup loaded `javascript/javascript-language`
**Evaluation**: not-run; routing candidate unpromoted
**Review**: pending independent maintainer approval
**Rollback**: not-applicable; no routing configuration changed

### Mistake Made
The installed JavaScript base skill was not loaded before the first bundled-map smoke helper. File routing returned no tier-eligible match; broad keyword routing loaded unrelated platform rules instead.

### Pattern to Avoid
- **No empty-router-as-no-standard assumption**: A missing file match does not establish that an installed language base skill is unavailable.

### Better Approach
After a no-match result, discover the available category and exact skill name, then load that base skill before writing. Record late loading honestly rather than claiming retroactive pre-write compliance. Propose a router fallback separately, with positive and negative activation tests before promotion.

---

## Agent Learning Log: Iteration #8

**Date**: 2026-10-06 | **Task**: Reproduce composite-provenance review findings.
**Signal**: Session retrospective
**Skills**: common/common-tdd, common/common-code-review, common/common-session-retrospective
**Scope**: session
**Candidate**: public-contract-red-validation | **Status**: proposed
**Provenance**: original base `1fb0537c`; `artifacts/evidence/pr223-remediation/whole-review-correction-evidence.json`
**Evaluation**: corrected Node20 fixture control passed and four actual counterexamples failed before implementation; final text target54/54 passed; no held-out skill eval
**Review**: pending independent maintainer approval
**Rollback**: not-applicable; no registry procedure promoted

### Mistake Made
Three planning regressions selected nonexistent `SkillImpact.skillPath`, producing `undefined` instead of exercising the public `key` contract. The supposedly valid physical-source control also failed. The parent caught this before authorizing production changes.

### Pattern to Avoid
- **No assertion failure as automatic RED proof**: Fixture setup, selector errors, or a failing valid control do not establish the intended consumer defect.

### Better Approach
Read the public output shape before choosing regression selectors. Require the targeted record to exist, keep a valid control, and attribute each failure to the intended contract before source authorization. Preserve invalid attempts separately, correct tests first, then observe genuine RED and GREEN.
