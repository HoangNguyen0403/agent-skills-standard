# Diagram Renderer Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `common-architecture-diagramming` an ERD type generated from schema files, AWS and vendor-neutral cloud kinds, an automated layout check, golden fixtures, and a written layout-rules reference.

**Architecture:** `render_drawio.py` stays the orchestrator but sheds its catalogue into `style_catalog.py`, its ERD rendering into `render_erd.py`, and its geometry into a `layout()` function that `check_layout.py` consumes. `schema_to_spec.py` is a CLI over a `schema_parsers/` package of four regex parsers sharing frozen dataclasses. Golden fixtures pin the XML of every diagram type.

**Tech Stack:** Python 3 stdlib only (`re`, `json`, `dataclasses`, `xml.etree`, `unittest`). No third-party imports anywhere under `scripts/`.

**Spec:** `docs/superpowers/specs/2026-09-13-diagram-renderer-upgrades-design.md`

## Global Constraints

- Every script under `skills/common/common-architecture-diagramming/scripts/` is stdlib-only Python 3; no `pip` dependencies.
- Existing 54 tests in `test_render_drawio.py` must stay green after every task.
- `render_drawio.STYLE_CATALOG`, `DIAGRAM_TYPES`, `EDGE_STYLES`, `EDGE_LEGEND` remain importable from `render_drawio` (tests and `validate_spec.py` import them there).
- AWS style string form: `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.<name>`; every `<name>` must be one verified present in the draw.io Desktop bundle (list in Task 1).
- Managed-cloud fill `#2F6F8F`, stroke `#1F4F66`, white text.
- Cardinality → arrow mapping is exactly: `one-to-one` ERmandOne/ERmandOne, `one-to-many` ERmandOne/ERmany, `many-to-one` ERmany/ERmandOne, `many-to-many` ERmany/ERmany, `zero-or-one` ERmandOne/ERzeroToOne.
- `metric` cap 48 chars, unchanged.
- Version handling: extend the unreleased `common-v2.5.0` and `specialists-v1.5.0` CHANGELOG entries; do not bump `skills/metadata.json` versions.
- Run tests with: `python3 -m unittest discover -s skills/common/common-architecture-diagramming/scripts -p 'test_*.py'`. Delete `scripts/__pycache__` before `pnpm generate-indices`.
- Commit messages end with the two attribution lines used on this branch (`Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01Syp1r29csWEJpssYviqxgc`).

All paths below are relative to `skills/common/common-architecture-diagramming/` unless they start with `docs/`, `skills/specialists/`, or `CHANGELOG.md`.

---

## File Structure

| File | Responsibility |
|---|---|
| `scripts/style_catalog.py` (new) | `STYLE_CATALOG`, `DIAGRAM_TYPES`, `EDGE_STYLES`, `EDGE_LEGEND`, `ER_ARROWS`, `CARDINALITIES`, colour constants. Pure data. |
| `scripts/render_drawio.py` (modify) | Orchestrator: `layout(spec)`, `render(spec)`, shared cell helpers, CLI with `--strict`. Re-exports catalogue names. |
| `scripts/render_erd.py` (new) | `layout_erd(nodes, edges)`, `render_erd_nodes(...)`, `render_erd_edges(...)`, `erd_legend_entries(...)`. |
| `scripts/check_layout.py` (new) | `check(spec, layout) -> list[str]`, four geometric findings. |
| `scripts/validate_spec.py` (modify) | `entity`/`columns`/`cardinality` rules. |
| `scripts/schema_parsers/__init__.py` (new) | `detect_format(path, text)`, `PARSERS` registry. |
| `scripts/schema_parsers/model.py` (new) | Frozen dataclasses `Column`, `Entity`, `Relation`, `ParsedSchema`, plus `SchemaParseError`. |
| `scripts/schema_parsers/sql_ddl.py`, `prisma.py`, `typeorm.py`, `django_sqlalchemy.py` (new) | `parse(text, path) -> ParsedSchema` each. |
| `scripts/schema_to_spec.py` (new) | CLI: files → `erd` spec JSON. |
| `scripts/test_render_drawio.py` (modify) | Existing suite + AWS/cloud/ERD renderer and validator tests. |
| `scripts/test_check_layout.py`, `scripts/test_schema_parsers.py`, `scripts/test_schema_to_spec.py`, `scripts/test_fixtures.py` (new) | Per-module suites. |
| `fixtures/*.spec.json`, `fixtures/*.drawio`, `fixtures/schemas/*` (new) | Golden inputs and outputs. |
| `references/layout-rules.md` (new), other references, `SKILL.md`, `evals/evals.json`, specialist SKILL, `CHANGELOG.md` (modify) | Documentation. |

---

### Task 1: Extract `style_catalog.py`, add AWS and generic cloud kinds

**Files:**
- Create: `scripts/style_catalog.py`
- Modify: `scripts/render_drawio.py` (delete the catalogue block, lines `_C4_EDGE` through `EDGE_LEGEND`; import instead)
- Test: `scripts/test_render_drawio.py`

**Interfaces:**
- Produces: `style_catalog.STYLE_CATALOG: dict[str, dict]` (keys `style`, `w`, `h`, `legend`, `layer`); `DIAGRAM_TYPES: tuple` now includes `"erd"`; `EDGE_STYLES`, `EDGE_LEGEND`; `AWS_ICONS: dict[str, str]` kind-suffix → resIcon name; `CLOUD_KINDS: tuple[str, ...]`; `MANAGED_FILL = "#2F6F8F"`, `MANAGED_STROKE = "#1F4F66"`; `_C4_EDGE`, `INK`, `MUTED`, `WARN`, `WARN_TEXT`. `render_drawio` re-exports all of them via `from style_catalog import *`-style explicit imports.

- [ ] **Step 1: Write the failing tests** (append to `TestRendererCommon` in `test_render_drawio.py`)

```python
    def test_aws_kinds_use_verified_resource_icons(self):
        verified = {
            "lambda", "ec2", "ecs", "eks", "fargate", "rds", "aurora", "dynamodb",
            "elasticache", "s3", "sqs", "sns", "api_gateway", "cloudfront",
            "elastic_load_balancing", "kinesis", "eventbridge", "route_53", "cloudwatch",
            "cognito",
        }
        aws = {k: v for k, v in render_drawio.STYLE_CATALOG.items() if k.startswith("aws:")}
        self.assertEqual(len(aws), 20)
        for kind, entry in aws.items():
            self.assertIn("shape=mxgraph.aws4.resourceIcon;", entry["style"], kind)
            icon = entry["style"].split("resIcon=mxgraph.aws4.")[1].split(";")[0]
            self.assertIn(icon, verified, kind)
            self.assertTrue(entry["legend"], kind)

    def test_cloud_kinds_render_managed_fill_and_vendor_sublabel(self):
        spec = container_spec()
        spec["nodes"][2] = {"id": "db", "label": "Orders DB", "kind": "cloud:managed-db",
                            "sublabel": "Azure SQL", "group": "gcp", "evidence": "docs/a.md:12"}
        root = parse(render_drawio.render(spec))
        self.assertIn("fillColor=#2F6F8F", style_of(root, "db"))
        self.assertIn("shape=cylinder3", style_of(root, "db"))
        self.assertIn("[Azure SQL]", value_of(root, "db"))
        self.assertIn("Managed database (vendor in label)", all_values(root))

    def test_every_cloud_kind_has_managed_fill(self):
        cloud = {k: v for k, v in render_drawio.STYLE_CATALOG.items() if k.startswith("cloud:")}
        self.assertEqual(len(cloud), 11)
        for kind, entry in cloud.items():
            self.assertIn("fillColor=#2F6F8F", entry["style"], kind)
            self.assertIn("vendor in label", entry["legend"], kind)

    def test_catalog_is_importable_from_style_catalog_module(self):
        import style_catalog
        self.assertIs(style_catalog.STYLE_CATALOG, render_drawio.STYLE_CATALOG)
        self.assertIn("erd", style_catalog.DIAGRAM_TYPES)
```

- [ ] **Step 2: Run to verify they fail**

Run: `python3 -m unittest test_render_drawio.TestRendererCommon -v 2>&1 | tail -8` (from the `scripts/` dir)
Expected: 4 failures/errors (`No module named 'style_catalog'`, `len(aws) == 0`).

- [ ] **Step 3: Create `scripts/style_catalog.py`** by moving the block from `render_drawio.py` (everything from `INK = ...` through the `EDGE_LEGEND` dict, including `_C4_EDGE`, `_GCP`, `_gcp`, `STYLE_CATALOG`, the `STYLE_CATALOG[...]["layer"]` overrides, `DIAGRAM_TYPES`, `EDGE_STYLES`, `NODE_PROPERTIES`, `EDGE_LEGEND`) and appending:

```python
DIAGRAM_TYPES = ("context", "container", "deployment", "dataflow", "sequence", "state", "erd")

MANAGED_FILL = "#2F6F8F"
MANAGED_STROKE = "#1F4F66"

# Verified against the mxgraph.aws4 stencil names shipped in draw.io Desktop.
AWS_ICONS = {
    "lambda": "lambda", "ec2": "ec2", "ecs": "ecs", "eks": "eks", "fargate": "fargate",
    "rds": "rds", "aurora": "aurora", "dynamodb": "dynamodb", "elasticache": "elasticache",
    "s3": "s3", "sqs": "sqs", "sns": "sns", "api-gateway": "api_gateway",
    "cloudfront": "cloudfront", "elb": "elastic_load_balancing", "kinesis": "kinesis",
    "eventbridge": "eventbridge", "route53": "route_53", "cloudwatch": "cloudwatch",
    "cognito": "cognito",
}
_AWS_LEGEND = {
    "lambda": "AWS Lambda", "ec2": "Amazon EC2", "ecs": "Amazon ECS", "eks": "Amazon EKS",
    "fargate": "AWS Fargate", "rds": "Amazon RDS", "aurora": "Amazon Aurora",
    "dynamodb": "Amazon DynamoDB", "elasticache": "Amazon ElastiCache", "s3": "Amazon S3",
    "sqs": "Amazon SQS", "sns": "Amazon SNS", "api-gateway": "Amazon API Gateway",
    "cloudfront": "Amazon CloudFront", "elb": "Elastic Load Balancing",
    "kinesis": "Amazon Kinesis", "eventbridge": "Amazon EventBridge",
    "route53": "Amazon Route 53", "cloudwatch": "Amazon CloudWatch", "cognito": "Amazon Cognito",
}
_AWS_LAYER = {"cloudfront": 1, "elb": 1, "route53": 1, "api-gateway": 1,
              "lambda": 2, "ec2": 2, "ecs": 2, "eks": 2, "fargate": 2,
              "cloudwatch": 4, "cognito": 4}
_AWS = ("sketch=0;points=[[0,0,0],[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0,0],[0,1,0],"
        "[0.25,1,0],[0.5,1,0],[0.75,1,0],[1,1,0],[0,0.25,0],[0,0.5,0],[0,0.75,0],"
        "[1,0.25,0],[1,0.5,0],[1,0.75,0]];outlineConnect=0;fontColor=#232F3E;"
        "fillColor=#ED7100;strokeColor=#ffffff;dashed=0;verticalLabelPosition=bottom;"
        "verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;"
        "shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.%s;")

for _suffix, _icon in AWS_ICONS.items():
    STYLE_CATALOG["aws:" + _suffix] = {
        "style": _AWS % _icon, "w": 66, "h": 58,
        "legend": _AWS_LEGEND[_suffix], "layer": _AWS_LAYER.get(_suffix, 3),
    }

_MANAGED_BOX = ("rounded=1;whiteSpace=wrap;html=1;fontSize=11;labelBackgroundColor=none;"
                "fillColor=%s;fontColor=#ffffff;align=center;arcSize=10;strokeColor=%s"
                % (MANAGED_FILL, MANAGED_STROKE))
_MANAGED_CYL = ("shape=cylinder3;size=15;whiteSpace=wrap;html=1;boundedLbl=1;rounded=0;"
                "labelBackgroundColor=none;fillColor=%s;fontSize=12;fontColor=#ffffff;"
                "align=center;strokeColor=%s" % (MANAGED_FILL, MANAGED_STROKE))
_MANAGED_QUEUE = ("shape=mxgraph.flowchart.direct_data;whiteSpace=wrap;html=1;"
                  "fillColor=%s;fontColor=#ffffff;strokeColor=%s;align=center"
                  % (MANAGED_FILL, MANAGED_STROKE))

# (kind suffix, style, w, h, legend noun, layer)
_CLOUD = (
    ("compute", _MANAGED_BOX, 180, 80, "Managed compute", 2),
    ("serverless", _MANAGED_BOX, 180, 80, "Managed serverless functions", 2),
    ("container-platform", _MANAGED_BOX, 180, 80, "Managed container platform", 2),
    ("managed-db", _MANAGED_CYL, 140, 90, "Managed database", 3),
    ("cache", _MANAGED_CYL, 140, 90, "Managed cache", 3),
    ("object-store", _MANAGED_CYL, 140, 90, "Managed object storage", 3),
    ("message-bus", _MANAGED_QUEUE, 160, 80, "Managed message bus", 3),
    ("edge", _MANAGED_BOX, 180, 80, "Managed edge / CDN", 1),
    ("gateway", _MANAGED_BOX, 180, 80, "Managed API gateway / load balancer", 1),
    ("identity", _MANAGED_BOX, 180, 80, "Managed identity provider", 4),
    ("observability", _MANAGED_BOX, 180, 80, "Managed observability", 4),
)
CLOUD_KINDS = tuple("cloud:" + c[0] for c in _CLOUD)
for _suffix, _style, _w, _h, _noun, _layer in _CLOUD:
    STYLE_CATALOG["cloud:" + _suffix] = {
        "style": _style, "w": _w, "h": _h,
        "legend": "%s (vendor in label)" % _noun, "layer": _layer,
    }
```

Add a module docstring: `"""Shape catalogue for the draw.io renderer. Pure data; no rendering logic."""`.

- [ ] **Step 4: Replace the moved block in `render_drawio.py` with**

```python
from style_catalog import (  # noqa: F401  (re-exported for validate_spec and tests)
    AWS_ICONS, CLOUD_KINDS, DIAGRAM_TYPES, EDGE_LEGEND, EDGE_STYLES, INK, MUTED,
    NODE_PROPERTIES, STYLE_CATALOG, WARN, WARN_TEXT, _C4_EDGE,
)
```

Keep the layout constants (`MIN_LABEL_GAP` … `DEFAULT_ACCENT`) in `render_drawio.py`. Update the module docstring's pointer to mention `style_catalog.py`.

- [ ] **Step 5: Run the full suite**

Run: `python3 -m unittest discover -s scripts -p 'test_*.py' 2>&1 | tail -2`
Expected: `Ran 58 tests`, `OK`.

- [ ] **Step 6: Commit**

```bash
git add scripts/style_catalog.py scripts/render_drawio.py scripts/test_render_drawio.py
git commit -m "feat(common): style catalogue module with AWS and vendor-neutral cloud kinds"
```

---

### Task 2: Validator rules for `erd`, `entity`, `columns`, `cardinality`

**Files:**
- Modify: `scripts/validate_spec.py`
- Modify: `scripts/style_catalog.py` (add `CARDINALITIES`, `ER_ARROWS`, and the `entity` catalogue entry)
- Test: `scripts/test_render_drawio.py` (`TestValidator`)

**Interfaces:**
- Produces: `style_catalog.CARDINALITIES = ("one-to-one", "one-to-many", "many-to-one", "many-to-many", "zero-or-one")`; `style_catalog.ER_ARROWS: dict[str, tuple[str, str]]` cardinality → (startArrow, endArrow); `STYLE_CATALOG["entity"]` with `style`, `w=200`, `h=30` (header only; rows add height), `legend="Entity (table)"`, `layer=2`.
- `validate(spec)` gains rules: (a) kind `entity` requires non-empty `columns` list, each with `name` and `type` strings; (b) `columns` on a non-entity kind is an error; (c) `entity` allowed only when `type == "erd"`, and an `erd` spec must contain at least one `entity`; (d) every `erd` edge needs `cardinality` in `CARDINALITIES`; `cardinality` on a non-erd spec is an error; (e) the unlabeled-edge error is skipped for `erd`.

- [ ] **Step 1: Add a fixture and failing tests** (in `test_render_drawio.py`, module level then `TestValidator`)

```python
def erd_spec(**overrides):
    spec = {
        "title": "Orders — ERD", "type": "erd", "audience": "tech", "version": "1.0",
        "date": "2026-09-13", "author": "Test", "scope": "Order tables.",
        "nodes": [
            {"id": "customers", "label": "customers", "kind": "entity",
             "evidence": "db/schema.sql:1",
             "columns": [{"name": "id", "type": "uuid", "pk": True},
                         {"name": "email", "type": "text", "nullable": False}]},
            {"id": "orders", "label": "orders", "kind": "entity",
             "evidence": "db/schema.sql:8", "metric": "4M rows",
             "columns": [{"name": "id", "type": "uuid", "pk": True},
                         {"name": "customer_id", "type": "uuid", "fk": True},
                         {"name": "note", "type": "text"}]},
        ],
        "edges": [
            {"from": "orders", "to": "customers", "cardinality": "many-to-one",
             "label": "placed by"},
        ],
    }
    spec.update(overrides)
    return spec
```

```python
    def test_valid_erd_spec_has_no_errors(self):
        self.assertEqual(validate_spec.validate(erd_spec()), [])

    def test_entity_without_columns_is_reported(self):
        spec = erd_spec()
        spec["nodes"][0]["columns"] = []
        self.assertIn("columns", " ".join(validate_spec.validate(spec)))

    def test_column_without_name_or_type_is_reported(self):
        spec = erd_spec()
        spec["nodes"][0]["columns"] = [{"name": "id"}]
        self.assertIn("type", " ".join(validate_spec.validate(spec)))

    def test_columns_on_non_entity_kind_is_reported(self):
        spec = container_spec()
        spec["nodes"][0]["columns"] = [{"name": "x", "type": "int"}]
        self.assertIn("columns", " ".join(validate_spec.validate(spec)))

    def test_entity_outside_erd_type_is_reported(self):
        spec = container_spec()
        spec["nodes"].append({"id": "t", "label": "t", "kind": "entity", "evidence": "a:1",
                              "columns": [{"name": "id", "type": "int"}]})
        spec["edges"].append({"from": "api", "to": "t", "label": "SQL"})
        self.assertIn("erd", " ".join(validate_spec.validate(spec)))

    def test_erd_edge_without_cardinality_is_reported(self):
        spec = erd_spec()
        del spec["edges"][0]["cardinality"]
        self.assertIn("cardinality", " ".join(validate_spec.validate(spec)))

    def test_unknown_cardinality_lists_known_values(self):
        spec = erd_spec()
        spec["edges"][0]["cardinality"] = "lots"
        errors = " ".join(validate_spec.validate(spec))
        self.assertIn("one-to-many", errors)

    def test_cardinality_on_non_erd_spec_is_reported(self):
        spec = container_spec()
        spec["edges"][0]["cardinality"] = "one-to-many"
        self.assertIn("cardinality", " ".join(validate_spec.validate(spec)))

    def test_erd_edge_without_label_is_allowed(self):
        spec = erd_spec()
        del spec["edges"][0]["label"]
        self.assertEqual(validate_spec.validate(spec), [])

    def test_erd_without_entities_is_reported(self):
        spec = erd_spec()
        spec["nodes"] = [{"id": "a", "label": "A", "kind": "container", "evidence": "x:1"}]
        spec["edges"] = []
        self.assertIn("entity", " ".join(validate_spec.validate(spec)))
```

- [ ] **Step 2: Run to verify they fail**

Run: `python3 -m unittest test_render_drawio.TestValidator -v 2>&1 | tail -4`
Expected: failures mention `unknown kind 'entity'` and missing error strings.

- [ ] **Step 3: Add to `style_catalog.py`**

```python
CARDINALITIES = ("one-to-one", "one-to-many", "many-to-one", "many-to-many", "zero-or-one")
ER_ARROWS = {
    "one-to-one": ("ERmandOne", "ERmandOne"),
    "one-to-many": ("ERmandOne", "ERmany"),
    "many-to-one": ("ERmany", "ERmandOne"),
    "many-to-many": ("ERmany", "ERmany"),
    "zero-or-one": ("ERmandOne", "ERzeroToOne"),
}
ENTITY_HEADER_H = 30
ENTITY_ROW_H = 22
STYLE_CATALOG["entity"] = {
    "style": ("swimlane;fontStyle=1;childLayout=stackLayout;horizontal=1;startSize=%d;"
              "horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;"
              "collapsible=0;marginBottom=0;html=1;whiteSpace=wrap;fillColor=#1061B0;"
              "fontColor=#ffffff;strokeColor=#0D5091;fontSize=12;" % ENTITY_HEADER_H),
    "w": 200, "h": ENTITY_HEADER_H, "legend": "Entity (table)", "layer": 2,
}
ENTITY_ROW_STYLE = ("text;strokeColor=#9AA5B1;fillColor=#ffffff;align=left;verticalAlign=middle;"
                    "spacingLeft=6;spacingRight=6;overflow=hidden;rotatable=0;points=[[0,0.5],"
                    "[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;fontColor=#1F2933;")
```

- [ ] **Step 4: Implement in `validate_spec.py`**

Import `CARDINALITIES` from `render_drawio` (which re-exports it after you add it to the import list in `render_drawio.py`). Add:

```python
def _validate_entity(node, diagram_type):
    node_id = node.get("id")
    is_entity = node.get("kind") == "entity"
    columns = node.get("columns")
    errors = []
    if is_entity and diagram_type != "erd":
        errors.append("node %s is an entity but the diagram type is %r; entities belong to "
                      "type 'erd'" % (node_id, diagram_type))
    if is_entity and not columns:
        errors.append("entity %s has no columns; list at least one {name, type}" % node_id)
    if not is_entity and columns:
        errors.append("node %s has columns but is not an entity" % node_id)
    for column in columns or []:
        if not column.get("name") or not column.get("type"):
            errors.append("entity %s has a column without name or type: %r" % (node_id, column))
    return errors
```

Call `errors += _validate_entity(node, spec.get("type"))` inside the node loop of `_validate_nodes` (pass `spec.get("type")`; the function already receives `spec`). In `_validate_edges`, change the signature to `_validate_edges(spec, nodes, edges)`, update the call site, and replace the unlabeled-edge block with:

```python
        is_erd = spec.get("type") == "erd"
        if not is_erd and not edge.get("label"):
            errors.append(...)  # existing message unchanged
        cardinality = edge.get("cardinality")
        if is_erd and cardinality not in CARDINALITIES:
            errors.append("edge %s -> %s needs a cardinality; known values: %s"
                          % (source, target, ", ".join(CARDINALITIES)))
        if not is_erd and cardinality:
            errors.append("edge %s -> %s has a cardinality but the diagram is not an erd"
                          % (source, target))
```

In `_validate_type_rules` add: `if diagram_type == "erd" and "entity" not in kinds: return ["erd diagrams need at least one node of kind 'entity'"]`.

- [ ] **Step 5: Run the full suite**

Run: `python3 -m unittest discover -s scripts -p 'test_*.py' 2>&1 | tail -2`
Expected: `Ran 68 tests`, `OK`.

- [ ] **Step 6: Commit**

```bash
git add scripts/style_catalog.py scripts/validate_spec.py scripts/render_drawio.py scripts/test_render_drawio.py
git commit -m "feat(common): validate entity, columns and cardinality for erd specs"
```

---

### Task 3: `render_erd.py` and the `erd` render path

**Files:**
- Create: `scripts/render_erd.py`
- Modify: `scripts/render_drawio.py` (`render()`, `_render_legend`)
- Test: `scripts/test_render_drawio.py` (new class `TestErdRenderer`)

**Interfaces:**
- Consumes from `render_drawio`: `_place_columns(columns) -> dict[id, (x, y)]`, `_label_html(node)`, `_unverified_style(style)`, `_geometry(parent, x, y, w, h)`, `_text_cell(...)`, `NODE_PROPERTIES`, `MUTED`, `_C4_EDGE`. To avoid a circular import, `render_erd` imports these lazily inside functions (`from render_drawio import ...`) or `render_drawio` passes them; use lazy import.
- Produces: `render_erd.entity_height(node) -> int` = `ENTITY_HEADER_H + ENTITY_ROW_H * len(columns)`; `render_erd.layout_erd(nodes, edges) -> dict[id, (x, y)]`; `render_erd.render_entities(root, nodes, placed)`; `render_erd.render_relations(root, edges, boxes)`; `render_erd.legend_entries(edges) -> list[tuple[str, str]]` of (edge style string, legend text).
- `render_drawio.render()` routes `type == "erd"` through these and adds the cardinality legend lines.

- [ ] **Step 1: Write failing tests**

```python
class TestErdRenderer(unittest.TestCase):
    def geom(self, root, cell_id):
        g = cell_by_id(root, cell_id).find("mxGeometry")
        return float(g.get("x")), float(g.get("y")), float(g.get("width")), float(g.get("height"))

    def test_referenced_entity_sits_left_of_referencing_entity(self):
        root = parse(render_drawio.render(erd_spec()))
        self.assertLess(self.geom(root, "customers")[0], self.geom(root, "orders")[0])

    def test_entity_rows_are_children_of_the_entity(self):
        root = parse(render_drawio.render(erd_spec()))
        rows = [c for c in cells(root) if c.get("parent") == "orders"]
        self.assertEqual(len(rows), 3)
        texts = [c.get("value") for c in rows]
        self.assertEqual(texts[0], "PK id : uuid")
        self.assertEqual(texts[1], "FK customer_id : uuid")
        self.assertEqual(texts[2], "note : text ?")

    def test_entity_height_grows_with_columns(self):
        root = parse(render_drawio.render(erd_spec()))
        self.assertEqual(self.geom(root, "orders")[3], 30 + 3 * 22)
        self.assertEqual(self.geom(root, "customers")[3], 30 + 2 * 22)

    def test_relation_carries_er_arrows_for_cardinality(self):
        root = parse(render_drawio.render(erd_spec()))
        edge = [c for c in cells(root) if c.get("source") == "orders"][0]
        self.assertIn("edgeStyle=entityRelationEdgeStyle", edge.get("style"))
        self.assertIn("startArrow=ERmany", edge.get("style"))
        self.assertIn("endArrow=ERmandOne", edge.get("style"))
        self.assertEqual(edge.get("value"), "placed by")

    def test_legend_names_entity_and_each_cardinality_used(self):
        text = all_values(parse(render_drawio.render(erd_spec())))
        self.assertIn("Entity (table)", text)
        self.assertIn("many-to-one", text)

    def test_entity_metric_and_unverified_render_in_header(self):
        spec = erd_spec()
        del spec["nodes"][1]["evidence"]
        root = parse(render_drawio.render(spec))
        self.assertIn("4M rows", value_of(root, "orders"))
        self.assertIn("UNVERIFIED", value_of(root, "orders"))
        self.assertIn("dashed=1", style_of(root, "orders"))

    def test_fk_cycle_does_not_hang_layout(self):
        spec = erd_spec()
        spec["nodes"][0]["columns"].append({"name": "last_order_id", "type": "uuid", "fk": True})
        spec["edges"].append({"from": "customers", "to": "orders", "cardinality": "zero-or-one"})
        root = parse(render_drawio.render(spec))
        self.assertIsNotNone(cell_by_id(root, "orders"))
```

- [ ] **Step 2: Run to verify they fail**

Run: `python3 -m unittest test_render_drawio.TestErdRenderer 2>&1 | tail -3`
Expected: errors (`erd` currently falls to `_layout_layered`, rows missing, arrows missing).

- [ ] **Step 3: Create `scripts/render_erd.py`**

```python
#!/usr/bin/env python3
"""Entity-relationship rendering for the draw.io pipeline.

Entities are swimlane cells whose children are one text row per column; relations use
draw.io's entityRelationEdgeStyle with IE-notation arrows chosen by cardinality.
"""

import xml.etree.ElementTree as ET

from style_catalog import (ENTITY_HEADER_H, ENTITY_ROW_H, ENTITY_ROW_STYLE, ER_ARROWS,
                           MUTED, STYLE_CATALOG, _C4_EDGE)

ENTITY_W = STYLE_CATALOG["entity"]["w"]


def entity_height(node):
    return ENTITY_HEADER_H + ENTITY_ROW_H * len(node.get("columns") or [])


def _depths(nodes, edges):
    """Column index per entity: referenced tables left, referencing tables right."""
    ids = [n["id"] for n in nodes]
    outgoing = {}
    for edge in edges:
        outgoing.setdefault(edge["from"], []).append(edge["to"])
    depth = {}

    def visit(node_id, trail):
        if node_id in depth:
            return depth[node_id]
        if node_id in trail:          # cycle: break at the first edge seen
            return 0
        targets = outgoing.get(node_id, [])
        value = 0 if not targets else 1 + max(visit(t, trail | {node_id}) for t in targets)
        depth[node_id] = value
        return value

    for node_id in ids:
        visit(node_id, frozenset())
    return depth


def layout_erd(nodes, edges):
    from render_drawio import _place_columns
    depth = _depths(nodes, edges)
    columns = {}
    for node in nodes:
        kind = dict(STYLE_CATALOG["entity"], h=entity_height(node))
        columns.setdefault(depth[node["id"]], []).append((node, kind))
    return _place_columns(columns)


def _row_text(column):
    prefix = "PK " if column.get("pk") else "FK " if column.get("fk") else ""
    suffix = " ?" if column.get("nullable", True) and not column.get("pk") else ""
    return "%s%s : %s%s" % (prefix, column["name"], column["type"], suffix)


def render_entities(root, nodes, placed):
    from render_drawio import NODE_PROPERTIES, _geometry, _label_html, _unverified_style
    for node in nodes:
        x, y = placed[node["id"]]
        style = STYLE_CATALOG["entity"]["style"]
        if not node.get("evidence"):
            style = _unverified_style(style)
        attrs = {"style": style, "vertex": "1", "parent": "1"}
        label = _label_html(node)
        props = {key: node[key] for key in NODE_PROPERTIES if node.get(key)}
        if props:
            holder = ET.SubElement(root, "object", dict({"id": node["id"], "label": label}, **props))
            cell = ET.SubElement(holder, "mxCell", attrs)
        else:
            attrs.update({"id": node["id"], "value": label})
            cell = ET.SubElement(root, "mxCell", attrs)
        _geometry(cell, x, y, ENTITY_W, entity_height(node))
        for index, column in enumerate(node.get("columns") or []):
            row = ET.SubElement(root, "mxCell", {
                "id": "%s__row_%d" % (node["id"], index), "value": _row_text(column),
                "style": ENTITY_ROW_STYLE, "vertex": "1", "parent": node["id"],
            })
            _geometry(row, 0, ENTITY_HEADER_H + index * ENTITY_ROW_H, ENTITY_W, ENTITY_ROW_H)


def relation_style(cardinality):
    start, end = ER_ARROWS[cardinality]
    base = _C4_EDGE.replace("edgeStyle=orthogonalEdgeStyle", "edgeStyle=entityRelationEdgeStyle")
    base = base.replace("endArrow=blockThin;", "")
    return base + "startArrow=%s;endArrow=%s;startFill=0;endFill=0;" % (start, end)


def render_relations(root, edges):
    from render_drawio import _edge_value
    for index, edge in enumerate(edges):
        cell = ET.SubElement(root, "mxCell", {
            "id": "_rel_%d" % index, "value": _edge_value(edge),
            "style": relation_style(edge["cardinality"]), "edge": "1", "parent": "1",
            "source": edge["from"], "target": edge["to"],
        })
        ET.SubElement(cell, "mxGeometry", {"relative": "1", "as": "geometry"})


def legend_entries(edges):
    seen, entries = set(), []
    for edge in edges:
        card = edge["cardinality"]
        if card not in seen:
            seen.add(card)
            entries.append((relation_style(card), card))
    return entries
```

Note the `_shape_cell` duplication in `render_entities`: after the tests pass, refactor `render_drawio._shape_cell` to accept an optional `size=(w, h)` and `style` override and call it from `render_entities` instead of repeating the holder logic (REFACTOR step below).

- [ ] **Step 4: Wire into `render_drawio.render()`**

Replace the layout dispatch and body with:

```python
    if spec["type"] == "erd":
        placed = render_erd.layout_erd(nodes, edges)
    elif spec["type"] == "context":
        ...  # unchanged
    boxes = {}
    for node in nodes:
        x, y = placed[node["id"]]
        kind = _kind(node)
        h = render_erd.entity_height(node) if node["kind"] == "entity" else kind["h"]
        boxes[node["id"]] = (x, y, kind["w"], h)
    ...
    if spec["type"] == "erd":
        render_erd.render_entities(root, nodes, placed)
    else:
        for node in nodes:
            x, y = placed[node["id"]]
            _shape_cell(root, node, x, y)

    if spec["type"] == "sequence":
        bottom = _render_sequence_body(root, nodes, edges, placed)
    elif spec["type"] == "erd":
        render_erd.render_relations(root, edges)
        bottom = max(y + h for _, y, _, h in boxes.values())
    else:
        _render_edges(root, spec, edges, boxes)
        bottom = max(y + h for _, y, _, h in boxes.values())
```

Add `import render_erd` at the top. In `_render_legend`, the edge-style loop currently keys on `EDGE_STYLES[style]`; change it to build `edge_entries` as a list of `(style_string, label)`: for non-erd specs `[(EDGE_STYLES[s], EDGE_LEGEND[s]) for s in edge_styles]`, for erd specs `render_erd.legend_entries(edges)`; pass `spec` (already available) and branch on `spec["type"] == "erd"`.

- [ ] **Step 5: Run the full suite**

Run: `python3 -m unittest discover -s scripts -p 'test_*.py' 2>&1 | tail -2`
Expected: `Ran 75 tests`, `OK`.

- [ ] **Step 6: Refactor**: extract the holder logic from `_shape_cell` into `_node_cell(root, node, style, x, y, w, h)` in `render_drawio.py`, call it from both `_shape_cell` and `render_erd.render_entities`. Re-run the suite: still 75 OK.

- [ ] **Step 7: Smoke by eye**

```bash
python3 -c "
import json,sys; sys.path.insert(0,'scripts'); import test_render_drawio as t
json.dump(t.erd_spec(), open('/tmp/erd.json','w'))"
python3 scripts/render_drawio.py /tmp/erd.json -o /tmp/erd.drawio
python3 scripts/export_drawio.py /tmp/erd.drawio -f png -o /tmp/erd.png
```

Open `/tmp/erd.png`: rows must sit inside their entity, arrows must show crow's-foot on the `orders` end.

- [ ] **Step 8: Commit**

```bash
git add scripts/render_erd.py scripts/render_drawio.py scripts/test_render_drawio.py
git commit -m "feat(common): erd diagram type with entity rows and IE-notation relations"
```

---

### Task 4: `layout()` extraction, `check_layout.py`, `--strict`

**Files:**
- Modify: `scripts/render_drawio.py` (split `layout()` out of `render()`, CLI flag)
- Create: `scripts/check_layout.py`
- Test: `scripts/test_check_layout.py`

**Interfaces:**
- Produces: `render_drawio.Layout` (a `dataclass(frozen=True)` with `boxes: dict[str, tuple[int, int, int, int]]` and `groups: dict[str, tuple[int, int, int, int]]`); `render_drawio.layout(spec) -> Layout`; `render_drawio.render(spec)` unchanged externally; `render_drawio.group_box(members_boxes) -> (x0, y0, x1, y1)` extracted from `_render_groups` so both the renderer and `layout()` compute the same rectangle.
- `check_layout.check(spec, layout) -> list[str]`; `check_layout.route(source_box, target_box) -> list[tuple[float, float]]` (polyline of 2 or 3 points); `check_layout.label_point(points) -> tuple[float, float]`.
- CLI: `render_drawio.py spec.json -o out.drawio [--strict]`; prints `layout: <finding>` lines to stderr; exit 2 when `--strict` and findings exist.

- [ ] **Step 1: Write failing tests** (`scripts/test_check_layout.py`)

```python
import os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import check_layout
import render_drawio
from test_render_drawio import container_spec, context_spec, erd_spec


def layout_of(boxes, groups=None):
    return render_drawio.Layout(boxes=boxes, groups=groups or {})


class TestRoute(unittest.TestCase):
    def test_horizontal_neighbours_route_straight(self):
        pts = check_layout.route((0, 0, 100, 50), (300, 0, 100, 50))
        self.assertEqual(pts, [(100.0, 25.0), (300.0, 25.0)])

    def test_diagonal_route_bends_twice_at_the_midpoint(self):
        pts = check_layout.route((0, 0, 100, 50), (300, 200, 100, 50))
        self.assertEqual(len(pts), 4)
        self.assertEqual(pts[1][0], pts[2][0])
        self.assertEqual(pts[0], (100.0, 25.0))
        self.assertEqual(pts[-1], (300.0, 225.0))

    def test_label_point_is_35_percent_along(self):
        self.assertEqual(check_layout.label_point([(0.0, 0.0), (100.0, 0.0)]), (35.0, 0.0))


class TestFindings(unittest.TestCase):
    def spec(self):
        return {"type": "container", "nodes": [{"id": "a"}, {"id": "b"}, {"id": "c"}],
                "edges": [{"from": "a", "to": "b"}], "groups": []}

    def test_overlapping_boxes_are_reported(self):
        lay = layout_of({"a": (0, 0, 100, 50), "b": (50, 20, 100, 50), "c": (500, 500, 10, 10)})
        findings = check_layout.check(self.spec(), lay)
        self.assertTrue(any("overlap" in f and "a" in f and "b" in f for f in findings))

    def test_edge_through_third_box_is_reported(self):
        lay = layout_of({"a": (0, 0, 100, 50), "b": (400, 0, 100, 50), "c": (200, 0, 100, 50)})
        findings = check_layout.check(self.spec(), lay)
        self.assertTrue(any("a -> b" in f and "c" in f for f in findings))

    def test_label_over_box_is_reported(self):
        # route runs y=25 from x=100 to x=400; the 35 % point is x=205, inside c
        lay = layout_of({"a": (0, 0, 100, 50), "b": (400, 0, 100, 50), "c": (190, 0, 30, 50)})
        findings = check_layout.check(self.spec(), lay)
        self.assertTrue(any("label" in f for f in findings))

    def test_group_swallowing_non_member_is_reported(self):
        spec = self.spec()
        spec["groups"] = [{"id": "g"}]
        spec["nodes"][0]["group"] = "g"
        lay = layout_of({"a": (0, 0, 100, 50), "b": (10, 10, 20, 20), "c": (900, 0, 10, 10)},
                        groups={"g": (-30, -46, 130, 80)})
        findings = check_layout.check(spec, lay)
        self.assertTrue(any("group g" in f and "b" in f for f in findings))

    def test_clean_layout_has_no_findings(self):
        lay = layout_of({"a": (0, 0, 100, 50), "b": (400, 0, 100, 50), "c": (0, 300, 100, 50)})
        self.assertEqual(check_layout.check(self.spec(), lay), [])


class TestRendererIntegration(unittest.TestCase):
    def test_fixture_specs_pass_the_layout_check(self):
        for spec in (context_spec(), container_spec(), erd_spec()):
            self.assertEqual(check_layout.check(spec, render_drawio.layout(spec)), [], spec["type"])

    def test_sequence_skips_edge_checks(self):
        spec = {"type": "sequence", "nodes": [{"id": "u"}, {"id": "w"}], "edges": [{"from": "u", "to": "w"}]}
        lay = layout_of({"u": (0, 0, 160, 50), "w": (0, 0, 160, 50)})
        findings = check_layout.check(spec, lay)
        self.assertTrue(all("->" not in f for f in findings))

    def test_layout_boxes_match_rendered_geometry(self):
        spec = container_spec()
        lay = render_drawio.layout(spec)
        import xml.etree.ElementTree as ET
        root = ET.fromstring(render_drawio.render(spec))
        for node_id, (x, y, w, h) in lay.boxes.items():
            g = root.find(".//object[@id='%s']/mxCell/mxGeometry" % node_id)
            if g is None:
                g = root.find(".//mxCell[@id='%s']/mxGeometry" % node_id)
            self.assertEqual((float(g.get("x")), float(g.get("y"))), (float(x), float(y)), node_id)
```

- [ ] **Step 2: Run to verify they fail**

Run: `python3 -m unittest test_check_layout 2>&1 | tail -3`
Expected: `ModuleNotFoundError: check_layout` / `AttributeError: Layout`.

- [ ] **Step 3: Extract `layout()` in `render_drawio.py`**

```python
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Layout:
    boxes: dict
    groups: dict = field(default_factory=dict)


def group_box(member_boxes):
    pad_x, pad_top, pad_bottom = 30, 46, 30
    x0 = min(b[0] for b in member_boxes) - pad_x
    y0 = min(b[1] for b in member_boxes) - pad_top
    x1 = max(b[0] + b[2] for b in member_boxes) + pad_x
    y1 = max(b[1] + b[3] for b in member_boxes) + pad_bottom
    return int(x0), int(y0), int(x1 - x0), int(y1 - y0)


def _place(spec, nodes, edges):
    if spec["type"] == "erd":
        return render_erd.layout_erd(nodes, edges)
    if spec["type"] == "context":
        return _layout_context(nodes)
    if spec["type"] == "sequence":
        return _layout_sequence(nodes)
    if spec["type"] == "state":
        return _layout_state(nodes, edges)
    return _layout_layered(nodes)


def layout(spec):
    """Geometry only: where every node and group box lands. render() draws exactly this."""
    if spec.get("type") not in DIAGRAM_TYPES:
        raise SpecError("unknown diagram type %r. Known types: %s"
                        % (spec.get("type"), ", ".join(DIAGRAM_TYPES)))
    nodes = spec.get("nodes") or []
    if not nodes:
        raise SpecError("spec has no nodes")
    edges = spec.get("edges") or []
    placed = _place(spec, nodes, edges)
    boxes = {}
    for node in nodes:
        x, y = placed[node["id"]]
        kind = _kind(node)
        h = render_erd.entity_height(node) if node["kind"] == "entity" else kind["h"]
        boxes[node["id"]] = (x, y, kind["w"], h)
    groups = {}
    for group in spec.get("groups") or []:
        members = [boxes[n["id"]] for n in nodes if n.get("group") == group["id"]]
        if members:
            groups[group["id"]] = group_box(members)
    return Layout(boxes=boxes, groups=groups)
```

`render()` then calls `lay = layout(spec)` and uses `lay.boxes` / `placed = {k: (x, y) for k, (x, y, _, _) in lay.boxes.items()}`; `_render_groups(root, spec, lay)` draws `lay.groups[group_id]` instead of recomputing. Delete the inline padding math from `_render_groups`.

- [ ] **Step 4: Create `scripts/check_layout.py`**

```python
#!/usr/bin/env python3
"""Geometric lint for a rendered layout: the defects the XML hides and the PNG shows.

Usage from render_drawio.py (automatic) or:
    python3 check_layout.py spec.json
"""

import argparse
import json
import sys

LABEL_OFFSET = 0.35   # matches the -0.35 relative label geometry in render_drawio


def _centre(box):
    x, y, w, h = box
    return x + w / 2.0, y + h / 2.0


def route(source_box, target_box):
    """Exit the facing side, bend once at the midpoint, enter the facing side."""
    sx, sy, sw, sh = source_box
    tx, ty, tw, th = target_box
    scx, scy = _centre(source_box)
    tcx, tcy = _centre(target_box)
    dx, dy = tcx - scx, tcy - scy
    if abs(dx) >= abs(dy):
        start = (float(sx + sw), scy) if dx >= 0 else (float(sx), scy)
        end = (float(tx), tcy) if dx >= 0 else (float(tx + tw), tcy)
        if start[1] == end[1]:
            return [start, end]
        mid_x = (start[0] + end[0]) / 2.0
        return [start, (mid_x, start[1]), (mid_x, end[1]), end]
    start = (scx, float(sy + sh)) if dy >= 0 else (scx, float(sy))
    end = (tcx, float(ty)) if dy >= 0 else (tcx, float(ty + th))
    if start[0] == end[0]:
        return [start, end]
    mid_y = (start[1] + end[1]) / 2.0
    return [start, (start[0], mid_y), (end[0], mid_y), end]


def label_point(points):
    total = sum(_dist(points[i], points[i + 1]) for i in range(len(points) - 1))
    target = total * LABEL_OFFSET
    for a, b in zip(points, points[1:]):
        seg = _dist(a, b)
        if target <= seg:
            t = 0 if seg == 0 else target / seg
            return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
        target -= seg
    return points[-1]


def _dist(a, b):
    return abs(b[0] - a[0]) + abs(b[1] - a[1])   # routes are axis-aligned


def _inside(point, box, margin=0):
    x, y, w, h = box
    return (x - margin) < point[0] < (x + w + margin) and (y - margin) < point[1] < (y + h + margin)


def _overlap(a, b):
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    return ax < bx + bw and bx < ax + aw and ay < by + bh and by < ay + ah


def _segment_crosses(a, b, box):
    """Axis-aligned segment a-b against box, ignoring touches at the box edge."""
    x, y, w, h = box
    if a[0] == b[0]:                       # vertical
        lo, hi = sorted((a[1], b[1]))
        return x < a[0] < x + w and lo < y + h and hi > y
    lo, hi = sorted((a[0], b[0]))          # horizontal
    return y < a[1] < y + h and lo < x + w and hi > x


def check(spec, layout):
    findings = []
    boxes = layout.boxes
    ids = list(boxes)
    for i, a in enumerate(ids):
        for b in ids[i + 1:]:
            if _overlap(boxes[a], boxes[b]):
                findings.append("nodes %s and %s overlap" % (a, b))
    if spec.get("type") != "sequence":
        for edge in spec.get("edges") or []:
            src, dst = edge["from"], edge["to"]
            if src not in boxes or dst not in boxes:
                continue
            if spec.get("type") == "erd":
                points = [_centre(boxes[src]), _centre(boxes[dst])]
                points = [points[0], (points[1][0], points[0][1]), points[1]]
            else:
                points = route(boxes[src], boxes[dst])
            for third in ids:
                if third in (src, dst):
                    continue
                if any(_segment_crosses(p, q, boxes[third]) for p, q in zip(points, points[1:])):
                    findings.append("edge %s -> %s crosses node %s" % (src, dst, third))
            lp = label_point(points)
            for node_id in ids:
                if node_id not in (src, dst) and _inside(lp, boxes[node_id]):
                    findings.append("label of edge %s -> %s sits on node %s" % (src, dst, node_id))
    members = {}
    for node in spec.get("nodes") or []:
        if node.get("group"):
            members.setdefault(node["group"], set()).add(node["id"])
    for group_id, gbox in layout.groups.items():
        for node_id in ids:
            if node_id not in members.get(group_id, set()) and _overlap(gbox, boxes[node_id]):
                findings.append("group %s encloses non-member node %s" % (group_id, node_id))
    return findings


def main(argv=None):
    parser = argparse.ArgumentParser(description="Check a spec's layout for visual defects.")
    parser.add_argument("spec")
    args = parser.parse_args(argv)
    import render_drawio
    with open(args.spec, encoding="utf-8") as handle:
        spec = json.load(handle)
    findings = check(spec, render_drawio.layout(spec))
    for finding in findings:
        sys.stderr.write("layout: %s\n" % finding)
    sys.stderr.write("layout OK\n" if not findings else "%d layout finding(s)\n" % len(findings))
    return 2 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 5: Wire the CLI in `render_drawio.main()`**

```python
    parser.add_argument("--strict", action="store_true",
                        help="exit 2 when the layout check reports a finding")
    ...
    try:
        lay = layout(spec)
        xml = render(spec)
    except SpecError as error: ...
    # write xml as today, then:
    import check_layout
    findings = check_layout.check(spec, lay)
    for finding in findings:
        sys.stderr.write("layout: %s\n" % finding)
    if findings and args.strict:
        sys.stderr.write("%d layout finding(s); fix the spec or drop --strict\n" % len(findings))
        return 2
    return 0
```

- [ ] **Step 6: Run everything**

Run: `python3 -m unittest discover -s scripts -p 'test_*.py' 2>&1 | tail -2`
Expected: `Ran 87 tests`, `OK`. Also `python3 scripts/render_drawio.py /tmp/erd.json -o /tmp/erd.drawio --strict; echo $?` → `0`.

- [ ] **Step 7: Commit**

```bash
git add scripts/check_layout.py scripts/render_drawio.py scripts/test_check_layout.py
git commit -m "feat(common): layout() geometry API and check_layout with --strict render gate"
```

---

### Task 5: `schema_parsers` package: model and SQL DDL parser

**Files:**
- Create: `scripts/schema_parsers/__init__.py`, `scripts/schema_parsers/model.py`, `scripts/schema_parsers/sql_ddl.py`
- Create: `fixtures/schemas/orders.sql`
- Test: `scripts/test_schema_parsers.py`

**Interfaces:**
- `model.Column(name: str, type: str, pk: bool = False, fk: bool = False, nullable: bool = True)`
- `model.Entity(name: str, columns: tuple[Column, ...], evidence: str)`
- `model.Relation(source: str, target: str, cardinality: str, label: str, evidence: str)`
- `model.ParsedSchema(entities: tuple[Entity, ...], relations: tuple[Relation, ...])`
- `model.SchemaParseError(ValueError)`
- `sql_ddl.parse(text: str, path: str) -> ParsedSchema`
- `schema_parsers.detect_format(path, text) -> str` returning `"sql" | "prisma" | "typeorm" | "django_sqlalchemy"` or raising `SchemaParseError`; `schema_parsers.PARSERS: dict[str, callable]` (filled in by Tasks 6–8).

- [ ] **Step 1: Write the fixture** `fixtures/schemas/orders.sql`

```sql
CREATE TABLE customers (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  name text
);

CREATE TABLE orders (
  id uuid PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES customers(id),
  status text NOT NULL,
  placed_at timestamptz NOT NULL
);

CREATE TABLE order_items (
  order_id uuid NOT NULL,
  sku text NOT NULL,
  qty integer NOT NULL,
  PRIMARY KEY (order_id, sku),
  FOREIGN KEY (order_id) REFERENCES orders (id)
);
```

- [ ] **Step 2: Write failing tests** (`scripts/test_schema_parsers.py`)

```python
import os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from schema_parsers import detect_format, PARSERS
from schema_parsers.model import Column, Entity, Relation, SchemaParseError
from schema_parsers import sql_ddl

FIX = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "fixtures", "schemas")


def read(name):
    with open(os.path.join(FIX, name), encoding="utf-8") as h:
        return h.read()


class TestSqlDdl(unittest.TestCase):
    def setUp(self):
        self.schema = sql_ddl.parse(read("orders.sql"), "fixtures/schemas/orders.sql")
        self.by_name = {e.name: e for e in self.schema.entities}

    def test_three_tables_found_with_declaration_lines(self):
        self.assertEqual(sorted(self.by_name), ["customers", "order_items", "orders"])
        self.assertEqual(self.by_name["customers"].evidence, "fixtures/schemas/orders.sql:1")
        self.assertEqual(self.by_name["orders"].evidence, "fixtures/schemas/orders.sql:7")

    def test_inline_primary_key_and_not_null(self):
        cols = {c.name: c for c in self.by_name["customers"].columns}
        self.assertTrue(cols["id"].pk)
        self.assertFalse(cols["email"].nullable)
        self.assertTrue(cols["name"].nullable)
        self.assertEqual(cols["email"].type, "text")

    def test_inline_references_marks_fk_and_relation(self):
        cols = {c.name: c for c in self.by_name["orders"].columns}
        self.assertTrue(cols["customer_id"].fk)
        rel = [r for r in self.schema.relations if r.source == "orders"][0]
        self.assertEqual((rel.target, rel.cardinality), ("customers", "many-to-one"))
        self.assertEqual(rel.evidence, "fixtures/schemas/orders.sql:9")

    def test_table_level_primary_and_foreign_keys(self):
        cols = {c.name: c for c in self.by_name["order_items"].columns}
        self.assertTrue(cols["order_id"].pk and cols["sku"].pk)
        self.assertTrue(cols["order_id"].fk)
        self.assertNotIn("PRIMARY", cols)
        rel = [r for r in self.schema.relations if r.source == "order_items"][0]
        self.assertEqual(rel.target, "orders")

    def test_text_without_create_table_is_an_error(self):
        with self.assertRaises(SchemaParseError):
            sql_ddl.parse("SELECT 1;", "x.sql")


class TestDetect(unittest.TestCase):
    def test_extension_and_content_sniffing(self):
        self.assertEqual(detect_format("a.sql", ""), "sql")
        self.assertEqual(detect_format("schema.prisma", ""), "prisma")
        self.assertEqual(detect_format("user.entity.ts", "@Entity()\nclass User {}"), "typeorm")
        self.assertEqual(detect_format("models.py", "class A(models.Model): pass"), "django_sqlalchemy")
        self.assertEqual(detect_format("models.py", "Base = declarative_base()"), "django_sqlalchemy")

    def test_unknown_format_names_the_supported_ones(self):
        with self.assertRaises(SchemaParseError) as ctx:
            detect_format("readme.md", "# hi")
        self.assertIn("prisma", str(ctx.exception))

    def test_registry_has_all_four_parsers(self):
        self.assertEqual(set(PARSERS), {"sql", "prisma", "typeorm", "django_sqlalchemy"})
```

(The registry test fails until Task 8; that is expected and noted in each task's expected count.)

- [ ] **Step 3: Run to verify failure**

Run: `python3 -m unittest test_schema_parsers 2>&1 | tail -3`
Expected: `ModuleNotFoundError: schema_parsers`.

- [ ] **Step 4: Create `model.py`**

```python
"""Shared, immutable shapes every schema parser produces."""

from __future__ import annotations

from dataclasses import dataclass


class SchemaParseError(ValueError):
    """The input is not a schema this parser understands."""


@dataclass(frozen=True)
class Column:
    name: str
    type: str
    pk: bool = False
    fk: bool = False
    nullable: bool = True


@dataclass(frozen=True)
class Entity:
    name: str
    columns: tuple
    evidence: str


@dataclass(frozen=True)
class Relation:
    source: str
    target: str
    cardinality: str
    label: str
    evidence: str


@dataclass(frozen=True)
class ParsedSchema:
    entities: tuple
    relations: tuple


def line_of(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1
```

- [ ] **Step 5: Create `sql_ddl.py`**

```python
"""CREATE TABLE parser: enough DDL to draw an ERD, nothing more.

Understands: column lines with an inline PRIMARY KEY / NOT NULL / REFERENCES t(c);
table-level PRIMARY KEY (...) and FOREIGN KEY (...) REFERENCES t (c). Ignores indexes,
constraints it does not recognise, and everything outside CREATE TABLE.
"""

from __future__ import annotations

import re

from .model import Column, Entity, ParsedSchema, Relation, SchemaParseError, line_of

_TABLE = re.compile(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`\"]?(\w+)[`\"]?\s*\((.*?)\)\s*;",
                    re.IGNORECASE | re.DOTALL)
_INLINE_REF = re.compile(r"REFERENCES\s+[`\"]?(\w+)[`\"]?\s*\(", re.IGNORECASE)
_TABLE_PK = re.compile(r"PRIMARY\s+KEY\s*\(([^)]*)\)", re.IGNORECASE)
_TABLE_FK = re.compile(r"FOREIGN\s+KEY\s*\(([^)]*)\)\s*REFERENCES\s+[`\"]?(\w+)[`\"]?", re.IGNORECASE)
_CONSTRAINT_START = re.compile(r"^\s*(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|INDEX|KEY)\b",
                               re.IGNORECASE)


def _split_top_level(body: str):
    parts, depth, current = [], 0, []
    for ch in body:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append("".join(current))
            current = []
        else:
            current.append(ch)
    if "".join(current).strip():
        parts.append("".join(current))
    return parts


def parse(text: str, path: str) -> ParsedSchema:
    entities, relations = [], []
    for match in _TABLE.finditer(text):
        table, body = match.group(1), match.group(2)
        table_line = line_of(text, match.start())
        body_start = match.start(2)
        columns, pk_names, fk_names = [], set(), set()
        cursor = body_start
        for raw in _split_top_level(body):
            raw_offset = text.find(raw, cursor)
            cursor = raw_offset + len(raw)
            piece_offset = raw_offset + (len(raw) - len(raw.lstrip()))
            piece = raw.strip()
            if not piece:
                continue
            if _CONSTRAINT_START.match(piece):
                pk = _TABLE_PK.search(piece)
                if pk:
                    pk_names.update(n.strip(' `"') for n in pk.group(1).split(","))
                fk = _TABLE_FK.search(piece)
                if fk:
                    fk_names.update(n.strip(' `"') for n in fk.group(1).split(","))
                    relations.append(Relation(table, fk.group(2), "many-to-one", "",
                                              "%s:%d" % (path, line_of(text, piece_offset))))
                continue
            tokens = piece.split()
            name, ctype = tokens[0].strip('`"'), tokens[1] if len(tokens) > 1 else "?"
            upper = piece.upper()
            ref = _INLINE_REF.search(piece)
            if ref:
                relations.append(Relation(table, ref.group(1), "many-to-one", "",
                                          "%s:%d" % (path, line_of(text, piece_offset))))
            columns.append(Column(
                name=name, type=ctype.rstrip(","),
                pk="PRIMARY KEY" in upper, fk=ref is not None,
                nullable="NOT NULL" not in upper and "PRIMARY KEY" not in upper,
            ))
        columns = tuple(
            Column(c.name, c.type, c.pk or c.name in pk_names, c.fk or c.name in fk_names,
                   c.nullable and c.name not in pk_names) for c in columns)
        entities.append(Entity(table, columns, "%s:%d" % (path, table_line)))
    if not entities:
        raise SchemaParseError("%s: no CREATE TABLE statement found" % path)
    return ParsedSchema(tuple(entities), tuple(relations))
```

- [ ] **Step 6: Create `__init__.py`**

```python
"""Schema file parsers feeding schema_to_spec.py. Each exposes parse(text, path)."""

from __future__ import annotations

import re

from .model import SchemaParseError

SUPPORTED = ("sql", "prisma", "typeorm", "django_sqlalchemy")


def detect_format(path: str, text: str) -> str:
    lower = path.lower()
    if lower.endswith(".sql"):
        return "sql"
    if lower.endswith(".prisma"):
        return "prisma"
    if lower.endswith(".ts") and re.search(r"@Entity\s*\(", text):
        return "typeorm"
    if lower.endswith(".py") and re.search(r"models\.Model|declarative_base|DeclarativeBase", text):
        return "django_sqlalchemy"
    raise SchemaParseError("%s: not a supported schema file (supported: %s)"
                           % (path, ", ".join(SUPPORTED)))


def _registry():
    from . import sql_ddl
    parsers = {"sql": sql_ddl.parse}
    for name, module in (("prisma", "prisma"), ("typeorm", "typeorm"),
                         ("django_sqlalchemy", "django_sqlalchemy")):
        try:
            parsers[name] = __import__("schema_parsers.%s" % module, fromlist=["parse"]).parse
        except ImportError:
            pass
    return parsers


PARSERS = _registry()
```

- [ ] **Step 7: Run**

Run: `python3 -m unittest test_schema_parsers 2>&1 | tail -3`
Expected: all `TestSqlDdl` and detect tests pass; only `test_registry_has_all_four_parsers` fails (parsers arrive in Tasks 6–8).

- [ ] **Step 8: Commit**

```bash
git add scripts/schema_parsers fixtures/schemas/orders.sql scripts/test_schema_parsers.py
git commit -m "feat(common): schema_parsers package with SQL DDL parser"
```

---

### Task 6: Prisma parser

**Files:**
- Create: `scripts/schema_parsers/prisma.py`, `fixtures/schemas/orders.prisma`
- Test: `scripts/test_schema_parsers.py`

**Interfaces:** `prisma.parse(text, path) -> ParsedSchema`. Relation fields (`customer Customer @relation(...)`) are not emitted as columns; scalar FK fields listed in `fields: [...]` are marked `fk`. A `Y[]` field with no `@relation` on a model that `Y` also lists as `X[]` yields one `many-to-many` relation (emitted once, from the alphabetically first model). A plain `Y[]` inverse side yields nothing (the `many-to-one` comes from the owning side).

- [ ] **Step 1: Fixture** `fixtures/schemas/orders.prisma`

```prisma
model Customer {
  id     String  @id @default(uuid())
  email  String  @unique
  name   String?
  orders Order[]
  tags   Tag[]
}

model Order {
  id         String   @id @default(uuid())
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])
  status     String
  placedAt   DateTime @default(now())
}

model Tag {
  id        Int        @id @default(autoincrement())
  label     String
  customers Customer[]
}
```

- [ ] **Step 2: Failing tests**

```python
class TestPrisma(unittest.TestCase):
    def setUp(self):
        from schema_parsers import prisma
        self.schema = prisma.parse(read("orders.prisma"), "fixtures/schemas/orders.prisma")
        self.by_name = {e.name: e for e in self.schema.entities}

    def test_models_and_scalar_columns(self):
        self.assertEqual(sorted(self.by_name), ["Customer", "Order", "Tag"])
        cols = {c.name: c for c in self.by_name["Order"].columns}
        self.assertEqual(sorted(cols), ["customerId", "id", "placedAt", "status"])
        self.assertTrue(cols["id"].pk)
        self.assertTrue(cols["customerId"].fk)
        self.assertFalse(cols["status"].nullable)

    def test_optional_field_is_nullable(self):
        cols = {c.name: c for c in self.by_name["Customer"].columns}
        self.assertTrue(cols["name"].nullable)
        self.assertFalse(cols["email"].nullable)

    def test_relation_from_owning_side(self):
        rels = {(r.source, r.target): r for r in self.schema.relations}
        self.assertEqual(rels[("Order", "Customer")].cardinality, "many-to-one")
        self.assertEqual(rels[("Order", "Customer")].evidence, "fixtures/schemas/orders.prisma:12")

    def test_implicit_many_to_many_emitted_once(self):
        m2m = [r for r in self.schema.relations if r.cardinality == "many-to-many"]
        self.assertEqual(len(m2m), 1)
        self.assertEqual((m2m[0].source, m2m[0].target), ("Customer", "Tag"))

    def test_model_evidence_is_declaration_line(self):
        self.assertEqual(self.by_name["Order"].evidence, "fixtures/schemas/orders.prisma:9")

    def test_no_models_is_an_error(self):
        from schema_parsers import prisma
        with self.assertRaises(SchemaParseError):
            prisma.parse("datasource db { provider = \"postgresql\" }", "s.prisma")
```

- [ ] **Step 3: Run to verify failure** → `ImportError: cannot import name 'prisma'`.

- [ ] **Step 4: Create `prisma.py`**

```python
"""Prisma schema parser: models, scalar fields, @id, @relation, optional and list fields."""

from __future__ import annotations

import re

from .model import Column, Entity, ParsedSchema, Relation, SchemaParseError, line_of

_MODEL = re.compile(r"^model\s+(\w+)\s*\{(.*?)^\}", re.MULTILINE | re.DOTALL)
_FIELD = re.compile(r"^\s*(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$")
_RELATION = re.compile(r"@relation\([^)]*fields:\s*\[([^\]]*)\]", re.IGNORECASE)


def parse(text: str, path: str) -> ParsedSchema:
    models = {m.group(1): m for m in _MODEL.finditer(text)}
    if not models:
        raise SchemaParseError("%s: no model blocks found" % path)
    entities, relations, list_fields = [], [], {}
    for name, match in models.items():
        body_offset = match.start(2)
        columns, fk_fields = [], set()
        for line_match in re.finditer(r"^.*$", match.group(2), re.MULTILINE):
            line = line_match.group(0)
            field = _FIELD.match(line)
            if not field or line.strip().startswith(("//", "@@")):
                continue
            fname, ftype, is_list, optional, attrs = field.groups()
            rel = _RELATION.search(attrs or "")
            if rel:
                fk_fields.update(f.strip() for f in rel.group(1).split(","))
                relations.append(Relation(name, ftype, "many-to-one", fname,
                                          "%s:%d" % (path, line_of(text, body_offset + line_match.start()))))
                continue
            if ftype in models:
                if is_list:
                    list_fields.setdefault(name, set()).add(ftype)
                continue
            columns.append(Column(fname, ftype + ("[]" if is_list else ""),
                                  pk="@id" in (attrs or ""), nullable=bool(optional)))
        columns = tuple(Column(c.name, c.type, c.pk, c.name in fk_fields,
                               c.nullable and not c.pk) for c in columns)
        entities.append(Entity(name, columns, "%s:%d" % (path, line_of(text, match.start()))))
    for a in sorted(list_fields):
        for b in sorted(list_fields[a]):
            if a < b and a in list_fields.get(b, set()):
                relations.append(Relation(a, b, "many-to-many", "",
                                          "%s:%d" % (path, line_of(text, models[a].start()))))
    return ParsedSchema(tuple(entities), tuple(relations))

```

Unknown scalar or enum types stay as columns; the type string is still informative.

- [ ] **Step 5: Run** → `TestPrisma` all pass; registry test still fails (2 parsers missing).

- [ ] **Step 6: Commit**

```bash
git add scripts/schema_parsers/prisma.py fixtures/schemas/orders.prisma scripts/test_schema_parsers.py
git commit -m "feat(common): prisma schema parser"
```

---

### Task 7: TypeORM parser

**Files:**
- Create: `scripts/schema_parsers/typeorm.py`, `fixtures/schemas/orders.entity.ts`
- Test: `scripts/test_schema_parsers.py`

**Interfaces:** `typeorm.parse(text, path) -> ParsedSchema`. Entity name = class name (or the string argument of `@Entity('name')` when given). Columns from `@PrimaryGeneratedColumn`, `@PrimaryColumn`, `@Column` (type from the TS annotation after the property name; `nullable: true` in the decorator options). Relations from `@ManyToOne(() => Y` → `many-to-one`, `@OneToOne` → `one-to-one`, `@ManyToMany` with `@JoinTable` → `many-to-many`; `@OneToMany` is the inverse side and emits nothing. A `@JoinColumn`-less `@ManyToOne` still marks a synthetic FK column `<prop>Id`.

- [ ] **Step 1: Fixture** `fixtures/schemas/orders.entity.ts`

```ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, ManyToMany, JoinTable } from 'typeorm';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  name: string;

  @OneToMany(() => Order, (order) => order.customer)
  orders: Order[];

  @ManyToMany(() => Tag)
  @JoinTable()
  tags: Tag[];
}

@Entity()
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Customer, (customer) => customer.orders)
  customer: Customer;

  @Column()
  status: string;
}

@Entity()
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  label: string;
}
```

- [ ] **Step 2: Failing tests**

```python
class TestTypeOrm(unittest.TestCase):
    def setUp(self):
        from schema_parsers import typeorm
        self.schema = typeorm.parse(read("orders.entity.ts"), "fixtures/schemas/orders.entity.ts")
        self.by_name = {e.name: e for e in self.schema.entities}

    def test_entity_names_prefer_decorator_argument(self):
        self.assertEqual(sorted(self.by_name), ["Order", "Tag", "customers"])

    def test_columns_types_and_nullability(self):
        cols = {c.name: c for c in self.by_name["customers"].columns}
        self.assertTrue(cols["id"].pk)
        self.assertEqual(cols["email"].type, "string")
        self.assertTrue(cols["name"].nullable)
        self.assertFalse(cols["email"].nullable)
        self.assertNotIn("orders", cols)

    def test_many_to_one_adds_fk_column_and_relation(self):
        cols = {c.name: c for c in self.by_name["Order"].columns}
        self.assertTrue(cols["customerId"].fk)
        rel = [r for r in self.schema.relations if r.source == "Order"][0]
        self.assertEqual((rel.target, rel.cardinality), ("customers", "many-to-one"))

    def test_many_to_many_with_join_table(self):
        m2m = [r for r in self.schema.relations if r.cardinality == "many-to-many"]
        self.assertEqual([(r.source, r.target) for r in m2m], [("customers", "Tag")])

    def test_no_entities_is_an_error(self):
        from schema_parsers import typeorm
        with self.assertRaises(SchemaParseError):
            typeorm.parse("export class Nope {}", "n.ts")
```

- [ ] **Step 3: Run to verify failure** → `ImportError`.

- [ ] **Step 4: Create `typeorm.py`**

```python
"""TypeORM entity parser: @Entity classes, column decorators, relation decorators."""

from __future__ import annotations

import re

from .model import Column, Entity, ParsedSchema, Relation, SchemaParseError, line_of

_ENTITY = re.compile(r"@Entity\(\s*(?:'([^']*)'|\"([^\"]*)\")?\s*[^)]*\)\s*(?:export\s+)?class\s+(\w+)"
                     r"[^{]*\{(.*?)^\}", re.MULTILINE | re.DOTALL)
_MEMBER = re.compile(r"((?:@\w+\([^;]*?\)\s*)+)(\w+)\s*[?!]?:\s*([\w\[\]<>| ]+);", re.DOTALL)
_RELATION = re.compile(r"@(ManyToOne|OneToOne|ManyToMany|OneToMany)\(\s*\(\)\s*=>\s*(\w+)")
_CARD = {"ManyToOne": "many-to-one", "OneToOne": "one-to-one", "ManyToMany": "many-to-many"}


def parse(text: str, path: str) -> ParsedSchema:
    matches = list(_ENTITY.finditer(text))
    if not matches:
        raise SchemaParseError("%s: no @Entity classes found" % path)
    class_to_table = {m.group(3): (m.group(1) or m.group(2) or m.group(3)) for m in matches}
    entities, relations = [], []
    for match in matches:
        table = class_to_table[match.group(3)]
        body, body_offset = match.group(4), match.start(4)
        columns = []
        for member in _MEMBER.finditer(body):
            decorators, prop, ptype = member.group(1), member.group(2), member.group(3).strip()
            line = line_of(text, body_offset + member.start())
            rel = _RELATION.search(decorators)
            if rel:
                kind, target_class = rel.groups()
                target = class_to_table.get(target_class, target_class)
                if kind == "OneToMany":
                    continue
                if kind == "ManyToMany" and "@JoinTable" not in decorators:
                    continue
                relations.append(Relation(table, target, _CARD[kind], prop, "%s:%d" % (path, line)))
                if kind in ("ManyToOne", "OneToOne"):
                    columns.append(Column(prop + "Id", "fk", fk=True,
                                          nullable="nullable: true" in decorators))
                continue
            if "@Column" not in decorators and "@Primary" not in decorators:
                continue
            is_pk = "@Primary" in decorators
            columns.append(Column(prop, ptype, pk=is_pk,
                                  nullable=(not is_pk) and "nullable: true" in decorators))
        entities.append(Entity(table, tuple(columns), "%s:%d" % (path, line_of(text, match.start()))))
    return ParsedSchema(tuple(entities), tuple(relations))
```

- [ ] **Step 5: Run** → `TestTypeOrm` pass; registry test still fails (1 parser missing).

- [ ] **Step 6: Commit**

```bash
git add scripts/schema_parsers/typeorm.py fixtures/schemas/orders.entity.ts scripts/test_schema_parsers.py
git commit -m "feat(common): typeorm entity parser"
```

---

### Task 8: Django / SQLAlchemy parser

**Files:**
- Create: `scripts/schema_parsers/django_sqlalchemy.py`, `fixtures/schemas/orders_models.py`
- Test: `scripts/test_schema_parsers.py`

**Interfaces:** `django_sqlalchemy.parse(text, path) -> ParsedSchema`. Django: `class X(models.Model)`; fields `name = models.<Type>Field(...)`; `primary_key=True`; `null=True` → nullable; `ForeignKey('Y'|Y, ...)` → `many-to-one` and column `<name>_id`; `OneToOneField` → `one-to-one`; `ManyToManyField` → `many-to-many`. A model without an explicit PK gets an implicit `id: AutoField` column with `pk=True`. SQLAlchemy: `class X(Base)` with `__tablename__ = 'x'`; `name = Column(Type, ForeignKey('t.c'), primary_key=True, nullable=False)` and the 2.0 form `name: Mapped[T] = mapped_column(ForeignKey('t.c'), primary_key=True)`; `ForeignKey` → `many-to-one`; `nullable=False` or `primary_key=True` → not nullable, else nullable.

- [ ] **Step 1: Fixture** `fixtures/schemas/orders_models.py`

```python
from django.db import models


class Customer(models.Model):
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=80, null=True)


class Order(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    status = models.CharField(max_length=20)
    tags = models.ManyToManyField('Tag')


class Tag(models.Model):
    label = models.CharField(max_length=40, primary_key=True)


# --- SQLAlchemy in the same file so one fixture covers both dialects ---
from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    total = Column(Integer)
```

- [ ] **Step 2: Failing tests**

```python
class TestDjangoSqlAlchemy(unittest.TestCase):
    def setUp(self):
        from schema_parsers import django_sqlalchemy as ds
        self.schema = ds.parse(read("orders_models.py"), "fixtures/schemas/orders_models.py")
        self.by_name = {e.name: e for e in self.schema.entities}

    def test_django_models_get_implicit_id_pk(self):
        cols = {c.name: c for c in self.by_name["Customer"].columns}
        self.assertTrue(cols["id"].pk)
        self.assertEqual(cols["id"].type, "AutoField")
        self.assertTrue(cols["name"].nullable)
        self.assertFalse(cols["email"].nullable)

    def test_explicit_primary_key_suppresses_implicit_id(self):
        cols = {c.name: c for c in self.by_name["Tag"].columns}
        self.assertTrue(cols["label"].pk)
        self.assertNotIn("id", cols)

    def test_foreign_key_and_many_to_many(self):
        cols = {c.name: c for c in self.by_name["Order"].columns}
        self.assertTrue(cols["customer_id"].fk)
        rels = {(r.source, r.target): r.cardinality for r in self.schema.relations}
        self.assertEqual(rels[("Order", "Customer")], "many-to-one")
        self.assertEqual(rels[("Order", "Tag")], "many-to-many")

    def test_sqlalchemy_table_uses_tablename_and_foreign_key(self):
        cols = {c.name: c for c in self.by_name["invoices"].columns}
        self.assertTrue(cols["id"].pk)
        self.assertTrue(cols["order_id"].fk)
        self.assertFalse(cols["order_id"].nullable)
        self.assertTrue(cols["total"].nullable)
        rels = {(r.source, r.target): r.cardinality for r in self.schema.relations}
        self.assertEqual(rels[("invoices", "orders")], "many-to-one")

    def test_no_models_is_an_error(self):
        from schema_parsers import django_sqlalchemy as ds
        with self.assertRaises(SchemaParseError):
            ds.parse("x = 1", "m.py")
```

- [ ] **Step 3: Run to verify failure** → `ImportError`.

- [ ] **Step 4: Create `django_sqlalchemy.py`**

```python
"""Django models and SQLAlchemy declarative classes, by regex, no imports of either."""

from __future__ import annotations

import re

from .model import Column, Entity, ParsedSchema, Relation, SchemaParseError, line_of

_CLASS = re.compile(r"^class\s+(\w+)\((.*?)\):\s*\n((?:[ \t]+.*\n|\s*\n)*)", re.MULTILINE)
_DJANGO_FIELD = re.compile(r"^\s+(\w+)\s*=\s*models\.(\w+)\((.*)\)\s*$", re.MULTILINE)
_TARGET = re.compile(r"^\s*(?:'([\w.]+)'|\"([\w.]+)\"|(\w+))")
_SA_COLUMN = re.compile(r"^\s+(\w+)(?:\s*:\s*Mapped\[[^\]]*\])?\s*=\s*(?:Column|mapped_column)\((.*)\)\s*$",
                        re.MULTILINE)
_SA_FK = re.compile(r"ForeignKey\(\s*['\"](\w+)\.\w+['\"]")
_TABLENAME = re.compile(r"__tablename__\s*=\s*['\"](\w+)['\"]")
_DJANGO_REL = {"ForeignKey": "many-to-one", "OneToOneField": "one-to-one",
               "ManyToManyField": "many-to-many"}


def parse(text: str, path: str) -> ParsedSchema:
    entities, relations = [], []
    for match in _CLASS.finditer(text):
        name, bases, body = match.groups()
        line = line_of(text, match.start())
        body_offset = match.start(3)
        if "models.Model" in bases:
            entities.append(_django(name, body, body_offset, text, path, line, relations))
        elif "Base" in bases or "DeclarativeBase" in bases:
            entities.append(_sqlalchemy(name, body, body_offset, text, path, line, relations))
    if not entities:
        raise SchemaParseError("%s: no Django models or SQLAlchemy declarative classes found" % path)
    return ParsedSchema(tuple(entities), tuple(relations))


def _django(name, body, body_offset, text, path, line, relations):
    columns, has_pk = [], False
    for field in _DJANGO_FIELD.finditer(body):
        fname, ftype, args = field.groups()
        fline = line_of(text, body_offset + field.start())
        if ftype in _DJANGO_REL:
            target = _TARGET.match(args)
            target_name = next(g for g in target.groups() if g).split(".")[-1]
            relations.append(Relation(name, target_name, _DJANGO_REL[ftype], fname, "%s:%d" % (path, fline)))
            if ftype != "ManyToManyField":
                columns.append(Column(fname + "_id", "fk", fk=True, nullable="null=True" in args))
            continue
        pk = "primary_key=True" in args
        has_pk = has_pk or pk
        columns.append(Column(fname, ftype, pk=pk, nullable=(not pk) and "null=True" in args))
    if not has_pk:
        columns.insert(0, Column("id", "AutoField", pk=True, nullable=False))
    return Entity(name, tuple(columns), "%s:%d" % (path, line))


def _sqlalchemy(name, body, body_offset, text, path, line, relations):
    table = _TABLENAME.search(body)
    table_name = table.group(1) if table else name
    columns = []
    for col in _SA_COLUMN.finditer(body):
        cname, args = col.groups()
        cline = line_of(text, body_offset + col.start())
        fk = _SA_FK.search(args)
        if fk:
            relations.append(Relation(table_name, fk.group(1), "many-to-one", cname, "%s:%d" % (path, cline)))
        pk = "primary_key=True" in args
        ctype = args.split(",")[0].strip() if not args.startswith(("ForeignKey", "mapped")) else "?"
        columns.append(Column(cname, ctype, pk=pk, fk=fk is not None,
                              nullable=(not pk) and "nullable=False" not in args))
    return Entity(table_name, tuple(columns), "%s:%d" % (path, line))
```

- [ ] **Step 5: Run** → whole `test_schema_parsers` passes including the registry test.

Run: `python3 -m unittest discover -s scripts -p 'test_*.py' 2>&1 | tail -2` → `Ran 111 tests`, `OK` (count may differ by one or two; all must pass).

- [ ] **Step 6: Commit**

```bash
git add scripts/schema_parsers/django_sqlalchemy.py fixtures/schemas/orders_models.py scripts/test_schema_parsers.py
git commit -m "feat(common): django and sqlalchemy model parser"
```

---

### Task 9: `schema_to_spec.py` CLI

**Files:**
- Create: `scripts/schema_to_spec.py`
- Test: `scripts/test_schema_to_spec.py`

**Interfaces:**
- `schema_to_spec.build_spec(schemas: list[ParsedSchema], title: str, scope: str, date: str, author: str = "") -> dict` (an `erd` spec that passes `validate_spec.validate`).
- `schema_to_spec.parse_files(paths: list[str]) -> list[ParsedSchema]`.
- CLI: `schema_to_spec.py FILE... --title T [--scope S] [--author A] [--date YYYY-MM-DD] -o out.spec.json`. Exit 1 with the parser's message on any `SchemaParseError`, exit 1 on duplicate entity names across files.
- Node ids: entity name lowercased with non-alphanumerics replaced by `_`. Undeclared relation targets become entities with no columns and no evidence (`kind: "entity"`, `columns: []` is invalid, so give them one placeholder column `{"name": "?", "type": "?"}` and no `evidence`, which renders UNVERIFIED).

- [ ] **Step 1: Failing tests** (`scripts/test_schema_to_spec.py`)

```python
import json, os, subprocess, sys, tempfile, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import schema_to_spec, validate_spec
from schema_parsers.model import Column, Entity, ParsedSchema, Relation

HERE = os.path.dirname(os.path.abspath(__file__))
FIX = os.path.join(os.path.dirname(HERE), "fixtures", "schemas")


class TestBuildSpec(unittest.TestCase):
    def test_sql_fixture_becomes_valid_erd_spec(self):
        spec = schema_to_spec.build_spec(
            schema_to_spec.parse_files([os.path.join(FIX, "orders.sql")]),
            title="Orders — ERD", scope="Order tables", date="2026-09-13")
        self.assertEqual(validate_spec.validate(spec), [])
        self.assertEqual(spec["type"], "erd")
        ids = {n["id"] for n in spec["nodes"]}
        self.assertEqual(ids, {"customers", "orders", "order_items"})
        rel = [e for e in spec["edges"] if e["from"] == "orders"][0]
        self.assertEqual((rel["to"], rel["cardinality"]), ("customers", "many-to-one"))
        self.assertTrue(all(n.get("evidence") for n in spec["nodes"]))

    def test_undeclared_target_becomes_unverified_entity(self):
        schema = ParsedSchema(
            (Entity("invoices", (Column("id", "int", pk=True), Column("order_id", "int", fk=True)), "m.py:3"),),
            (Relation("invoices", "orders", "many-to-one", "", "m.py:5"),))
        spec = schema_to_spec.build_spec([schema], "T", "S", "2026-09-13")
        ghost = [n for n in spec["nodes"] if n["id"] == "orders"][0]
        self.assertNotIn("evidence", ghost)
        self.assertEqual(validate_spec.validate(spec), [])

    def test_duplicate_entity_across_files_is_an_error(self):
        a = ParsedSchema((Entity("t", (Column("id", "int", pk=True),), "a.sql:1"),), ())
        with self.assertRaises(schema_to_spec.MergeError):
            schema_to_spec.build_spec([a, a], "T", "S", "2026-09-13")

    def test_ids_are_slugged(self):
        self.assertEqual(schema_to_spec.slug("Order Items"), "order_items")


class TestCli(unittest.TestCase):
    def test_cli_writes_spec_and_reports_counts(self):
        out = os.path.join(tempfile.mkdtemp(), "erd.spec.json")
        proc = subprocess.run(
            [sys.executable, os.path.join(HERE, "schema_to_spec.py"),
             os.path.join(FIX, "orders.prisma"), "--title", "Orders", "--scope", "s", "-o", out],
            capture_output=True, text=True)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("3 entities", proc.stderr)
        with open(out) as h:
            self.assertEqual(validate_spec.validate(json.load(h)), [])

    def test_cli_rejects_unknown_file(self):
        proc = subprocess.run(
            [sys.executable, os.path.join(HERE, "schema_to_spec.py"), __file__, "--title", "x"],
            capture_output=True, text=True)
        self.assertEqual(proc.returncode, 1)
        self.assertIn("supported", proc.stderr)
```

- [ ] **Step 2: Run to verify failure** → `ModuleNotFoundError: schema_to_spec`.

- [ ] **Step 3: Create `schema_to_spec.py`**

```python
#!/usr/bin/env python3
"""Turn schema files into an `erd` diagram spec for render_drawio.py.

Usage:
    python3 schema_to_spec.py db/schema.sql prisma/schema.prisma --title "Orders — ERD" \
        --scope "Order and customer tables" -o docs/architecture/orders-erd.spec.json

Supported inputs: SQL DDL (.sql), Prisma (.prisma), TypeORM entities (.ts with @Entity),
Django models / SQLAlchemy declarative classes (.py). Anything else is refused.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys

from schema_parsers import PARSERS, detect_format
from schema_parsers.model import ParsedSchema, SchemaParseError


class MergeError(ValueError):
    """Two input files declare the same entity."""


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


def parse_files(paths):
    schemas = []
    for path in paths:
        with open(path, encoding="utf-8") as handle:
            text = handle.read()
        schemas.append(PARSERS[detect_format(path, text)](text, path))
    return schemas


def build_spec(schemas, title, scope, date, author=""):
    nodes, edges, seen = [], [], {}
    for schema in schemas:
        for entity in schema.entities:
            node_id = slug(entity.name)
            if node_id in seen:
                raise MergeError("entity %s declared twice (%s and %s)"
                                 % (entity.name, seen[node_id], entity.evidence))
            seen[node_id] = entity.evidence
            nodes.append({
                "id": node_id, "label": entity.name, "kind": "entity", "evidence": entity.evidence,
                "columns": [_column(c) for c in entity.columns],
            })
    for schema in schemas:
        for relation in schema.relations:
            src, dst = slug(relation.source), slug(relation.target)
            if dst not in seen:
                seen[dst] = None
                nodes.append({"id": dst, "label": relation.target, "kind": "entity",
                              "columns": [{"name": "?", "type": "?"}]})
            edge = {"from": src, "to": dst, "cardinality": relation.cardinality,
                    "evidence": relation.evidence}
            if relation.label:
                edge["label"] = relation.label
            edges.append(edge)
    return {"title": title, "type": "erd", "audience": "tech", "version": "1.0", "date": date,
            "author": author, "scope": scope, "nodes": nodes, "edges": edges}


def _column(column):
    out = {"name": column.name, "type": column.type}
    if column.pk:
        out["pk"] = True
    if column.fk:
        out["fk"] = True
    if not column.nullable:
        out["nullable"] = False
    return out


def main(argv=None):
    parser = argparse.ArgumentParser(description="Build an erd spec from schema files.")
    parser.add_argument("files", nargs="+")
    parser.add_argument("--title", required=True)
    parser.add_argument("--scope", default="Tables and their relationships.")
    parser.add_argument("--author", default="")
    parser.add_argument("--date", default=dt.date.today().isoformat())
    parser.add_argument("-o", "--output")
    args = parser.parse_args(argv)
    try:
        schemas = parse_files(args.files)
        spec = build_spec(schemas, args.title, args.scope, args.date, args.author)
    except (SchemaParseError, MergeError, OSError) as error:
        sys.stderr.write("%s\n" % error)
        return 1
    text = json.dumps(spec, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        with open(args.output, "w", encoding="utf-8") as handle:
            handle.write(text)
    else:
        sys.stdout.write(text)
    sys.stderr.write("%d entities, %d relations%s\n" % (
        len(spec["nodes"]), len(spec["edges"]), (" -> " + args.output) if args.output else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

Note `evidence` on edges is a new, harmless optional field; the validator ignores unknown edge keys. Document it in `diagram-spec.md` (Task 11).

- [ ] **Step 4: Run** → `test_schema_to_spec` passes; full suite `OK`.

- [ ] **Step 5: End-to-end**

```bash
python3 scripts/schema_to_spec.py fixtures/schemas/orders.sql --title "Orders — ERD" -o /tmp/orders.spec.json
python3 scripts/validate_spec.py /tmp/orders.spec.json
python3 scripts/render_drawio.py /tmp/orders.spec.json -o /tmp/orders.drawio --strict
python3 scripts/export_drawio.py /tmp/orders.drawio -f png -o /tmp/orders.png
```

Look at `/tmp/orders.png`.

- [ ] **Step 6: Commit**

```bash
git add scripts/schema_to_spec.py scripts/test_schema_to_spec.py
git commit -m "feat(common): schema_to_spec CLI from SQL, Prisma, TypeORM, Django/SQLAlchemy"
```

---

### Task 10: Golden fixtures

**Files:**
- Create: `fixtures/context.spec.json`, `container.spec.json`, `deployment.spec.json`, `dataflow.spec.json`, `sequence.spec.json`, `state.spec.json`, `erd.spec.json` and the matching `.drawio`; `fixtures/schemas/<name>.expected.json` for the four schema fixtures.
- Test: `scripts/test_fixtures.py`

**Interfaces:** `test_fixtures.py` is the only consumer. `UPDATE_GOLDEN=1` env var rewrites outputs.

- [ ] **Step 1: Write the seven specs.** Each must pass `validate_spec` and `check_layout` with no findings and no warnings. Use the test fixtures as a base and make each one real enough to read:
  - `context.spec.json`: audience exec, 1 person, 1 system, 2 `system-ext`, 1 `saas`, labelled edges.
  - `container.spec.json`: audience tech, one group, `container` ×3, `db`, `cache`, `queue`; every node has `metric` and `constraint`; one `async` edge with a metric.
  - `deployment.spec.json`: audience tech, groups `region`/`vpc`; `aws:cloudfront`, `aws:elb`, `aws:eks`, `aws:rds`, `aws:elasticache`, `aws:sqs`, one `cloud:identity` with sublabel `"Azure AD"`.
  - `dataflow.spec.json`: audience tech, `gcp:gcs` → `gcp:composer` → `gcp:bigquery` with `cloud:observability`.
  - `sequence.spec.json`: three participants, five messages incl. one `return` with metric.
  - `state.spec.json`: start, four states, end.
  - `erd.spec.json`: the output of `schema_to_spec.py fixtures/schemas/orders.sql --title "Orders — ERD" --date 2026-09-13` (fixed date so it is reproducible).

- [ ] **Step 2: Write `scripts/test_fixtures.py`**

```python
import glob, json, os, subprocess, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import check_layout, render_drawio, validate_spec
from schema_parsers import PARSERS, detect_format
import schema_to_spec

HERE = os.path.dirname(os.path.abspath(__file__))
FIX = os.path.join(os.path.dirname(HERE), "fixtures")
UPDATE = os.environ.get("UPDATE_GOLDEN") == "1"


def _read(path):
    with open(path, encoding="utf-8") as h:
        return h.read()


def _golden(path, actual):
    if UPDATE:
        with open(path, "w", encoding="utf-8") as h:
            h.write(actual)
    return _read(path)


class TestGoldenDiagrams(unittest.TestCase):
    def test_every_type_has_a_fixture(self):
        names = {os.path.basename(p)[:-len(".spec.json")] for p in glob.glob(os.path.join(FIX, "*.spec.json"))}
        self.assertEqual(names, set(render_drawio.DIAGRAM_TYPES))

    def test_fixtures_validate_render_and_match_golden(self):
        for path in sorted(glob.glob(os.path.join(FIX, "*.spec.json"))):
            with self.subTest(fixture=os.path.basename(path)):
                spec = json.loads(_read(path))
                self.assertEqual(validate_spec.validate(spec), [])
                self.assertEqual(validate_spec.collect_warnings(spec), [])
                self.assertEqual(check_layout.check(spec, render_drawio.layout(spec)), [])
                actual = render_drawio.render(spec)
                self.assertEqual(actual, _golden(path[:-len(".spec.json")] + ".drawio", actual))


class TestGoldenSchemas(unittest.TestCase):
    def test_schema_fixtures_match_expected(self):
        for path in sorted(glob.glob(os.path.join(FIX, "schemas", "orders*"))):
            if path.endswith(".expected.json"):
                continue
            with self.subTest(schema=os.path.basename(path)):
                text = _read(path)
                rel = os.path.relpath(path, os.path.dirname(FIX))
                schema = PARSERS[detect_format(path, text)](text, rel)
                spec = schema_to_spec.build_spec([schema], "Golden", "golden", "2026-09-13")
                actual = json.dumps(spec, indent=2, ensure_ascii=False, sort_keys=True) + "\n"
                self.assertEqual(actual, _golden(path + ".expected.json", actual))
```

- [ ] **Step 3: Generate goldens once**: `UPDATE_GOLDEN=1 python3 -m unittest test_fixtures` then `python3 -m unittest test_fixtures` → OK. Open each `fixtures/*.drawio` in draw.io Desktop or export all to PNG and look.

- [ ] **Step 4: Commit**

```bash
git add fixtures scripts/test_fixtures.py
git commit -m "test(common): golden fixtures for every diagram type and schema parser"
```

---

### Task 11: Documentation, SKILL, specialist, evals, CHANGELOG, regenerate

**Files:**
- Create: `references/layout-rules.md`
- Modify: `references/diagram-spec.md`, `references/style-catalog.md`, `references/cloud-architecture.md`, `references/diagram-selection.md`, `references/checklist.md`, `SKILL.md`, `evals/evals.json`, `skills/specialists/specialist-solution-diagrammer/SKILL.md`, `CHANGELOG.md`
- Regenerate: `pnpm generate-indices`

- [ ] **Step 1: `references/layout-rules.md`**

```markdown
# Layout Rules

The renderer owns layout. These are the rules it applies, so a reader can predict the
picture from the spec, and `check_layout.py` can tell when the rules failed.

## Direction per type

| Type | Flow | Placement |
|---|---|---|
| `context` | left to right | people, the system, externals, in three centred columns |
| `container`, `deployment`, `dataflow` | top to bottom | one row per `layer`: 0 people, 1 edge/CDN/gateway, 2 services, 3 stores, 4 external and cross-cutting |
| `sequence` | left to right, time downward | one column per participant, messages 60 px apart |
| `state` | top to bottom | row = distance from `start` |
| `erd` | left to right | column = foreign-key depth; referenced tables left of referencing ones |

## Grid

- Cell 180 × 90, column step 360 (`CELL_W + MIN_LABEL_GAP`), row gap 46, body starts at y 170.
- The 180 px gap is the smallest that keeps an edge label between two boxes instead of on one.
- Columns are centred against each other; rows are centred on the widest row. A hub pinned to a corner forces every edge into a dog-leg through its neighbours.

## Edges

- Each edge leaves the source on the side facing the target and enters the target on the facing side (`_anchor_style`). The route is orthogonal with one bend at the midpoint.
- Labels sit 35 % along the route (`-0.35` relative geometry) so they clear the box they left.
- `erd` relations are straight `entityRelationEdgeStyle` lines with IE arrows.

## What `check_layout.py` catches

- Two node boxes overlapping.
- An edge route crossing a node that is neither endpoint.
- A label point inside a node.
- A group boundary enclosing a node outside the group.

Run it with `render_drawio.py --strict`; exit code 2 means fix the spec (split a layer with
`layer`, move a node to a group, or split the diagram), never the renderer.

## What still needs eyes

Text overflow inside a box, icon legibility at export scale, and whether the diagram answers
its one question. The checklist's last item stays.
```

- [ ] **Step 2: `references/diagram-spec.md`**: title → v1.2; `type` row lists `erd`; nodes row adds `columns` (entity only); edges row adds `cardinality` (erd only) and `evidence` (optional pointer for a relation); new "Entities" subsection with the JSON example from the spec's section A and the row-text rule (`PK `, `FK `, ` ?`); node kinds list adds `AWS: aws:lambda …` (all 20) and `Vendor-neutral: cloud:compute …` (all 11) and `ERD: entity`; cardinality table.

- [ ] **Step 3: `references/style-catalog.md`**: state that the catalogue now lives in `scripts/style_catalog.py`; add an "AWS" paragraph (style form, the verification grep `grep -ao "mxgraph\.aws4\.[a-z_0-9]*" "/Applications/draw io.app/Contents/Resources/app.asar" | sort -u`), an "Azure and other clouds" paragraph (only the 2014 `mxgraph.azure` stencils ship; use `cloud:*`), and rows for `aws:*`, `cloud:*`, `entity` in the kinds table.

- [ ] **Step 4: `references/cloud-architecture.md`**: add an AWS kinds table (20 rows, kind → service), a "Vendor-neutral kinds" table (11 rows, kind → what it stands for), replace "Other clouds have no kinds yet…" with the Azure guidance.

- [ ] **Step 5: `references/diagram-selection.md`**: add row `| Which tables exist and how they relate | erd | Developers, data |`, decision-tree step 7 "Documenting a schema? `erd`, generated from the schema files with `schema_to_spec.py`", and delete the ERD bullet under "Not covered here".

- [ ] **Step 6: `references/checklist.md`**: automated list gains `- [ ] Layout check clean (render_drawio.py --strict): no overlaps, no edge through a third box, no label on a box` and `- [ ] ERD entities list their columns; every relation has a cardinality`.

- [ ] **Step 7: `SKILL.md`**: pipeline becomes

```
1. Write `spec.json` — schema in [diagram-spec.md]. For an ERD, generate it:
   `python3 scripts/schema_to_spec.py db/schema.sql --title "<System> — ERD" -o spec.json`
2. `python3 scripts/validate_spec.py spec.json`
3. `python3 scripts/render_drawio.py spec.json -o docs/architecture/<slug>.drawio --strict`
4. `python3 scripts/export_drawio.py docs/architecture/<slug>.drawio -f png -o docs/architecture/<slug>.png`
```

Guidelines gain `- **Cloud icons only where verified.** \`gcp:*\` and \`aws:*\` are official icons; every other vendor is a \`cloud:*\` kind with the service in \`sublabel\`.` Triggers gain `entity relationship`, `schema diagram`, `aws`. References list gains `[Layout rules](references/layout-rules.md)`.

- [ ] **Step 8: `evals/evals.json`**: add two cases following the existing shape:
  - "Draw the ERD for our Prisma schema": expected behaviour runs `schema_to_spec.py`, keeps undeclared targets UNVERIFIED, every relation carries a cardinality.
  - "Deployment diagram for our AWS setup with Azure AD for SSO": expected `aws:*` kinds for AWS services, `cloud:identity` with sublabel for Azure AD, no invented Azure icon.
  Add `"draw the erd"` and `"aws architecture"` to `should_trigger`.

- [ ] **Step 9: Specialist** `skills/specialists/specialist-solution-diagrammer/SKILL.md` step 5: "Run `scripts/render_drawio.py --strict`, then `scripts/export_drawio.py`. A layout finding means change the spec (a `layer`, a group, or a split), never the renderer."

- [ ] **Step 10: `CHANGELOG.md`**: in `[common-v2.5.0]` `### Added` append bullets for `erd` type + `entity` kind + cardinality arrows, `schema_to_spec.py` with the four parsers, `aws:*` (20 verified) and `cloud:*` (11) kinds, `check_layout.py` + `--strict`, golden fixtures, `layout-rules.md`; update the test count line to the final number. In `### Changed`: catalogue moved to `style_catalog.py`, `diagram-selection.md` covers ERD. In `[specialists-v1.5.0]`: "renders with `--strict` before export".

- [ ] **Step 11: Regenerate and verify**

```bash
rm -rf skills/common/common-architecture-diagramming/scripts/__pycache__ skills/common/common-architecture-diagramming/scripts/schema_parsers/__pycache__
python3 -m unittest discover -s skills/common/common-architecture-diagramming/scripts -p 'test_*.py'
pnpm generate-indices
pnpm audit:skills && pnpm audit:keywords && pnpm check-alignment
git status --short   # mirrors under .claude/.codex/.github/.agents updated; no __pycache__
```

- [ ] **Step 12: Commit**

```bash
git add skills/common/common-architecture-diagramming skills/specialists/specialist-solution-diagrammer CHANGELOG.md .claude .codex .github .agents skills/index.json skills/README.md skills/common/_INDEX.md skills/metadata.json
git commit -m "docs(common,specialists): layout rules, ERD and cloud-kind references, strict render gate"
```

---

## Self-review notes

- Spec A (spec v1.2): Tasks 1, 2, 11. Spec B (ERD renderer): Task 3. Spec C (layout check, `--strict`): Task 4. Spec D (schema_to_spec, four parsers): Tasks 5–9. Spec E (fixtures): Task 10. Spec F (docs, evals, specialist, CHANGELOG): Task 11.
- `_edge_value`, `_label_html`, `_unverified_style`, `_geometry`, `_place_columns`, `NODE_PROPERTIES` exist in `render_drawio.py` today (PR #185); `render_erd` imports them lazily to avoid the circular import with `render_drawio` importing `render_erd`.
- `validate_spec` must import `CARDINALITIES` via `render_drawio` re-export (Task 2 adds it to the import list in Task 1's block).
- Test counts per task are approximate; the requirement is "all pass".
