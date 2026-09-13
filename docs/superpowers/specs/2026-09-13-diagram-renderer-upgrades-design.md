# Diagram renderer upgrades (sub-project 2 of the diagramming program)

Date: 2026-09-13. Depends on PR #185 (spec v1.1, single draw.io lane).

## Problem

`common-architecture-diagramming` advertises `erd` as a trigger keyword but cannot draw one.
Cloud kinds are GCP only, so an AWS or Azure system renders as unlabeled grey boxes. The only
layout gate is "look at the PNG"; every defect found so far was invisible in the XML. There is no
golden fixture, so a renderer regression that keeps the XML well-formed goes unnoticed. Layout
rules live as constants in the renderer with a six-line prose summary.

## Scope

Everything under `skills/common/common-architecture-diagramming/` plus the specialist and
CHANGELOG. Folded into the unreleased `common-v2.5.0` and `specialists-v1.5.0` entries; no
version bump because neither has been tagged.

Out of scope: Azure icons (draw.io Desktop ships only the 2014 stencil set), live-database
introspection, Mermaid ERD output, interview coaching (sub-project 3).

## A. Spec v1.2

New diagram type `erd`.

New kind `entity`:

```json
{"id": "orders", "label": "orders", "kind": "entity", "evidence": "db/schema.sql:41",
 "metric": "4M rows · +30k/day",
 "columns": [
   {"name": "id", "type": "uuid", "pk": true},
   {"name": "customer_id", "type": "uuid", "fk": true},
   {"name": "status", "type": "text", "nullable": false}
 ]}
```

`columns[]` is required for `entity` and forbidden on every other kind. `pk`, `fk`, `nullable`
default false, false, true.

New edge field `cardinality`, valid only on `erd`: `one-to-one`, `one-to-many`, `many-to-one`,
`many-to-many`, `zero-or-one`. Missing on an `erd` edge is a validator error. `label` on an
`erd` edge is optional (the relationship name); the validator's unlabeled-edge rule is relaxed
for `erd` because the arrows carry the meaning.

New AWS kinds, style `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.<name>`, every
name verified present in the installed bundle: `aws:lambda`, `aws:ec2`, `aws:ecs`, `aws:eks`,
`aws:fargate`, `aws:rds`, `aws:aurora`, `aws:dynamodb`, `aws:elasticache`, `aws:s3`,
`aws:sqs`, `aws:sns`, `aws:api-gateway`, `aws:cloudfront`, `aws:elb`, `aws:kinesis`,
`aws:eventbridge`, `aws:route53`, `aws:cloudwatch`, `aws:cognito`.

New vendor-neutral kinds for clouds without a trustworthy icon set: `cloud:compute`,
`cloud:serverless`, `cloud:container-platform`, `cloud:managed-db`, `cloud:cache`,
`cloud:object-store`, `cloud:message-bus`, `cloud:edge`, `cloud:gateway`, `cloud:identity`,
`cloud:observability`. Rendered as the matching C4 shape family (box, cylinder, or
direct-data) in a distinct managed fill `#2F6F8F` with stroke `#1F4F66` and white text, so a
reader separates "we run it" (C4 blues) from "a vendor runs it" at a glance; vendor named in
`sublabel` (`"Azure App Service"`). Legend reads, for example,
"Managed database (vendor in label)".

`STYLE_CATALOG`, `DIAGRAM_TYPES`, `EDGE_STYLES`, `EDGE_LEGEND` move to `style_catalog.py`;
`render_drawio.py` re-exports them so existing imports keep working.

## B. Renderer: ERD

`render_erd.py` owns the `erd` type and is called from `render()`.

- Layout: entities in columns by foreign-key depth. An entity with no outgoing FK sits in
  column 0; each referencing entity sits one column right of the deepest entity it references.
  Cycles break at the first edge seen. Rows within a column are stacked and centred, reusing
  `_place_columns`.
- Shape: a `swimlane` header cell (entity name, metric line, UNVERIFIED marker) with one
  `text` child cell per column, `parent` set to the entity id, `childLayout=stackLayout`.
  Row text: `name : type`, prefixed `PK ` or `FK ` when flagged, `?` suffix when nullable.
  Height = header 30 + rows × 22.
- Edges: `edgeStyle=entityRelationEdgeStyle` with `startArrow`/`endArrow` per cardinality:

  | cardinality | startArrow | endArrow |
  |---|---|---|
  | `one-to-one` | `ERmandOne` | `ERmandOne` |
  | `one-to-many` | `ERmandOne` | `ERmany` |
  | `many-to-one` | `ERmany` | `ERmandOne` |
  | `many-to-many` | `ERmany` | `ERmany` |
  | `zero-or-one` | `ERmandOne` | `ERzeroToOne` |

  Label, when present, rendered as today.
- Legend: one "Entity" swatch plus one line per cardinality used.

## C. `check_layout.py`

`render_drawio.layout(spec) -> Layout(boxes, groups)` is split out of `render()` so the
check runs on the same geometry the XML gets.

`check_layout.check(spec, layout) -> list[str]` reports:

1. Two node boxes overlapping.
2. An edge whose approximated orthogonal route (exit side, one bend at the midpoint, entry
   side; the same anchor rule `_anchor_style` uses) passes through a box that is neither
   endpoint.
3. An edge label point (35 % along the route, matching the renderer's `-0.35` offset)
   falling inside any box.
4. A group boundary that contains a node not in the group.

Sequence diagrams skip checks 2 and 3 (messages are horizontal by construction). `erd`
relations are side-anchored like every other edge, so they use the same route approximation.

CLI: `render_drawio.py` prints each finding as `layout: ...` on stderr after writing the
file; `--strict` returns exit code 2 when any finding exists. The specialist runs the renderer
with `--strict` before exporting.

## D. `schema_to_spec.py`

```
python3 schema_to_spec.py db/schema.sql prisma/schema.prisma --title "Orders — ERD" \
    --scope "Order and customer tables" -o docs/architecture/orders-erd.spec.json
```

- Detects format per file: `.sql` → SQL DDL; `.prisma` → Prisma; `.ts` containing
  `@Entity(` → TypeORM; `.py` containing `models.Model` or `declarative_base`/`DeclarativeBase`
  → Django or SQLAlchemy. Anything else is an error naming the four supported formats.
- `schema_parsers/` package, stdlib only:
  - `model.py`: frozen dataclasses `Column(name, type, pk, fk, nullable)`,
    `Entity(name, columns, evidence)`, `Relation(source, target, cardinality, label, evidence)`,
    `ParsedSchema(entities, relations)`.
  - `sql_ddl.py`: `CREATE TABLE` blocks; inline `PRIMARY KEY`, `REFERENCES t(c)`, table-level
    `PRIMARY KEY (...)`, `FOREIGN KEY (...) REFERENCES t(c)`, `NOT NULL`. FK → `many-to-one`.
  - `prisma.py`: `model X { ... }`, `@id`, `@relation(fields: [...], references: [...])`,
    list fields `Y[]` for the inverse side, `?` for nullable. Many-to-many via implicit join
    (both sides `[]`) → `many-to-many`.
  - `typeorm.py`: `@Entity()` classes, `@PrimaryGeneratedColumn`/`@PrimaryColumn`, `@Column`
    with `nullable`, `@ManyToOne`/`@OneToMany`/`@OneToOne`/`@ManyToMany` targets.
  - `django_sqlalchemy.py`: Django `class X(models.Model)` with `models.ForeignKey('Y')`,
    `OneToOneField`, `ManyToManyField`, `primary_key=True`, `null=True`; SQLAlchemy
    `__tablename__`, `Column(..., ForeignKey('y.id'), primary_key=True, nullable=False)`.
- Emits an `erd` spec, audience `tech`, version `1.0`, today's date, `evidence` per entity
  (`path:line` of the declaration) and per relation (line of the FK). Entities referenced
  but never declared are emitted with no columns and no evidence, so they render UNVERIFIED.
- Merges several files into one spec; duplicate entity names across files are an error.

## E. Golden fixtures

`fixtures/<type>.spec.json` and `fixtures/<type>.drawio` for all seven types, plus
`fixtures/schemas/{orders.sql, orders.prisma, orders.entity.ts, orders_models.py}` with
`fixtures/schemas/<name>.expected.json`. `test_fixtures.py` renders or parses each and asserts
byte equality; `UPDATE_GOLDEN=1 python3 test_fixtures.py` rewrites them. The fixtures double
as the runnable examples the skill never had.

## F. Documentation

- New `references/layout-rules.md`: direction per type, grid constants and why, the anchor
  rule, the label offset, what `check_layout` catches and what still needs eyes.
- `diagram-spec.md` → v1.2 (entity, columns, cardinality, aws and cloud kinds).
- `style-catalog.md`: AWS verification recipe, generic kinds, entity shape, new file layout.
- `cloud-architecture.md`: AWS table, generic kinds, "Azure has only 2014 stencils in the
  desktop bundle; use `cloud:*` with the service in `sublabel`".
- `diagram-selection.md`: ERD row and decision-tree step; "Not covered" loses the ERD bullet.
- `checklist.md`: layout check joins the automated list; the eye check stays.
- `SKILL.md`: pipeline gains `schema_to_spec.py` as the entry point for ERDs and `--strict`
  on the render step; triggers gain `entity relationship`, `schema diagram`, `aws`.
- `evals/evals.json`: two cases (ERD from a Prisma schema; AWS deployment diagram).
- Specialist SKILL: step 5 renders with `--strict`; step 6 unchanged.
- CHANGELOG: extend `common-v2.5.0` and `specialists-v1.5.0`.

## Testing

Existing 54 tests stay green. New tests per module: `style_catalog` (every AWS resIcon name
is in the verified list, generic kinds have legends), `render_erd` (column order by FK depth,
row text, cardinality arrows, legend), `check_layout` (each of the four findings on a
hand-built layout, and a clean layout returning nothing), each parser (fixture schema →
expected entities and relations, plus one malformed input), `schema_to_spec` (format
detection, undeclared reference renders UNVERIFIED, duplicate entity error), and the golden
fixture suite. Smoke: render every fixture, export to PNG, look at the ERD and the AWS one.

## Risks

- ERD child cells: draw.io requires row cells to be `parent`ed to the entity and the
  entity to declare `childLayout=stackLayout`; a wrong parent renders rows at the page
  origin. Covered by a fixture and an eye check.
- Regex parsers accept a subset of each language. Each parser documents what it ignores,
  and anything it cannot classify becomes an UNVERIFIED entity rather than a guess.
- Route approximation in `check_layout` is not draw.io's router; false positives are
  possible on dense diagrams. Findings are warnings unless `--strict`.
