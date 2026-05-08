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
