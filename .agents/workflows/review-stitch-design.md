---
description: Review a Google Stitch design against human direction and task-relevant criteria, improving it through variants without touching originals.
---

# Review Stitch Design Workflow

Goal: Evaluate Stitch screens against human direction and the criteria the actual task and audience justify, obtain approval for targeted fixes, and deliver improved variants with before/after evidence or a justified no-change outcome.

## Steps

1. Preflight:
   - Stitch MCP tools present. If missing, block only the lanes that need access — current-screen retrieval, identity/currentness verification, and all writes — as `BLOCKED (stitch-mcp)` with the setup from `common-stitch-design/references/stitch-mcp.md`. A review of clearly labelled historical evidence may still proceed under step 3.
   - Always load `common-stitch-design` and `common-ui-design`. Load `common-family-ux` only when the product, audience, or content is for children or families; `common-mobile-ux-core` only when a mobile, tablet, or touch surface is in scope; `common-accessibility` only when an accessibility review lane is requested or a rendered/dom defect requires it. Do not load unrelated rubrics to fill a review.
2. Scope & Direction:
   - `list_projects`, then `list_screens`; group by title and pick current version per title with author (default: most recent).
   - Identify audience, primary task, and devices in scope. Record an age band only when the product targets one; record surfaces (parent, child) and locale where relevant.
   - Establish human direction: select mode (default `polish`; `restyle` or `rethink` only on explicit human choice), define `keep / change / avoid` boundaries (see `common-ui-design/references/human-direction.md`). References: borrow vs avoid (optional).
3. Collect:
   - Download selected screenshot and HTML to `.stitch/review/<YYYY-MM-DD>/`. Inspect screenshots only via bounded preview procedure in `common-stitch-design/references/stitch-mcp.md` (verified <=1600 px longest edge).
   - Verify identity, currentness, media type, decoded dimensions, on-disk bytes, SHA-256 binding, and evidence limits per `common-stitch-design/references/review-evidence.md`; the project thumbnail is not current-screen evidence. If only historical evidence exists, label the review historical and state that currentness is not established.
   - Run `node <common-stitch-design>/scripts/audit_html.js .stitch/review/<YYYY-MM-DD>/` only when valid HTML actually arrived; otherwise report the audit check as `NOT RUN (HTML unavailable)` and the DOM lane as `NOT ASSESSED`. Read `list_design_systems`.
4. Critique & Coverage:
   - Cover the criteria the task justifies — product proof and claim accuracy, copy clarity, composition and evidence hierarchy, plus the loaded family/mobile/accessibility rubrics only where in scope. Report per-criterion findings instead of a fabricated aggregate score; never invent numeric weights or a universal family/mobile pass mark.
   - Follow `observation -> impact -> smallest change -> preservation`. Classify findings: defect (objective rule/contrast failure), context concern (usability/task fit), or taste (preference). Distinguish observed proof from preference, and mark lanes that could not be assessed.
   - Allow familiar patterns, cards, and brand colours where the task justifies them; do not flag justified conventions as generic. Record owner preference separately from reviewer evidence.
   - Cross-screen consistency check: agree on names, ages, dates, allergies, and conditions wherever such content exists.
5. Gate (Branch Before Writes):
   - Present findings, selected mode, and ready-to-run prompt without geometry locks.
   - If original satisfies direction or author elects to keep it, branch to justified no-change: skip variant and new design system writes completely, but retain any unresolved objective blockers in findings and handoff (unresolved Blockers keep design out of ready handoff; declining a fix does not imply accessible/ready).
   - Human taste can prefer variant without objective proof; record as preference, not measured quality. Explicit approval required before any write.
6. Improve (When Approved & Changes Needed):
   - If styling changes: update `DESIGN.md`, lint to 0 errors/0 warnings (`npx @google/design.md lint`), create new design system asset.
   - `generate_variants` with `creativeRange: REFINE`, `variantCount: 1` per approved screen (`EXPLORE` only for missing tablet class or explicit rethink mode). Prompt with `keep / change / avoid`.
7. Verify & Human Selection Gate:
   - Re-run the HTML audit only when HTML exists, and re-check the same applicable criteria with screenshot citations; fix residual issues with `edit_screens` on variants only, max 2 passes (may use hex values). Report unretrieved lanes as `NOT ASSESSED`, never as passing.
   - Compare before/after evidence per criterion. Check preservation by mode: polish/restyle strictly preserve structure and behavior; rethink verifies approved reorganization against brief (avoid score-gaming).
   - Final human selection gate: record explicitly selected original or variant, or mark selection pending. Never auto-win by score; never imply handoff is accepted while selection is pending.
## Runtime Contract

- Use when a Stitch project or screen needs review, feedback, or improvement.
- Required inputs for a current-screen review: Stitch MCP access, project id or name, and a reachable author or an explicit instruction to proceed on defaults. A bounded historical critique instead requires the retained artifact plus its provenance, and still needs author reachability before any write.
- Never edit, delete, or re-theme original screens; never call `delete_project`.
- Block current-screen review, verification, and all writes (`BLOCKED (stitch-mcp)`) when Stitch MCP is missing, the project is not visible to the key, or no current screen artifact can be downloaded. Unresolved Blockers keep the design out of ready handoff.
- A bounded historical critique of genuinely retained historical evidence may still be returned: label it historical, state that currentness is not established, and never treat it as a current-screen or freshness-equivalent result (see `common-stitch-design/references/review-evidence.md` §6).

## Handoff Payload

- `slug`, project id, screen ids, mode, keep/change/avoid rules, old and new design system asset ids (if created), audit JSON path or `NOT RUN (HTML unavailable)` / `NOT ASSESSED` lane note, per-criterion coverage summary (no invented aggregate score), findings (defect/context/taste with unresolved blockers), selected screen or selection pending, variant screen ids (or justified no-change note), residual findings, ready/blocked status, next workflow.

## Blocking Questions

- Ask max 3 at a time with recommended default: current version per title, refinement mode & keep/change/avoid, approval of proposed fixes/no-change.

## Output Template

```md
# Stitch Design Review: [Project]
## Scope & Direction (Mode: polish | restyle | rethink, Keep/Change/Avoid)
## Evidence & Identity (screen ids, downloaded bytes, unretrieved lanes)
## Applicable Criteria Coverage & Preservation Check
## Proof vs Preference
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
