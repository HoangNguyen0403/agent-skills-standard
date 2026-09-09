---
name: common-architecture-diagramming
description: Draw architecture diagrams as editable draw.io files with a fixed house style, C4 levels, and evidence-tagged shapes. Use when producing a system context, container, deployment, data flow, sequence, or state diagram, or redrawing an ASCII or Mermaid one.
metadata:
  triggers:
    files:
      - "ARCHITECTURE.md"
      - "**/*.drawio"
      - "**/*.mermaid"
      - "docs/architecture/**"
    keywords:
      - diagram
      - c4
      - drawio
      - mermaid
      - erd
      - architecture diagram
      - solution architecture
      - system context
      - deployment diagram
---
# Architecture Diagramming Standard

## **Priority: P1 (HIGH)**

## Pipeline

Never hand-write mxGraph XML. Write a spec; the scripts own every visual decision,
so diagrams stay identical across authors, repositories, and sessions.

1. Write `spec.json` — schema in [diagram-spec.md](references/diagram-spec.md).
2. `python3 scripts/validate_spec.py spec.json`
3. `python3 scripts/render_drawio.py spec.json -o docs/architecture/<slug>.drawio`
4. `python3 scripts/export_drawio.py docs/architecture/<slug>.drawio -f png -o docs/architecture/<slug>.png`

Commit the `.drawio` as the source of truth; the image is a copy for a deck.

## Guidelines

- **Name the audience and the decision** before drawing anything.
- **One C4 level per diagram**: context, container, or component, never mixed.
- **Pick the type from the message**, not from habit. See [diagram-selection.md](references/diagram-selection.md).
- **Evidence per node** as `path:line`. A node with no evidence renders dashed and
  marked UNVERIFIED — leave the flag showing rather than asserting a guess.
- **Label every edge** with its protocol or event; use `style: async` for events.
- **Exec audience caps at 12 nodes.** Past that, split by level or by flow.
- **Legend and title block are generated.** Do not remove or duplicate them.
- **Refine in draw.io, not in XML.** Re-running the renderer overwrites layout tweaks.

## Anti-Patterns

- **No hand-written XML**: Write the spec, run the renderer.
- **No invented boxes**: Omit what the evidence does not support.
- **No mixed levels**: Table columns never appear in a context diagram.
- **No unlabeled arrows**: State the protocol or the event.
- **No mystery acronyms**: Expand every abbreviation on first use.
- **No orphan nodes**: Connect it or cut it.

## Red Flags

| Thought | Reality |
|---------|---------|
| "It is one box, I will write the XML" | The renderer owns style, legend, and title block. Use it. |
| "Close enough, I will guess this service" | Guesses ship as facts. Omit the evidence and let it render UNVERIFIED. |
| "Managers want the whole system on one page" | Past 12 nodes they stop reading. Split it. |

## References

- [Diagram spec](references/diagram-spec.md) · [Style catalog](references/style-catalog.md) · [House style](references/house-style.md)
- [Source extraction](references/source-extraction.md) · [Exec readability](references/exec-readability.md)
- [C4 model](references/c4-model.md) · [Cloud](references/cloud-architecture.md) · [Best practices](references/best-practices.md)
- [Checklist](references/checklist.md) · [Mermaid fallback](references/mermaid-fallback.md)
- Batch or delegated drawing: `specialist-solution-diagrammer`.
