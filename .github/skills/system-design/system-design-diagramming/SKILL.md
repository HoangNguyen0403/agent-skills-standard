---
name: system-design-diagramming
description: "Draw system diagrams in the Archify visual language: a typed JSON spec rendered as dark-canvas SVG with numbered lanes, semantic node colors, masked edge labels, and a legend. Covers architecture, workflow, sequence, dataflow, and lifecycle views. Use for any design-session diagram."
metadata:
  triggers:
    keywords:
      - archify
      - diagram
      - architecture diagram
      - sequence diagram
      - data flow diagram
      - lifecycle diagram
      - swimlane
      - draw the system
---

# System Diagramming (Archify Style)

## **Priority: P1 (HIGH)**

Author a typed JSON spec, then render. Never hand-place pixels in prose, and never ship Mermaid as the deliverable.

## Pick One Type

| Type | Use for |
| --- | --- |
| `architecture` | Components, services, cloud and trust boundaries |
| `workflow` | Processes, approval gates, runbooks, CI/CD |
| `sequence` | Call chains, request lifecycles, async traces |
| `dataflow` | Pipelines, ETL, lineage, consumers |
| `lifecycle` | State transitions, retries, terminal states |

One type per diagram. A design doc usually needs `architecture` plus one of `sequence` or `dataflow`.

## Render Path

1. Check whether the Archify skill is installed (`archify/SKILL.md` under any agent skills directory).
2. **Installed**: author the JSON against its `schemas/<type>.schema.json`, then run `archify validate <type> <file>.json` after every edit and `archify deliver` once at the end. A non-zero exit is never a success.
3. **Not installed**: emit inline SVG directly, following [the style contract](references/archify-style.md). Same tokens, same geometry, same legend rules.
4. Either way the spec is the source of truth: nodes carry `id`, `type`, `label`, optional `sublabel` and `tag`; edges carry `from`, `to`, `label`, `variant`; groups list the ids they `wrap`.

## Semantics Are Colors

- Node `type` is meaning, not decoration: `frontend`, `backend`, `database`, `cloud`, `security`, `messagebus`, `external`.
- Edge `variant` is meaning: `default` plain call, `emphasis` main request path, `security` auth or policy hop, `dashed` async or event.
- Never introduce a color outside that map, and never inline a literal hex that breaks dark/light parity.
- Group frames come in two kinds only: `region` for deployment or ownership, `security-group` for a trust boundary.

## Composition Rules

- One left-to-right main path; side branches leave the nearest main-path node.
- At most 12 primary nodes. Split the view before crowding it.
- Number every lane or stage as `01 / Label`, in order.
- Every edge carries a label unless both endpoints already imply the protocol, direction, and sync behavior.
- Spacing means **clear gap**, not center distance: leave more than the label mask width plus 8px.
- Legend is mandatory and lists only the kinds actually present.

## Repair Order

Fix in this sequence, one diagnosed control at a time: schema errors, then node overlap or out-of-range placement, then edges crossing an opaque node, then ambiguous corridors and crossings, then label clearance.

## Anti-Patterns

- **No Mermaid deliverable**: read Mermaid for topology if given, then author fresh in this format.
- **No edge through an unrelated node**: always a hard failure, never an acceptable trade.
- **No label deleted to fix geometry**: labels are data; reroute instead.
- **No decorative accent**: every saturated color maps to a node or relationship meaning.
- **No coordinates planned in prose**: write the spec, render, then read the diagnostics.

## References

- [Archify Style Contract](references/archify-style.md) - tokens, geometry, SVG scaffold, per-type layout bands
