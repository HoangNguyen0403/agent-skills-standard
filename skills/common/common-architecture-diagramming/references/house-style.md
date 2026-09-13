# House Style

The renderer applies all of this. It is written down so reviewers can tell a house-style
diagram from a hand-drawn one, and so the rules survive a rewrite of the script.

## Colour

One family, one accent. Colour carries meaning; it is never decoration.

| Role | Colour |
|---|---|
| The system under discussion | Deep blue `#1061B0` |
| Its containers and components | Mid/pale blue `#23A2D9`, `#63BEF2` |
| Systems someone else owns | Grey-purple `#8C8496` |
| Third-party services | White with grey border |
| Not yet proven | White with orange dashed border `#DD6B20` |
| Accent rule under the title | `theme.accent`, default `#1E6FD9` |

Two consequences worth stating: a reader can tell "ours" from "theirs" without reading a
word, and an unproven box cannot be mistaken for a confirmed one at a glance.

## Type

One family throughout, set by draw.io's default. Title 20px bold, metadata 11px grey,
node labels bold with a 10px bracketed technology sublabel, edge labels 10px on white.

## Lines

| Style | Means |
|---|---|
| Solid, thin arrow | Synchronous call |
| Dashed | Asynchronous, event, queue, CDC |
| Grey | Reverse or callback flow |
| Dashed open arrow | Response, in sequence diagrams only |

Edges leave and enter on the facing side of each box, so a line never crosses a third box.
Labels sit off the midpoint, because on a dog-legged route the midpoint lands on the turn
and the text ends up on top of the box it just left.

## Title block

Every diagram carries: title, one-sentence scope, version, date, author, and an accent rule.
A diagram with no date gets treated as current long after it stops being true, which is how
architecture diagrams quietly become fiction.

## Legend

Generated from what the diagram actually uses — every shape kind present, every line style
present, plus the UNVERIFIED entry only when an unproven node exists. Nothing that is not on
the canvas appears in the legend, and nothing on the canvas is missing from it.

## Spacing

Columns sit 180px apart so a full edge label fits between two boxes. Columns are centred
against each other rather than top-aligned; a hub pinned to the top row drags every edge
into a long dog-leg across the boxes beneath it.
