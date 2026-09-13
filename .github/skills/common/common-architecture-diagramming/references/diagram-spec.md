# Diagram Spec (v1.2)

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
| `type` | yes | `context`, `container`, `deployment`, `dataflow`, `sequence`, `state`, `erd`. |
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

## Evidence

`evidence` is a `path:line` pointer to the code or document that proves the node exists.
It is stored on the shape as a draw.io custom property, so a reviewer can click a box and
see where it came from. A node **without** evidence renders dashed, orange, and labelled
UNVERIFIED. That is the intended behaviour for a prose brief — never delete the field to
make a diagram look finished.

## Metrics and constraints

`metric` is the one headline number that sized the box or the hop: peak QPS, p99, GB/day,
RPO. It renders as a small line under the label (nodes) or under the protocol (edges), capped
at 48 characters; longer text belongs in the doc. `constraint` is the left side of the
`constraint -> component -> cost` line that justified the node. It is stored as a draw.io
custom property beside `evidence`, so a reviewer can click the box and read why it exists.

Both come from the estimation gate or from measured traffic, never from a guess: a node with
no stated number gets no `metric`. The validator errors above 48 characters and warns, without
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

## Layout

`layer` overrides the inferred row in layered diagrams (`container`, `deployment`, `dataflow`).
Inferred order: people, edge/CDN, services, data stores, external systems. Context diagrams
place people left, the system centre, externals right. State diagrams flow down from `start`.
