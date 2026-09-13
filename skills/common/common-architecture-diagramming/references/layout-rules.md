# Layout Rules

The renderer owns layout. These are the rules it applies, so a reader can predict the
picture from the spec and `check_layout.py` can tell when a rule failed.

## Direction per type

| Type | Flow | Placement |
|---|---|---|
| `context` | left to right | people, the system, externals, in three centred columns |
| `container`, `deployment`, `dataflow` | top to bottom | one row per `layer`: 0 people, 1 edge / CDN / gateway, 2 services, 3 stores, 4 external and cross-cutting |
| `sequence` | left to right, time downward | one column per participant, messages 60 px apart |
| `state` | top to bottom | row = distance from `start` |
| `erd` | left to right | column = foreign-key depth; referenced tables left of referencing ones |

## Grid

- Cell 180 × 90, column step 360 (`CELL_W + MIN_LABEL_GAP`), row gap 76, body starts at y 170.
- The 180 px gap is the smallest that keeps an edge label between two boxes instead of on one.
- Icon kinds (`aws:*`, `gcp:*`) draw their label under a 66 × 58 icon; the layout reserves a
  130 × 110 footprint for them so labels never touch a neighbour or an edge.
- Rows are centred on the widest row. When the spec has `groups`, rows are left-aligned
  instead, grouped nodes come first in each row, and every group claims a column band that
  later nodes are pushed past, so a boundary box never encloses an outsider.
- The row gap widens when one node fans out to several nodes in other rows (22 px per edge),
  so the labels have room.

## Edges

- Boxes in the same row connect side to side. Boxes in different rows leave the bottom and
  enter the top, so the horizontal run happens in the gap between rows, not through a
  same-row neighbour. `check_layout.anchor_sides` is the single source of this rule.
- Every edge that bends inside one row gap gets its own bend height (a slot), whatever its
  source or direction, and its label sits on that middle leg. Straight edges centre theirs.
- An icon's bottom port is pushed below its label block (`exitDy`, `exitPerimeter=0`).
- `erd` relations are side-anchored `entityRelationEdgeStyle` lines with IE arrows.

## What `check_layout.py` catches

- Two node footprints overlapping.
- An edge route crossing a node that is neither endpoint.
- A label point inside a node, or two edge labels landing on each other.
- A group boundary enclosing a node outside the group.

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
