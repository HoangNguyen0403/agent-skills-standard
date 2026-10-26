---
description: Review a Google Stitch design against human direction and family-UX rubric, improving it through variants without touching originals.
---

# Review Stitch Design Workflow

Goal: Evaluate Stitch screens against human direction, obtain approval for targeted fixes, and deliver improved variants with before/after evidence or a justified no-change outcome.

## Steps

1. Preflight:
   - Stitch MCP tools present, else return `BLOCKED (stitch-mcp)` with the setup from `common-stitch-design/references/stitch-mcp.md`.
   - Load `common-stitch-design`, `common-ui-design`, `common-family-ux`, `common-accessibility`, `common-mobile-ux-core`.
2. Scope & Direction:
   - `list_projects`, then `list_screens`; group by title and pick current version per title with author (default: most recent).
   - Confirm surfaces (parent, child), age band, locale, devices.
   - Establish human direction: select mode (default `polish`; `restyle` or `rethink` only on explicit human choice), define `keep / change / avoid` boundaries (see `common-ui-design/references/human-direction.md`). References: borrow vs avoid (optional).
3. Collect:
   - Download selected screenshot and HTML to `.stitch/review/<YYYY-MM-DD>/`. Inspect screenshots only via bounded preview procedure in `common-stitch-design/references/stitch-mcp.md` (verified <=1600 px longest edge).
   - Run `node <common-stitch-design>/scripts/audit_html.js .stitch/review/<YYYY-MM-DD>/`; read `list_design_systems`.
4. Critique & Score:
   - Score six-axis rubric per screen plus project findings; HTML audit output is objective evidence, visual claims cite screenshot.
   - Follow `observation -> impact -> smallest change -> preservation`. Classify findings: defect (objective rule/contrast failure), context concern (usability/age fit), or taste (preference). Distinguish observed proof from preference.
   - Cross-screen consistency check: agree on names, ages, dates, allergies, and conditions.
5. Gate (Branch Before Writes):
   - Present findings, selected mode, and ready-to-run prompt without geometry locks.
   - If original satisfies direction or author elects to keep it, branch to justified no-change: skip variant and new design system writes completely, but retain any unresolved objective blockers in findings and handoff (unresolved Blockers keep design out of ready handoff; declining a fix does not imply accessible/ready).
   - Human taste can prefer variant without objective proof; record as preference, not measured quality. Explicit approval required before any write.
6. Improve (When Approved & Changes Needed):
   - If styling changes: update `DESIGN.md`, lint to 0 errors/0 warnings (`npx @google/design.md lint`), create new design system asset.
   - `generate_variants` with `creativeRange: REFINE`, `variantCount: 1` per approved screen (`EXPLORE` only for missing tablet class or explicit rethink mode). Prompt with `keep / change / avoid`.
7. Verify & Human Selection Gate:
   - Re-run HTML audit and score six-axis rubric with screenshot citations; fix residual issues with `edit_screens` on variants only, max 2 passes (may use hex values).
   - Compare before/after evidence per axis. Check preservation by mode: polish/restyle strictly preserve structure and behavior; rethink verifies approved reorganization against brief (avoid score-gaming).
   - Final human selection gate: record explicitly selected original or variant, or mark selection pending. Never auto-win by score; never imply handoff is accepted while selection is pending.
## Runtime Contract

- Use when a Stitch project or screen needs review, feedback, or improvement.
- Required inputs: Stitch MCP access, project id or name, and a reachable author or an explicit instruction to proceed on defaults.
- Never edit, delete, or re-theme original screens; never call `delete_project`.
- Return BLOCKED when Stitch MCP is missing, the project is not visible to the key, no screen can be downloaded, or unresolved Blockers remain (unresolved Blockers keep design out of ready handoff).

## Handoff Payload

- `slug`, project id, screen ids, mode, keep/change/avoid rules, old and new design system asset ids (if created), audit JSON path, scorecard, findings (defect/context/taste with unresolved blockers), selected screen or selection pending, variant screen ids (or justified no-change note), residual findings, ready/blocked status, next workflow.

## Blocking Questions

- Ask max 3 at a time with recommended default: current version per title, refinement mode & keep/change/avoid, approval of proposed fixes/no-change.

## Output Template

```md
# Stitch Design Review: [Project]
## Scope & Direction (Mode: polish | restyle | rethink, Keep/Change/Avoid)
## Audit Summary & Proof vs Preference
## Scorecard & Preservation Check
## Findings
| Severity | Type (Defect/Context/Taste) | Screen | Evidence | Consequence | Smallest fix | Edit prompt |
| --- | --- | --- | --- | --- | --- | --- |
## Approved Action (Selected original | Selected variant | Justified no-change | Selection pending)
## Before / After Evidence
## Residual Findings

## Next Workflow
plan-feature | implement-feature
## Cost Report
Call `get_session_cost(workflow="review-stitch-design")` before final handoff.
```
