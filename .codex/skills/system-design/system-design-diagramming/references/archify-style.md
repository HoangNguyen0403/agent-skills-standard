# Archify Style Contract

Visual language and geometry adopted from [Archify](https://github.com/tt-a1i/archify) (MIT, v2.16),
itself based on `Cocoon-AI/architecture-diagram-generator` (MIT). Use these values verbatim so a
hand-emitted SVG and an Archify-rendered artifact look like the same system.

## Color Tokens (dark, default)

| Token | Value | Use |
| --- | --- | --- |
| canvas | `#020617` | page and diagram background |
| grid | `#1e293b` | 40px background grid, stroke-width `0.5` |
| mask | `#0f172a` | opaque rect under every node and label |
| text | `#ffffff` | node labels |
| text-muted | `#94a3b8` | sublabels, legend labels |
| text-dim | `#475569` | lane and stage titles |
| panel | `rgba(15, 23, 42, 0.5)` | container behind the SVG |
| lane-fill / lane-stroke | `rgba(15, 23, 42, 0.22)` / `#334155` | lane and group frames |
| arrow | `#64748b` | default edge |
| arrow-emphasis | `#34d399` | main-path edge |

## Node Categories

| `type` | Stroke | Fill |
| --- | --- | --- |
| `frontend` | `#22d3ee` | `rgba(8, 51, 68, 0.4)` |
| `backend` | `#34d399` | `rgba(6, 78, 59, 0.4)` |
| `database` | `#a78bfa` | `rgba(76, 29, 149, 0.4)` |
| `cloud` | `#fbbf24` | `rgba(120, 53, 15, 0.3)` |
| `security` | `#fb7185` | `rgba(136, 19, 55, 0.4)` |
| `messagebus` | `#fb923c` | `rgba(251, 146, 60, 0.3)` |
| `external` | `#94a3b8` | `rgba(30, 41, 59, 0.5)` |

Light theme swaps fills to ~0.15-0.2 alpha of the same hue and darkens strokes
(`frontend #0891b2`, `backend #059669`, `database #7c3aed`, `cloud #d97706`, `security #e11d48`,
`messagebus #ea580c`, `external #64748b`) on `--bg: #f8fafc`. Define both as CSS variables and
address them through semantic classes (`.c-backend`, `.t-muted`, `.a-emphasis`); never inline a hex
on a shape, or the theme swap breaks.

## Typography

`JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` everywhere — one voice,
no display font inside the artifact.

| Element | Size | Weight |
| --- | --- | --- |
| Node label | 11 (min 8) | 600 |
| Node sublabel | 9 (min 6) | 400 |
| Node tag | 7 (min 6) | 400 |
| Edge label | 8 | 400 |
| Lane / stage title | 10 / 9 | 600 |
| Legend entry | 8-10 | 500 |
| Legend title | 12 | 650 |

## Geometry

- Node: default `120 × 60`, `rx="6"`, `stroke-width="1.5"`, canvas margin `40`.
- Draw an opaque `mask` rect first, then the translucent category rect on top, so routed edges are hidden behind nodes.
- Label baseline: `y + height/2 - 2` when a sublabel exists, else `y + height/2 + 4`. Sublabel at `y + height/2 + 14`, tag at `y + height - 8`.
- Corner radii: node `6`, lifecycle state `7`, lane frame `10`, group frame `9`, `region` boundary `12`, `security-group` boundary `8`, edge-label mask `3`, legend swatch `2.5`.
- Boundary padding: `30px` on top, left, and right, plus `20px` extra at the bottom.
- Elbows are rounded at `8px`; every interior segment is at least `16px`, every segment at least `8px`.
- Optional grid placement: origin `[40, 80]`, 4 columns, cell `130 × 64`, gaps `30 × 40`.

## Edges

| `variant` | Stroke | Dash | Width | Label color |
| --- | --- | --- | --- | --- |
| `default` | arrow `#64748b` | none | 1.5 | text-muted |
| `emphasis` | `#34d399` | none | 1.8 | backend |
| `security` | `#fb7185` | `5,5` | 1.5 | security |
| `dashed` | `#a78bfa` | `4,4` | 1.5 | messagebus |

Arrowhead marker: `markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"`, polygon
`0 0, 10 3.5, 0 7`, filled with the matching variant color.

Every edge label sits on a masked pill: `height="14"`, `rx="3"`,
`width = max(30, textUnits × 4.8 + 10)`, text `font-size="8"`, centered. Clearance rule:
`clear gap > label mask width + 8px`, where mask width ≈ `6.5px × ASCII units + 13px` and a CJK
character counts as two units.

## Frames and Lanes

```
region          rx 12  dashed 8,4  stroke cloud      fill rgba(251,191,36,0.05)
security-group  rx 8   dashed 4,4  stroke security   fill transparent
lane / stage    rx 10  dashed 6,6  stroke #334155    fill rgba(15,23,42,0.22)
```

Lane title is `NN / Label` with `NN` zero-padded from 1, placed at `x + 14`, `y + 22`, dim, weight
600. Exception lanes use the prefix `EX`, the security color, and an inner `security-group` rect
inset by 6px.

## Legend

Mandatory. Swatch `16 × 10`, `rx="2.5"`, swatch-to-text gap `8`, entry gap `22`, line gap `22`.
Rows wrap when they exceed the available width and participate in the computed viewBox height.
List only the kinds present in the spec; legend wording never changes semantics.

## Minimal SVG Scaffold

```html
<svg viewBox="0 0 1000 680" role="img" aria-label="[what the diagram shows]">
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" class="m-default"/>
    </marker>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" class="c-grid" stroke-width="0.5"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid)"/>
  <!-- z-order: boundaries, edges, nodes, edge labels, boundary labels, legend -->
</svg>
```

## Per-Type Layout Bands

- **architecture**: free `pos` or the 4-column grid; 6-12 primary components; boundaries computed from member bounds, never hand-drawn.
- **workflow**: swimlanes × 6 logical columns (`col` 0-5); `phases[]` span columns as header beats; `groups[]` live inside one lane; `lane.variant: "exception"` for retry and fallback paths.
- **sequence**: participants `86 × 54` across the top, time downward; messages at least `28px` apart, arrow span at least `60px`; `emphasis` = main path, `security` = auth, `return` = response, `dashed` = async.
- **dataflow**: 2-5 stages left to right, rows 0-4 for parallel streams; label the data asset (`clickstream`, `normalized facts`), not the transport.
- **lifecycle**: three fixed bands — `main` phase rail, a middle event band, and `terminal`; a recoverable state is `type: "failure"` plus a real transition back, not a note saying "retry".
