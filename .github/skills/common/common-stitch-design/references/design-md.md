# DESIGN.md

Google Labs `design.md` format: YAML front matter tokens plus Markdown sections. Lint: `npx @google/design.md lint DESIGN.md` (0 errors, 0 warnings).

## Section order

Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts. Skip a section rather than reorder.

## Tokens

```yaml
---
version: alpha
name: <product> — <theme>
colors:
  primary: "#......"
  on-primary: "#......"
  surface: "#......"
  on-surface: "#......"
typography:
  body-md: { fontFamily: <font>, fontSize: 16px, fontWeight: 400, lineHeight: 1.55 }
rounded: { sm: 8px, md: 16px, lg: 24px, full: 9999px }
spacing: { sm: 8px, md: 16px, lg: 24px }
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
---
```

## Rules

- Every colour has a role name, hex, and usage sentence in `## Colors`.
- Every `components.*` pair of `backgroundColor` and `textColor` reaches 4.5:1; the linter's `contrast-ratio` rule checks it.
- Every colour token is referenced by a component, or lint warns `orphaned-tokens`.
- State the locale rules (language, date format, units) in `## Overview`.
- Put sample data (names, ages, dates) in `## Do's and Don'ts` so every generated screen reuses the same people.
- Negative rules ("Don't …") work better than adjectives for stopping generic output.

## Upload

`create_design_system` with `designSystem.theme.designMd` set to the file text, plus required theme fields (`colorMode`, `customColor`, `headlineFont`, `bodyFont`, `roundness`). Then `update_design_system` with `name` = the new `assets/<id>`.
