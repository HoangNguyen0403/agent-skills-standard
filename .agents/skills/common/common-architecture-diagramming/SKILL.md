---
name: common-architecture-diagramming
description: Draws architecture diagrams as editable draw.io files with a fixed house style, C4 levels, evidence-tagged shapes, and optional multi-view identity checks. Use when producing a system context, container, component, deployment, data flow, sequence, state, or ERD, or redrawing an ASCII or Mermaid one.
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
      - entity relationship
      - schema diagram
      - aws
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

1. Write `spec.json` — schema in [diagram-spec.md](references/diagram-spec.md). For an ERD,
   generate it: `python3 scripts/schema_to_spec.py db/schema.sql --title "<System> — ERD" -o spec.json`
2. `python3 scripts/validate_spec.py spec.json`
3. `python3 scripts/render_drawio.py spec.json -o docs/architecture/<slug>.drawio --strict`
   (exit 2 = a layout finding; change the spec, per [layout-rules.md](references/layout-rules.md))
4. For related views, optionally validate [view-manifest.md](references/view-manifest.md):
   `python3 scripts/validate_manifest.py view-manifest.json`
5. Export the image: a draw.io MCP tool if the session has one, else
   `python3 scripts/export_drawio.py docs/architecture/<slug>.drawio -f png -o docs/architecture/<slug>.png`,
   else ship the `.drawio` and say the image was not exported. See [export paths](references/mermaid-fallback.md).

The JSON spec is the semantic source of truth; `.drawio` is the editable presentation and the
image is a copy for a deck. Generated XML records its own baseline; regeneration protects
manual edits by default. Use `--acknowledge-manual-edits` only after returning semantic changes to the spec.

## Guidelines

- **Name the audience and the decision** before drawing anything.
- **One C4 level per diagram**: context, container, or component, never mixed.
- **Pick the type from the message**, not from habit. See [diagram-selection.md](references/diagram-selection.md).
- **Evidence and confidence are separate.** Code citations are documented evidence, not runtime
  observations; use `assumed` or `unverified` for honest design uncertainty.
- **Put the number on the box.** `metric` carries the load or SLO that sized the node,
  `constraint` says why it exists; never invent either.
- **Label every edge** with its protocol or event; use `style: async` for events.
- **Cloud icons only where verified.** `gcp:*` and `aws:*` are official icons; every other
  vendor is a `cloud:*` kind with the service named in `sublabel`. No Azure logos exist in
  the bundle, so Azure is always `cloud:*`.
- **Exec audience caps at 12 nodes.** Past that, split by level or by flow.
- **Legend and title block are generated.** Do not remove or duplicate them.
- **Refine in the spec, not by mutating generated XML.** Regeneration preserves files with a
  valid own baseline, but refuses hand mutation until explicitly acknowledged.

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

- [Diagram spec](references/diagram-spec.md) · [View manifest](references/view-manifest.md) · [Style catalog](references/style-catalog.md) · [House style](references/house-style.md)
- [Source extraction](references/source-extraction.md) · [Exec readability](references/exec-readability.md)
- [C4 model](references/c4-model.md) · [Cloud](references/cloud-architecture.md) · [Best practices](references/best-practices.md)
- [Layout rules](references/layout-rules.md) · [Checklist](references/checklist.md) · [Export paths and Mermaid fallback](references/mermaid-fallback.md)
- Runnable examples: `assets/fixtures/<type>.spec.json`, one per diagram type, plus schema samples under `assets/fixtures/schemas/`.
- Batch or delegated drawing: `specialist-solution-diagrammer`.
