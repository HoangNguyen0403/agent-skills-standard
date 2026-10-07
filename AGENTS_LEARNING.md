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

**Date**: 2026-10-04 | **Task**: Plan improvements to system-design review outcomes
**Signal**: Session retrospective
**Skills**: system-design/system-design-review, system-design/system-design-methodology, common/common-architecture-diagramming
**Scope**: registry
**Candidate**: design-review-action-handoff-20261004 | **Status**: proposed
**Provenance**: registry revision `1fb0537c`; prior Our Children review correction documented in a separate local worktree; proposal at `docs/brd/brd-system-design-review-outcomes.md`
**Evaluation**: not-run
**Review**: pending
**Rollback**: not-applicable

### ❌ Mistake Made
The first Our Children review produced a score, findings and a short roadmap, but no owned, evidence-based closure plan. `.agents/workflows/review-system-design.md` requires a roadmap without specifying action ownership, dependencies, acceptance evidence, or persistence; its corresponding skill eval accepts a keyword hit as a smoke signal for actionability.

### 🚫 Pattern to Avoid
- **No score-only handoff**: a finding with no owner role, dependency, exit evidence, or tracked state cannot be independently closed.
- **No vocabulary-as-outcome test**: a lexical mention of “roadmap” cannot prove the resulting plan can guide a maintainer.

### ✅ Better Approach
First revise the existing review workflow and skill to connect each material finding to a bounded action and verification gate, preserving read-only operation and no-action reviews. Replay the correction as an eval case and grade the resulting plan semantically before promoting the registry change; keep the candidate pending maintainer approval.
