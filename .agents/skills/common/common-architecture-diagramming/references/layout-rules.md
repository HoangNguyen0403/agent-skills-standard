# Layout Rules

The renderer owns layout. These are the rules it applies, so a reader can predict the
picture from the spec and `check_layout.py` can tell when a rule failed.

## One plan, then draw it

`text_layout.py` plans every measured thing exactly once, and both the renderer and the
checker consume that plan. Nothing re-derives a size or a position from a second estimate.

- **Edge label** (`edge_label_plan`): the wrapped escaped lines, the label rectangle's
  width and height, and the warning line when provenance is unsupported. Ordinary edges
  and ERD relations emit that box on their label geometry; sequence messages emit it at
  the planned row. The checker measures the same rectangle at the same anchor.
- **Sequence messages** (`check_layout.sequence_messages`): one row per message, the
  lifeline x of both ends, and the label rectangle. A row starts below the deepest
  participant, and each step clears the two neighbouring label halves, so a long message
  never lands on its neighbour.
- **Entity** (`entity_plan`): the swimlane header text wrapped to the entity width, the
  header height (`startSize`), and one row per column with the exact wrapped text and the
  row height that text needs. Rows wrap rather than clip.
- **Header** (`plan_header`): title, meta, and view contract as wrapped escaped text with
  their own heights and y offsets, plus the rule y and the body start. `layout()` plans it
  from the drawn content width and uses its body offset, so a long title or contract
  pushes the body down instead of being drawn over it. Group boundary boxes are measured
  too: a group whose label needs room above its members pushes the body further down, so
  it cannot creep into the header.
- **Circle label** (`circle_label_plan`): the label block drawn under a `start`/`end`
  circle, including the `labelWidth`/`labelHeight` the shape is given, so the reserved
  footprint is the emitted one.

Reading an emitted label: a `<br>` is the whitespace at the break, so a consumer that
ignores breaks must put a space there to keep words apart; a token longer than the line
budget is chunked across lines and no character is ever dropped or truncated. Wrap
positions are the plan's, not a pinned constant.

## Direction per type

| Type | Flow | Placement |
|---|---|---|
| `context` | left to right | people, the system, externals, in three centred columns |
| `container`, `deployment`, `dataflow` | top to bottom | one row per `layer`: 0 people, 1 edge / CDN / gateway, 2 services, 3 stores, 4 external and cross-cutting |
| `sequence` | left to right, time downward | one column per participant, messages spaced by their label heights |
| `state` | top to bottom | row = distance from `start` |
| `erd` | left to right | column = foreign-key depth; referenced tables left of referencing ones |

## Grid

- Cell 180 × 90, column step 360 (`CELL_W + MIN_LABEL_GAP`), row gap 76, body starts at y 170.
- The 180 px gap is the smallest that keeps an edge label between two boxes instead of on one.
- Node footprints reserve complete planned text bounds: multiline labels, sublabels,
  metrics, and unverified warnings are derived before route placement. Standard cells
  expand vertically as needed, and icon kinds (`aws:*`, `gcp:*`) reserve room under
  the 66 × 58 icon (at least 130 × 110) so labels never touch neighbours or edge routes.
- Rows are centred on the widest row. When the spec has `groups`, rows are left-aligned
  instead, grouped nodes come first in each row, and every group claims a column band that
  later nodes are pushed past, so a boundary box never encloses an outsider.
- The row gap widens when edges cross between rows (22 px per edge, expanding until the
  planned label rectangles fit their slots), so labels have room.
- An `erd` entity's swimlane header is as tall as its wrapped header text needs, and that
  text is wrapped at the single font size the swimlane label draws
  (`text_layout.ENTITY_HEADER_FONT`, also written into the style), so the reserved width
  is the drawn width. Each column row is as tall as its wrapped `name : type` text needs;
  rows wrap instead of being clipped. An `end` circle is a hollow double ring and a `start`
  circle is a filled disc, so the terminal state is distinguishable from the initial one in
  both themes.

## Edges

- Boxes in the same row connect side to side. Boxes in different rows leave the bottom and
  enter the top, so the horizontal run happens in the gap between rows, not through a
  same-row neighbour. `check_layout.anchor_sides` is the single source of this rule.
- Every edge that bends inside one row gap gets its own bend height (a slot), whatever its
  source or direction, and its label sits on that middle leg. Straight edges centre theirs.
- An icon's bottom port is pushed below its label block (`exitDy`, `exitPerimeter=0`).
- `erd` relations are orthogonal lines with IE-notation arrows, pinned to the same ports
  and waypoints `check_layout.plan_routes` produces, with the label at
  `check_layout.label_fraction`; the drawn route is the checked route.

## What `check_layout.py` catches

- Two node footprints overlapping.
- An edge route crossing a node that is neither endpoint.
- An edge label rectangle inside a node, two edge labels landing on each other, or an
  unrelated route crossing a label.
- Two sequence message labels landing on each other, or a message label reaching a
  participant's expanded footprint.
- A group boundary enclosing a node outside the group, or reaching into the header.
- A node or group overlapping the planned header / view contract.

Run it through `render_drawio.py --strict`; exit code 2 means fix the spec, never the
renderer. The fixes that work:

- **Edge spans two rows** (crosses the row between): give the target a `layer` next to its
  source, or split the diagram.
- **Hub in the middle of a row** whose same-row neighbour gets crossed: list the nodes so the
  ones that talk to each other are adjacent; row order follows spec order.
- **Too many nodes in one row**: split by C4 level or by flow.

## What still needs eyes

Text overflow inside a box, icon legibility at export scale, and whether the diagram answers
its one question. The checklist's last item stays.
