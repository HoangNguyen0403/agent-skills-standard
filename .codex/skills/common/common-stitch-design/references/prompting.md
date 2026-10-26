# Prompting Stitch

## Refinement Modes & Stitch Capabilities

Refinement mode is an orchestration contract (`mode != creativeRange`); see [Human Direction](../../common-ui-design/references/human-direction.md). Map intent to documented Stitch tools and settings without inventing API parameters:

| Refinement Mode | Intent & Preservation | Stitch Tool | Documented Settings |
| --- | --- | --- | --- |
| **Polish** (Default) | Preserve IA, major composition, navigation, content, behavior; permits local spacing, sizing, and wrapping | `generate_variants` or `edit_screens` | `creativeRange: REFINE`, `variantCount: 1` (variants); selected variant IDs (edits) |
| **Restyle** | Visual styling and tokens update; preserves structure and behavior without freezing exact pixel positions | `generate_variants` or `edit_screens` | New design system via `create_design_system`; `creativeRange: REFINE` on variants |
| **Rethink** | Layout and flow re-architecture on explicit human choice only | `generate_variants` or `generate_screen_from_text` | `creativeRange: EXPLORE`, or new screen from text (layout/content only) |
| **Tablet Class** | Responsive layout adaptation (rail/two-pane) preserving data | `generate_variants` | `deviceType: TABLET`, `creativeRange: EXPLORE` |
| **Justified No-Change** | Current screen satisfies direction; keep original | *(None)* | No variant generation or asset writes required |

## Prompt Rules

- **Generation prompts**: Layout and content only. Never specify colours, hex codes, or fonts in generation; appearance is governed entirely by `DESIGN.md`.
- **Edit and variant prompts**: May carry concrete hex values, pixel sizes, and accessibility requirements. Max 2 `edit_screens` residual passes on variants only.
- **Avoid geometry lock**: Do not dictate rigid DOM constraints or frozen pixel coordinates that fight Stitch; specify structural intent, hierarchy, content, and token rules.

## Prompt Shape (Keep / Change / Avoid)

1. Name the design system asset to follow (`assets/<id>`).
2. **Keep**: Explicitly list information architecture, major composition, navigation, content, and behavior to preserve untouched (local spacing and sizing can flex).
3. **Change**: Numbered, testable fixes (contrast pairs with exact hex, minimum 14px text sizes, verified sample data, 48x48 icon buttons with accessible names).
4. **Avoid**: Off-brand styles, unauthorized layout shifts, AI tropes, and collateral changes.
5. **Screen-Specific**: Concrete data and content adjustments per screen.

## Observed pitfalls

- `REFINE` fixed contrast, language, sample data, navigation, and AI labelling in one pass, but left 12px `text-xs` on 4 of 6 screens. State "Replace every 11px and 12px text with at least 14px" explicitly and re-audit.
- "Every icon button has a visible text label" produced wrapped two-line top-bar labels. Ask for "48x48 icon buttons with an accessible name" for standard back, close, and notification icons.
- Generation invents data. A tablet screen stated "no allergy" for a child with a severe peanut allergy. Repeat critical facts in the prompt and cross-check every screen.
- Mode drift: treating `restyle` as permission to change screen structure causes user confusion. Keep visual changes isolated to theme tokens and styling.
