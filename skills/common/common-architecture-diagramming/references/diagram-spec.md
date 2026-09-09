# Diagram Spec (v1)

The spec is the only thing you write. `render_drawio.py` turns it into draw.io XML.

## Full example

```json
{
  "title": "eZRx+ — System Context",
  "type": "context",
  "audience": "exec",
  "version": "1.0",
  "date": "2026-09-09",
  "author": "Solution Architecture",
  "scope": "Who uses eZRx+ and which external systems it depends on.",
  "theme": {"accent": "#1E6FD9"},
  "groups": [{"id": "gke", "label": "GKE — per market, per env", "kind": "boundary"}],
  "nodes": [
    {"id": "customer", "label": "Customer", "sublabel": "Pharmacy buyer",
     "kind": "person", "evidence": "docs/ezrx-system-design.md:73"},
    {"id": "order", "label": "Order Engine", "sublabel": "Go", "kind": "container",
     "group": "gke", "layer": 2, "evidence": "datasource/ezrx/order-engine/main.go:1"}
  ],
  "edges": [
    {"from": "customer", "to": "order", "label": "Places order / HTTPS"},
    {"from": "order", "to": "sap", "label": "Syncs order", "style": "async"}
  ]
}
```

## Fields

| Field | Required | Notes |
|---|---|---|
| `title` | yes | Appears in the title block. Name the system and the level. |
| `type` | yes | `context`, `container`, `deployment`, `dataflow`, `sequence`, `state`. |
| `audience` | yes | `exec` (12-node cap) or `tech`. |
| `version`, `date` | yes | A diagram without a date is assumed stale. |
| `scope` | yes | One sentence. What this diagram does and does not cover. |
| `author` | no | Shown in the title block. |
| `theme.accent` | no | Single accent colour. Default `#1E6FD9`. |
| `groups[]` | no | `id`, `label`. Drawn as a dashed boundary box behind its members. |
| `nodes[]` | yes | `id`, `label`, `kind`; optional `sublabel`, `group`, `layer`, `evidence`. |
| `edges[]` | yes | `from`, `to`, `label`; optional `style`. |

## Node kinds

C4: `person`, `system`, `system-ext`, `container`, `component`, `db`, `cache`, `queue`, `saas`.
GCP: `gcp:gke`, `gcp:cloud-sql`, `gcp:pubsub`, `gcp:lb`, `gcp:gcs`, `gcp:memorystore`,
`gcp:cdn`, `gcp:composer`, `gcp:functions`, `gcp:bigquery`.
Sequence: `participant`. State: `start`, `state`, `end`.

Full style strings in [style-catalog.md](style-catalog.md).

## Edge styles

`sync` (default, solid), `async` (dashed — events, queues, CDC), `reverse` (grey — callbacks),
`return` (sequence responses).

## Evidence

`evidence` is a `path:line` pointer to the code or document that proves the node exists.
It is stored on the shape as a draw.io custom property, so a reviewer can click a box and
see where it came from. A node **without** evidence renders dashed, orange, and labelled
UNVERIFIED. That is the intended behaviour for a prose brief — never delete the field to
make a diagram look finished.

## Layout

`layer` overrides the inferred row in layered diagrams (`container`, `deployment`, `dataflow`).
Inferred order: people, edge/CDN, services, data stores, external systems. Context diagrams
place people left, the system centre, externals right. State diagrams flow down from `start`.
