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
   - Classify direction as exactly one of open, explicitly approved, or settled. A request to compare alone does not reopen an approved or settled direction. For unchanged, explicitly approved scope, carry the approval without new sketches or renewed approval. For a genuinely open choice, sketch directions in text using the shared method in `common-decision-discipline/references/explore-facilitation.md` and UI sketch fields in `common-stitch-design/references/prompting.md`; let the requester choose, combine, keep current, or defer.
   - Age band: ask plainly when missing and required work depends on it; never guess. If the mandatory shared sample-family asset is not yet approved and usable, hold all dependent generation (including age-dependent content, examples, and review lanes). An independent surface may proceed only with an already-approved usable asset and no age-dependent inputs. Text-only direction work may continue. List every held lane by name in the handoff.
   - Record each item as said or assumed; obtain human approval before generation unless already explicitly approved for this same scope.
3. DESIGN.md:
   - For a new design system, write from the brief, character, and `common-family-ux` rules: passing colour pairs, one font, locale rules, one age-appropriate sample family, one illustration style, fixed navigation. Missing required age blocks creating this shared asset.
   - `npx @google/design.md lint DESIGN.md` must report 0 errors and 0 warnings before upload or dependent generation; any lint failure stops that path. Reuse of an approved existing asset for its approved scope does not rewrite its DESIGN.md.
4. Project and design system:
   - Use an explicitly approved, usable existing design system for this scope in preference to creating a new asset. Otherwise create a project or use the named existing project, then create a design system with `theme.designMd` and update only that new asset.
5. Generate:
   - Generate each core task with layout and content only (no colours/fonts; appearance lives in DESIGN.md), using the approved device list; if no device list was specified, retain the existing phone and tablet defaults. Explicitly pass the applicable approved `designSystem` in each call.
   - Approved A/B layout comparison: generate only the explicitly approved layouts with identical task, content, device, and design system; vary and label only the named layout or flow variable. Add no unrequested device. Visual direction uses separate labelled design system assets, not a layout comparison.
6. Gate:
   - Run `review-stitch-design` steps 3-7 on every generated screen; unresolved Blockers keep the design out of ready handoff. Verify evidence over preference and check regressions. Collect and inspect screenshots only via bounded preview procedure in `common-stitch-design/references/stitch-mcp.md`.
   - Require human approval before material creative changes; never overwrite originals.

## Runtime Contract

- Use when a family product needs a new Stitch design or a new device class.
- Load `common-decision-discipline` and apply its §8 continuation contract at entry and every handoff: the settled result selects the successor and specialized gates dominate.
- Required inputs: Stitch MCP access and brief with surfaces, locale, devices, and direction; age band when required work depends on it, or explicit instruction to proceed on unrelated items only.
- Never modify another project's screens or design systems; never overwrite originals.
- When age is missing, block every age-dependent lane. Generation on an independent surface is allowed only with an already-approved usable design system and no dependent inputs. Report each held lane; text-only direction work remains allowed. Missing Stitch tools block dependent current-screen retrieval, verification, and writes as `BLOCKED (stitch-mcp)`.

## Handoff Payload

- `slug`, project id, brief & direction, held lanes, DESIGN.md path and lint result, design system asset id, screen ids per device, review scorecard, residual findings, next workflow.

## Blocking Questions

- Ask max 3 at a time: surfaces, locale and tasks, direction (character and keep/change/avoid). Settled inputs may carry a recommended default; a missing required age band is asked plainly and never defaulted.

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
