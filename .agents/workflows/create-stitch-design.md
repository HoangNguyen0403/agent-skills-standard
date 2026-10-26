---
description: Create a new Google Stitch design for a family product from a human-directed brief and a linted DESIGN.md, on phone and tablet, gated by review.
---

# Create Stitch Design Workflow

Goal: Turn a human-directed family product brief into a linted DESIGN.md, a Stitch design system, and core phone and tablet screens passing UX review.

## Steps

1. Preflight:
   - Stitch MCP tools present, else return `BLOCKED (stitch-mcp)` with the setup from `common-stitch-design/references/stitch-mcp.md`.
   - Load `common-stitch-design`, `common-ui-design`, `common-family-ux`, `common-accessibility`, `common-mobile-ux-core`.
2. Brief & Direction:
   - Scope: surfaces (parent, child), age band, locale, devices, up to 5 core tasks.
   - Human Direction: audience, task, concrete character, and keep/change/avoid rules (see `common-ui-design/references/human-direction.md`). References: borrow vs avoid (optional).
   - Record each item as said or assumed; obtain human approval before generation.
3. DESIGN.md:
   - Write from brief, character, and `common-family-ux` rules: passing colour pairs, one font, locale rules, one sample family, one illustration style, fixed navigation.
   - `npx @google/design.md lint DESIGN.md` must report 0 errors and 0 warnings.
4. Project and design system:
   - `create_project`, or use the existing project the author names.
   - `create_design_system` with `theme.designMd`, then `update_design_system` on that new asset.
5. Generate:
   - `generate_screen_from_text` per core task with layout and content only (no colours/fonts; appearance lives in DESIGN.md), explicitly passing new `assets/<id>` as `designSystem` in every `deviceType: MOBILE` and `deviceType: TABLET` (two-pane or rail) call.
6. Gate:
   - Run `review-stitch-design` steps 3-7 on every generated screen; unresolved Blockers keep the design out of ready handoff. Verify evidence over preference and check regressions. Collect and inspect screenshots only via bounded preview procedure in `common-stitch-design/references/stitch-mcp.md`.
   - Require human approval before material creative changes; never overwrite originals.

## Runtime Contract

- Use when a family product needs a new Stitch design or a new device class.
- Required inputs: Stitch MCP access and brief with surfaces, age band, locale, devices, and direction, or explicit instruction to proceed on defaults.
- Never modify another project's screens or design systems; never overwrite originals.
- Return BLOCKED when Stitch MCP is missing, DESIGN.md cannot pass lint, or the brief has no age band.

## Handoff Payload

- `slug`, project id, brief & direction (audience, character, keep/change/avoid, said/assumed), DESIGN.md path, lint result, design system asset id, screen ids per device, review scorecard, residual findings, next workflow.

## Blocking Questions

- Ask max 3 at a time with recommended default: surfaces and age band, locale and tasks, direction (character and keep/change/avoid).

## Output Template

```md
# Stitch Design: [Product]
## Brief & Human Direction
## DESIGN.md (path, lint result)
## Design System
## Screens
| Task | Mobile screen id | Tablet screen id |
| --- | --- | --- |
## Review Scorecard
## Residual Findings

## Next Workflow
review-stitch-design | plan-feature
## Cost Report
Call `get_session_cost(workflow="create-stitch-design")` before final handoff.
```
