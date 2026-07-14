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
