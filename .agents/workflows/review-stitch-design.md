---
description: Review a Google Stitch design against the family-UX rubric, then improve it through variants without touching the original screens.
---

# Review Stitch Design Workflow

Goal: Score the chosen Stitch screens with evidence, get approval for fixes, and deliver improved variants with a before/after report.

## Steps

1. Preflight:
   - Stitch MCP tools present, else return `BLOCKED (stitch-mcp)` with the setup from `common-stitch-design/references/stitch-mcp.md`.
   - Load `common-stitch-design`, `common-family-ux`, `common-accessibility`, `common-mobile-ux-core`.
2. Scope:
   - `list_projects`, then `list_screens`; group by title and pick the current version per title with the author (default: most recent).
   - Declare surfaces (parent, child), age band, locale, and devices.
3. Collect:
   - Download each selected screenshot and HTML to `.stitch/review/<YYYY-MM-DD>/`.
   - Run `node <common-stitch-design>/scripts/audit_html.js .stitch/review/<YYYY-MM-DD>/`; read `list_design_systems`.
4. Score:
   - Six-axis rubric per screen plus project findings; audit output is evidence, visual claims cite the screenshot.
   - Cross-screen check: names, ages, dates, allergies, and conditions agree on every screen.
5. Gate:
   - Present findings with the smallest fix and a ready-to-run edit prompt. No write call before approval.
6. Improve:
   - Write or repair `DESIGN.md`, lint it with `npx @google/design.md lint` to 0 errors and 0 warnings, create a new design system.
   - `generate_variants` with `REFINE` and `variantCount: 1` per approved screen; `EXPLORE` with `deviceType: TABLET` when tablet is missing.
7. Verify:
   - Re-run the audit and rubric on the variants; fix residual findings with `edit_screens` on variants only, max 2 passes.
   - Report before/after per axis with screen ids and list what remains.

## Runtime Contract

- Use when a Stitch project or screen needs review, feedback, or improvement.
- Required inputs: Stitch MCP access, project id or name, and a reachable author or an explicit instruction to proceed on defaults.
- Never edit, delete, or re-theme original screens; never call `delete_project`.
- Return BLOCKED when Stitch MCP is missing, the project is not visible to the key, or no screen can be downloaded.

## Handoff Payload

- `slug`, project id, selected screen ids, surfaces and age band, old and new design system asset ids, audit JSON path, scorecard, findings, variant screen ids, residual findings, next workflow.

## Blocking Questions

- Ask max 3 at a time with a recommended default and 2-3 options: current version per title, surfaces present, approval of fixes.

## Output Template

```md
# Stitch Design Review: [Project]
## Scope
## Audit Summary
## Scorecard
## Findings
| Severity | Axis | Screen | Evidence | Consequence | Smallest fix | Edit prompt |
| --- | --- | --- | --- | --- | --- | --- |
## Approved Fixes
## Variants
## Before / After
## Residual Findings

## Next Workflow
plan-feature | implement-feature
## Cost Report
Call `get_session_cost(workflow="review-stitch-design")` before final handoff.
```
