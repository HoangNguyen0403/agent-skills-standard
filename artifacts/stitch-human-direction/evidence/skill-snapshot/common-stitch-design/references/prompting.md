# Prompting Stitch

## Modes

| Need | Tool | Settings |
| --- | --- | --- |
| Fix issues, keep layout | `generate_variants` | `creativeRange: REFINE`, `variantCount: 1` |
| New device class (tablet) | `generate_variants` | `deviceType: TABLET`, `creativeRange: EXPLORE` |
| Residual fixes on a variant | `edit_screens` | selected variant ids only |
| New screen | `generate_screen_from_text` | layout and content only, no colours or fonts |

## Fix prompt shape

1. Name the design system to follow.
2. "Keep the existing layout structure; fix only these issues:" then numbered, testable rules (colour pairs with hex, minimum px sizes, language, sample data, illustration style, navigation tabs).
3. "Screen-specific:" then the content changes for that screen.

## Observed pitfalls

- `REFINE` fixed contrast, language, sample data, navigation, and AI labelling in one pass, but left 12px `text-xs` on 4 of 6 screens. State "Replace every 11px and 12px text with at least 14px" explicitly and re-audit.
- "Every icon button has a visible text label" produced wrapped two-line top-bar labels. Ask for "48x48 icon buttons with an accessible name" for standard back, close, and notification icons.
- Generation invents data. A tablet screen stated "no allergy" for a child with a severe peanut allergy. Repeat critical facts in the prompt and cross-check every screen.
