# Diagram Spec (v1.3)

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
     "group": "gke", "layer": 2, "evidence": "datasource/ezrx/order-engine/main.go:1",
     "metric": "12k QPS peak · p99 200ms",
     "constraint": "120k read QPS on a 3k QPS store"}
  ],
  "edges": [
    {"from": "customer", "to": "order", "label": "Places order / HTTPS", "metric": "p99 120ms"},
    {"from": "order", "to": "sap", "label": "Syncs order", "style": "async"}
  ]
}
```

## Fields

| Field | Required | Notes |
|---|---|---|
| `title` | yes | Appears in the title block. Name the system and the level. |
| `type` | yes | `context`, `container`, `component`, `deployment`, `dataflow`, `sequence`, `state`, `erd`. |
| `audience` | yes | `exec` (12-node cap) or `tech`. |
| `version`, `date` | yes | A diagram without a date is assumed stale. |
| `scope` | yes | One sentence. What this diagram does and does not cover. |
| `author` | no | Shown in the title block. |
| `theme.accent` | no | Single accent colour. Default `#1E6FD9`. |
| `groups[]` | no | `id`, `label`. Drawn as a dashed boundary box behind its members. |
| `nodes[]` | yes | `id`, `label`, `kind`; optional `sublabel`, `group`, `layer`, `evidence`, `metric`, `constraint`; `columns[]` on `entity` only. |
| `edges[]` | yes | `from`, `to`, `label`; optional `style`, `metric`, `evidence`; `cardinality` on `erd` only, where `label` is optional. |

## Node kinds

C4: `person`, `system`, `system-ext`, `container`, `component`, `db`, `cache`, `queue`, `saas`.
GCP: `gcp:gke`, `gcp:cloud-sql`, `gcp:pubsub`, `gcp:lb`, `gcp:gcs`, `gcp:memorystore`,
`gcp:cdn`, `gcp:composer`, `gcp:functions`, `gcp:bigquery`.
AWS (official icons): `aws:lambda`, `aws:ec2`, `aws:ecs`, `aws:eks`, `aws:fargate`, `aws:rds`,
`aws:aurora`, `aws:dynamodb`, `aws:elasticache`, `aws:s3`, `aws:sqs`, `aws:sns`, `aws:api-gateway`,
`aws:cloudfront`, `aws:elb`, `aws:kinesis`, `aws:eventbridge`, `aws:route53`, `aws:cloudwatch`,
`aws:cognito`.
Vendor-neutral (any cloud, vendor in `sublabel`): `cloud:compute`, `cloud:serverless`,
`cloud:container-platform`, `cloud:managed-db`, `cloud:cache`, `cloud:object-store`,
`cloud:message-bus`, `cloud:edge`, `cloud:gateway`, `cloud:identity`, `cloud:observability`.
Sequence: `participant`. State: `start`, `state`, `end`. ERD: `entity`.

Full style strings in [style-catalog.md](style-catalog.md).

## Edge styles

`sync` (default, solid), `async` (dashed — events, queues, CDC), `reverse` (grey — callbacks),
`return` (sequence responses).

## Evidence and confidence

`evidence` is an optional `path:line` pointer to the local code or document that supports
the node or edge. It is stored as a draw.io custom property. Provenance metadata is valid for
every diagram type, including ERD entities and relations; it is not a component-only feature.

`evidence_confidence` is independent from lifecycle, and `evidence_kind` records the source:

| `evidence_kind` | Meaning |
|---|---|
| `code` | Source-code citation. |
| `document` | Design, schema, or other document citation. |
| `runtime` | Local runtime observation. |
| `deployment` | Local deployment or operational observation. |

| Confidence | Meaning |
|---|---|
| `unverified` | No supporting artifact is claimed. |
| `assumed` | A design assumption, with no citation yet. |
| `documented` | A cited code or document artifact supports the statement. This is not a runtime observation. |
| `observed` | A captured local runtime, deployment, or operational observation supports the statement. |

For explicit provenance, an item with `unverified` or `assumed` confidence must not carry
`evidence`; a cited item uses `documented` or `observed` and declares `evidence_kind`. Code
citations use `evidence_kind: "code"` with `documented` confidence, never `observed`.
Manifest-participating views additionally capture `evidence_revision` and a `sha256:<64 lowercase
hex>` `evidence_digest`; the manifest checks those captures against allowlisted local source records.
Standalone compact specs may carry citation pointers without provenance metadata, but those
pointers do not establish confidence: the renderer marks those nodes and relationships `UNVERIFIED`.
Every citation identifies a local source and positive line number (`path:line`); URLs are not
citations. Citations are never fetched. A proposed view may explicitly leave `evidence` empty.

## Metrics and constraints

`metric` is the one headline number that sized the box or the hop: peak QPS, p99, GB/day,
RPO. It renders as a small line under the label (nodes) or under the protocol (edges), capped
at 48 characters; longer text belongs in the doc. `constraint` is the left side of the
`constraint -> component -> cost` line that justified the node. It is stored as a draw.io
custom property beside `evidence`, so a reviewer can click the box and read why it exists.

`metric_provenance` is independent of evidence confidence: `target` is a desired bound,
`estimated` is a sizing estimate, and `measured` is a captured measurement. A manifest view
requires this field whenever a metric is present. Both the number and its provenance remain
explicit; no renderer infers a measurement from a citation. The validator warns, without
failing, when a `tech` container, deployment, or dataflow diagram carries no metric at all.

## Entities (type `erd`)

```json
{"id": "orders", "label": "orders", "kind": "entity", "evidence": "db/schema.sql:7",
 "metric": "4M rows · +30k/day",
 "columns": [
   {"name": "id", "type": "uuid", "pk": true},
   {"name": "customer_id", "type": "uuid", "fk": true, "nullable": false},
   {"name": "note", "type": "text"}
 ]}
```

`columns[]` is required on `entity` and forbidden elsewhere; `pk`, `fk`, `nullable` default
to false, false, true. Rows render as `PK id : uuid`, `FK customer_id : uuid`, `note : text ?`.
Every `erd` edge carries a `cardinality`:

| `cardinality` | drawn as |
|---|---|
| `one-to-one` | ‖ — ‖ |
| `one-to-many` | ‖ — crow's foot |
| `many-to-one` | crow's foot — ‖ |
| `many-to-many` | crow's foot — crow's foot |
| `zero-or-one` | ‖ — ○‖ |

Generate the spec from the schema instead of typing it:
`python3 scripts/schema_to_spec.py db/schema.sql --title "Orders — ERD" -o orders-erd.spec.json`
(SQL DDL, Prisma, TypeORM, Django, SQLAlchemy). A referenced table the files never declare
becomes an entity with no evidence and renders UNVERIFIED.
Parsed declarations and relationships carry `evidence_kind: "code"` and
`evidence_confidence: "documented"`; static schema extraction never proves deployment.

## Layout

`layer` overrides the inferred row in layered diagrams (`container`, `component`, `deployment`,
`dataflow`). Inferred order: people, edge/CDN, services, data stores, external systems. Context diagrams
place people left, the system centre, externals right. State diagrams flow down from `start`.

## View contracts and provenance

Any diagram type may supply a `view` contract. A manifest-participating spec must supply all
of these fields; standalone compact specs may omit the contract:

```json
{
  "view": {
    "question": "Which modules own order writes and retries?",
    "decision": "Keep retry policy in the order service.",
    "scenario": "Assumption: payment timeout followed by a duplicate webhook.",
    "invariant": "Assumption: an order is charged at most once.",
    "status": "proposed",
    "evidence": "evidence/component-view.md:3",
    "evidence_kind": "document",
    "omissions": ["deployment health", "runtime failover state"]
  }
}
```

`status` and every node/edge `lifecycle` are independent of evidence: `proposed`,
`implemented`, or `retired`. When the contract is present, every node and edge carries a
canonical `identity`, a lifecycle, an `evidence_confidence`, and, when cited, an
`evidence_kind`. Edges also require a canonical relationship identity. `evidence_confidence`
uses the enum above for all diagram types, including ERD nodes. A node or edge may be `assumed`
or `unverified` without a citation; a citation requires `documented` or `observed`.

Manifest-participating citations additionally require `evidence_revision` and
`evidence_digest`. The manifest allowlists bounded ordinary local source files and checks the
captured revision/digest by source path. It does not fetch URLs, infer runtime state, or treat
code citation as an observation. When a metric is present in a manifest-participating view,
`metric_provenance` is required and renders beside the metric.

`type: "component"` remains a first-class layered view of one container. Its nodes may use
`component`, `db`, `cache`, `queue`, or `saas`; whole `system`, `system-ext`, and `container`
nodes are rejected so levels cannot be mixed.

## Rendering authority

The JSON spec is the semantic authority. `render_drawio.py` owns draw.io presentation and
`export_drawio.py` produces an image copy. Draw.io XML and image exports are not alternate
semantic sources. Output files receive a canonical `data-generated-sha256` baseline. On
regeneration, the writer compares the existing file to its own prior baseline, not to the new
spec render, so ordinary spec changes are safe while hand mutation is preserved and refused.
Use `--acknowledge-manual-edits` only after returning semantic changes to the spec.

The renderer's output path is caller-controlled, not manifest input. Use a trusted ordinary
file in a caller-owned directory, not a symlink or a directory writable by untrusted processes.
The content baseline detects presentation edits; it is not a filesystem authorization boundary.
