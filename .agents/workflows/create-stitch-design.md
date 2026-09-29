---
description: Create a new Google Stitch design for a family product from a brief and a linted DESIGN.md, on phone and tablet, gated by the Stitch design review.
---

# Create Stitch Design Workflow

Goal: Turn a product brief into a linted DESIGN.md, a Stitch design system, and core phone and tablet screens that pass the family-UX review.

## Steps

1. Preflight:
   - Stitch MCP tools present, else return `BLOCKED (stitch-mcp)` with the setup from `common-stitch-design/references/stitch-mcp.md`.
   - Load `common-stitch-design`, `common-family-ux`, `common-accessibility`, `common-mobile-ux-core`.
2. Brief:
   - Product, surfaces (parent, child), age band, locale, devices, up to 5 core tasks, tone.
   - Record each answer as said or assumed.
3. DESIGN.md:
   - Write it from the brief and the `common-family-ux` rules: colour roles with passing pairs, one font, locale rules, one sample family, one illustration style, fixed navigation.
   - `npx @google/design.md lint DESIGN.md` must report 0 errors and 0 warnings.
4. Project and design system:
   - `create_project`, or use the existing project the author names.
   - `create_design_system` with `theme.designMd`, then `update_design_system` on that new asset.
5. Generate:
   - `generate_screen_from_text` per core task with layout and content only, explicitly passing the new `assets/<id>` as `designSystem` in every `deviceType: MOBILE` and `deviceType: TABLET` (two-pane or rail) generation call.
6. Gate:
   - Run `review-stitch-design` steps 3-7 on every generated screen; unresolved Blockers keep the design out of handoff.

## Runtime Contract

- Use when a family product needs a new Stitch design or a new device class.
- Required inputs: Stitch MCP access and a brief with surfaces, age band, locale, and devices, or an explicit instruction to proceed on defaults.
- Never modify another project's screens or design systems.
- Return BLOCKED when Stitch MCP is missing, DESIGN.md cannot pass lint, or the brief has no age band.

## Handoff Payload

- `slug`, project id, brief with said and assumed flags, DESIGN.md path, lint result, design system asset id, screen ids per device, review scorecard, residual findings, next workflow.

## Blocking Questions

- Ask max 3 at a time with a recommended default and 2-3 options: surfaces and age band, locale, core tasks.

## Output Template

```md
# Stitch Design: [Product]
## Brief
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
