---
name: common-stitch-design
description: Drive Google Stitch over MCP safely - read screens, write and lint DESIGN.md, create design systems, and fix designs through variants instead of overwriting. Use when reviewing, editing, or generating Stitch screens or DESIGN.md files.
metadata:
  triggers:
    files:
      - 'DESIGN.md'
      - '.stitch/**'
    keywords:
      - stitch
      - google stitch
      - stitch mcp
      - design.md
      - stitch screen
      - stitch variants
---

# Stitch Design

## **Priority: P1 (HIGH)**

## Preflight

- Stitch tools (`list_projects`, `list_screens`, `get_screen`) must be in the tool list. Missing → `BLOCKED (stitch-mcp)`.
- Endpoint `https://stitch.googleapis.com/mcp`, header `X-Goog-Api-Key`. Config added mid-session loads only after restart. Setup: [Stitch MCP](references/stitch-mcp.md).

## Read

- `list_screens`, then group by `title`: many versions share one title. Confirm the current one with the author; default most recent.
- Before opening an image, fetch it to disk without attaching it to the model; verify decoded width and height and create a proportional preview with a longest edge <=1600 px. This is a conservative workflow budget, not a guaranteed model limit. `=w390`/`=w1280` is optional optimization, not a size guarantee. Preserve originals; use the bounded review procedure in [Stitch MCP](references/stitch-mcp.md#bounded-image-review).
- Read SVG source as text first. Bound raster output and both browser screenshot dimensions before image ingestion; never request `fullPage`. Account for physical pixels (`CSS pixels × devicePixelRatio`); review tall pages with an overview and separate viewport captures.
- A rejected image in a generation/edit response does not prove the backend write failed. Recover IDs, metadata, and completed screens before any retry. If documented tool behavior can embed an oversized image and no host-supported resize/text-only route exists, stop before the write call.
- If a retained conversation image blocks work, query advertised commands and follow [OMP image recovery](references/stitch-mcp.md#omp-image-recovery); preserve source screenshots before `/shake images`.
- Run `node scripts/audit_html.js <dir>`. Audit output is evidence; screenshots confirm visual judgement.

## Write Safely

- Never overwrite originals. Fix through `generate_variants` (`creativeRange: REFINE`, `variantCount: 1`) or a new design system.
- Explicit approval before `delete_project`, `update_design_system` on an existing asset, or `apply_design_system` to original screens.
- New design system: `create_design_system` with `theme.designMd`, then `update_design_system` on that new asset.
- `apply_design_system` takes screen instance ids from `get_project`, not screen ids.
- Generation takes minutes. On timeout do not retry; poll `get_screen` every 30 s, max 10.
- Variant output includes illustration image screens with null `deviceType`: skip them. Check device class on the screenshot; a `TABLET` request can return `DESKTOP`.

## DESIGN.md

- Google `design.md` format. `npx @google/design.md lint DESIGN.md` must report 0 errors and 0 warnings before upload.
- Every component `backgroundColor`/`textColor` pair must pass contrast. Rules: [DESIGN.md](references/design-md.md).

## Prompting

- Generation prompts: layout and content only. Edit and variant prompts may carry hex values.
- One shared fix block plus per-screen specifics; re-audit after each pass; max 2 `edit_screens` passes on variants only. See [Prompting](references/prompting.md).

## Anti-Patterns

- **No in-place fixes**: editing originals destroys the baseline.
- **No trusting labels**: titles and device labels drift; check screenshots.
- **No unlinted DESIGN.md**: one bad colour pair ships to every screen.
