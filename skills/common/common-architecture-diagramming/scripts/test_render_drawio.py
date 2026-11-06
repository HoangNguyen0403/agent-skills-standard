#!/usr/bin/env python3
"""Unit tests for the diagram spec validator, renderer, and export wrapper.

Run: python3 test_render_drawio.py
"""

import contextlib
import glob
import hashlib
import io
import json
import math
import os
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import check_layout
import export_drawio
import render_drawio
import render_erd
import text_layout
import validate_spec

def digest_for_fixture_source(content):
    return "sha256:" + hashlib.sha256(content.encode("utf-8")).hexdigest()


def context_spec(**overrides):
    spec = {
        "title": "Acme — System Context",
        "type": "context",
        "audience": "exec",
        "version": "1.0",
        "date": "2026-09-09",
        "author": "Test",
        "scope": "How customers reach Acme.",
        "nodes": [
            {"id": "cust", "label": "Customer", "kind": "person", "evidence": "docs/a.md:1"},
            {"id": "acme", "label": "Acme", "kind": "system", "evidence": "docs/a.md:2"},
            {"id": "sap", "label": "SAP", "kind": "system-ext", "evidence": "docs/a.md:3"},
        ],
        "edges": [
            {"from": "cust", "to": "acme", "label": "Places order",
             "evidence": "docs/a.md:4", "evidence_kind": "document",
             "evidence_confidence": "documented"},
            {"from": "acme", "to": "sap", "label": "Syncs orders", "style": "async",
             "evidence": "docs/a.md:5", "evidence_kind": "document",
             "evidence_confidence": "documented"},
        ],
    }
    spec.update(overrides)
    return spec


def container_spec(**overrides):
    spec = {
        "title": "Acme — Containers",
        "type": "container",
        "audience": "tech",
        "version": "1.0",
        "date": "2026-09-09",
        "author": "Test",
        "scope": "Deployable units inside Acme.",
        "groups": [{"id": "gcp", "label": "GCP asia-southeast1", "kind": "boundary"}],
        "nodes": [
            {"id": "web", "label": "Web App", "sublabel": "Next.js", "kind": "container",
             "group": "gcp", "evidence": "docs/a.md:10"},
            {"id": "api", "label": "Order Engine", "sublabel": "Go", "kind": "container",
             "group": "gcp", "evidence": "docs/a.md:11"},
            {"id": "db", "label": "Postgres", "kind": "gcp:cloud-sql", "group": "gcp",
             "evidence": "docs/a.md:12"},
        ],
        "edges": [
            {"from": "web", "to": "api", "label": "GraphQL",
             "evidence": "docs/a.md:13", "evidence_kind": "document",
             "evidence_confidence": "documented"},
            {"from": "api", "to": "db", "label": "SQL",
             "evidence": "docs/a.md:14", "evidence_kind": "document",
             "evidence_confidence": "documented"},
        ],
    }
    spec.update(overrides)
    return spec

def component_spec(**overrides):
    spec = {
        "title": "Acme — Order Components", "type": "component", "audience": "tech",
        "version": "1.0", "date": "2026-09-22", "author": "Test",
        "scope": "Order modules; deployment excluded.",
        "view": {
            "question": "Which module owns retries?",
            "decision": "Keep retries in the policy component.",
            "scenario": "Duplicate webhook.",
            "invariant": "Charge at most once.",
            "status": "implemented",
            "evidence": "docs/orders.md:1",
            "evidence_kind": "document",
            "omissions": ["runtime health"],
        },
        "nodes": [
            {
                "id": "api", "identity": "orders.api", "label": "Order API",
                "kind": "component", "evidence": "src/api.py:1", "evidence_kind": "code",
                "evidence_revision": "git:test", "evidence_digest": digest_for_fixture_source("api source\n"),
                "evidence_confidence": "documented", "lifecycle": "implemented",
                "metric": "12k QPS peak", "metric_provenance": "measured",
            },
            {
                "id": "db", "identity": "orders.db", "label": "Orders DB",
                "kind": "db", "evidence": "db/schema.sql:1", "evidence_kind": "document",
                "evidence_revision": "git:test", "evidence_digest": digest_for_fixture_source("db schema\n"),
                "evidence_confidence": "documented", "lifecycle": "implemented",
            },
        ],
        "edges": [
            {
                "identity": "orders.api-writes-db", "from": "api", "to": "db",
                "label": "SQL", "evidence": "src/api.py:10", "evidence_kind": "code",
                "evidence_revision": "git:test", "evidence_digest": digest_for_fixture_source("api edge\n"),
                "evidence_confidence": "documented", "lifecycle": "implemented",
            }
        ],
    }
    spec.update(overrides)
    return spec



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
             "label": "placed by", "evidence": "db/schema.sql:9",
             "evidence_kind": "document", "evidence_confidence": "documented"},
        ],
    }
    spec.update(overrides)
    return spec


def parse(xml_text):
    return ET.fromstring(xml_text)


def cells(root):
    return root.findall(".//mxCell")


def cell_by_id(root, cell_id):
    """Resolve a node id to its mxCell, whether or not it is <object>-wrapped."""
    obj = root.find(".//object[@id='%s']" % cell_id)
    if obj is not None:
        return obj.find("mxCell")
    for c in cells(root):
        if c.get("id") == cell_id:
            return c
    return None


def style_of(root, cell_id):
    cell = cell_by_id(root, cell_id)
    return "" if cell is None else (cell.get("style") or "")


def value_of(root, cell_id):
    obj = root.find(".//object[@id='%s']" % cell_id)
    if obj is not None:
        return obj.get("label") or ""
    cell = cell_by_id(root, cell_id)
    return "" if cell is None else (cell.get("value") or "")


def all_values(root):
    texts = [c.get("value") or "" for c in cells(root)]
    texts += [o.get("label") or "" for o in root.iter("object")]
    return " ".join(texts)


def document_order_ids(root):
    model_root = root.find("./diagram/mxGraphModel/root")
    return [child.get("id") for child in model_root]


def rendered_lines(value):
    """The emitted label's lines: a <br> is the break and nothing else."""
    return (value or "").split("<br>")


def wrap_replays_source(source, value):
    """True when the emitted breaks never lose a character of the source.

    A break either consumes whitespace from the source (a word boundary) or continues a
    token (an over-budget chunk); the remaining characters must match in order.
    """
    lines = rendered_lines(value)
    if not lines or lines[0] != source[:len(lines[0])]:
        return False
    pos = len(lines[0])
    for line in lines[1:]:
        while pos < len(source) and source[pos].isspace():
            pos += 1
        if source[pos:pos + len(line)] != line:
            return False
        pos += len(line)
    return pos == len(source)


def intra_token_breaks(source, value):
    """Source offsets where an emitted break falls inside a token (no whitespace there)."""
    lines = rendered_lines(value)
    pos, offsets = len(lines[0]), []
    for line in lines[1:]:
        if pos < len(source) and not source[pos].isspace():
            offsets.append(pos)
        while pos < len(source) and source[pos].isspace():
            pos += 1
        pos += len(line)
    return offsets


def token_at(source, offset):
    start = end = offset
    while start > 0 and not source[start - 1].isspace():
        start -= 1
    while end < len(source) and not source[end].isspace():
        end += 1
    return source[start:end]


def word_boundary_text(value):
    """Read a label whose breaks all fall on word boundaries: a <br> is one space."""
    return " ".join((value or "").replace("<br>", " ").split())


class TestValidator(unittest.TestCase):
    def test_valid_spec_has_no_errors(self):
        self.assertEqual(validate_spec.validate(context_spec()), [])

    def test_valid_component_spec_has_contract_and_provenance(self):
        self.assertEqual(validate_spec.validate(component_spec()), [])
    def test_non_component_view_contract_uses_same_provenance_rules(self):
        spec = context_spec()
        spec["view"] = {
            "question": "Which system owns requests?",
            "decision": "Keep ownership explicit.",
            "scenario": "Assumption: traffic retries.",
            "invariant": "Assumption: one owner handles a request.",
            "status": "proposed",
            "evidence": "docs/a.md:1",
            "evidence_kind": "document",
            "omissions": ["runtime health"],
        }
        for index, item in enumerate(spec["nodes"]):
            item.pop("evidence", None)
            item["identity"] = ["orders.customer", "orders.api", "orders.sap"][index]
            item["evidence_confidence"] = "assumed"
            item["lifecycle"] = "proposed"
        for item in spec["edges"]:
            item.pop("evidence", None)
            item.pop("evidence_kind", None)
            item["identity"] = "orders.%s-to-%s" % (item["from"], item["to"])
            item["evidence_confidence"] = "assumed"
            item["lifecycle"] = "proposed"
        self.assertEqual(validate_spec.validate(spec), [])

    def test_malformed_json_shapes_return_errors_without_traceback(self):
        cases = [
            context_spec(nodes=[None], edges=[]),
            context_spec(nodes={}, edges=[]),
            context_spec(nodes=[{
                "id": "bad", "label": "Bad", "kind": "system",
                "identity": [], "refines": {}, "evidence_confidence": "assumed",
                "lifecycle": "proposed",
            }], edges=[]),
        ]
        for spec in cases:
            errors = validate_spec.validate(spec)
            self.assertTrue(errors)

    def test_component_requires_lifecycle_and_evidence_confidence(self):
        spec = component_spec()
        del spec["nodes"][0]["lifecycle"]
        spec["nodes"][1]["evidence_confidence"] = "guess"
        errors = " ".join(validate_spec.validate(spec))
        self.assertIn("lifecycle", errors)
        self.assertIn("evidence_confidence", errors)
    def test_code_citation_cannot_claim_runtime_observation(self):
        spec = component_spec()
        spec["nodes"][0]["evidence_confidence"] = "observed"
        errors = " ".join(validate_spec.validate(spec))
        self.assertIn("runtime or deployment", errors)

    def test_component_rejects_mixed_container_level(self):
        spec = component_spec()
        spec["nodes"][1]["kind"] = "container"
        self.assertIn("whole-system kinds", " ".join(validate_spec.validate(spec)))

    def test_malformed_renderer_input_preserves_existing_output(self):
        inputs = [
            "{",
            json.dumps(context_spec(nodes=[None])),
            json.dumps(context_spec(groups="invalid")),
            json.dumps(context_spec(theme=[])),
            json.dumps(context_spec(title=["not", "text"])),
        ]
        with tempfile.TemporaryDirectory() as directory:
            source = os.path.join(directory, "invalid.json")
            output = os.path.join(directory, "protected.drawio")
            for content in inputs:
                with self.subTest(content=content):
                    with open(source, "w", encoding="utf-8") as handle:
                        handle.write(content)
                    with open(output, "w", encoding="utf-8") as handle:
                        handle.write("existing presentation")
                    with contextlib.redirect_stderr(io.StringIO()):
                        result = render_drawio.main([
                            source, "-o", output, "--acknowledge-manual-edits",
                        ])
                    self.assertEqual(result, 1)
                    with open(output, encoding="utf-8") as handle:
                        self.assertEqual(handle.read(), "existing presentation")

    def test_citations_require_a_source_and_positive_line(self):
        for citation in ("approved", "source.py:0", "source.py:-1"):
            with self.subTest(citation=citation):
                spec = context_spec()
                spec["nodes"][0]["evidence"] = citation
                self.assertTrue(validate_spec.validate(spec))

    def test_missing_required_metadata_is_reported(self):
        spec = context_spec()
        del spec["scope"]
        del spec["version"]
        errors = " ".join(validate_spec.validate(spec))
        self.assertIn("scope", errors)
        self.assertIn("version", errors)

    def test_unknown_kind_error_lists_catalog(self):
        spec = context_spec()
        spec["nodes"][0]["kind"] = "wizard"
        errors = " ".join(validate_spec.validate(spec))
        self.assertIn("wizard", errors)
        self.assertIn("person", errors, "error should print the known kinds")

    def test_unknown_diagram_type_is_reported(self):
        errors = " ".join(validate_spec.validate(context_spec(type="mindmap")))
        self.assertIn("mindmap", errors)

    def test_edge_to_unknown_node_is_reported(self):
        spec = context_spec()
        spec["edges"].append({"from": "acme", "to": "ghost", "label": "calls"})
        self.assertIn("ghost", " ".join(validate_spec.validate(spec)))

    def test_unlabeled_edge_is_reported(self):
        spec = context_spec()
        spec["edges"][0]["label"] = ""
        self.assertIn("label", " ".join(validate_spec.validate(spec)).lower())

    def test_orphan_node_is_reported(self):
        spec = context_spec()
        spec["nodes"].append({"id": "lonely", "label": "Lonely", "kind": "system",
                              "evidence": "docs/a.md:9"})
        self.assertIn("lonely", " ".join(validate_spec.validate(spec)))

    def test_duplicate_node_id_is_reported(self):
        spec = context_spec()
        spec["nodes"].append({"id": "cust", "label": "Dup", "kind": "person",
                              "evidence": "docs/a.md:9"})
        self.assertIn("cust", " ".join(validate_spec.validate(spec)))

    def test_exec_audience_node_cap(self):
        spec = context_spec()
        spec["nodes"] = [{"id": "n%d" % i, "label": "N%d" % i, "kind": "system",
                          "evidence": "docs/a.md:1"} for i in range(14)]
        spec["edges"] = [{"from": "n0", "to": "n%d" % i, "label": "uses"} for i in range(1, 14)]
        errors = " ".join(validate_spec.validate(spec))
        self.assertIn("12", errors)
        self.assertIn("split", errors.lower())

    def test_tech_audience_allows_more_nodes_than_exec_cap(self):
        spec = context_spec(audience="tech")
        spec["nodes"] = [{"id": "n%d" % i, "label": "N%d" % i, "kind": "system",
                          "evidence": "docs/a.md:1"} for i in range(14)]
        spec["edges"] = [{"from": "n0", "to": "n%d" % i, "label": "uses"} for i in range(1, 14)]
        self.assertEqual(validate_spec.validate(spec), [])

    def test_node_in_undeclared_group_is_reported(self):
        spec = container_spec()
        spec["nodes"][0]["group"] = "aws"
        self.assertIn("aws", " ".join(validate_spec.validate(spec)))

    def test_sequence_requires_participants(self):
        spec = context_spec(type="sequence")
        errors = " ".join(validate_spec.validate(spec))
        self.assertIn("participant", errors.lower())

    def test_state_requires_start_node(self):
        spec = {
            "title": "Order lifecycle", "type": "state", "audience": "tech",
            "version": "1.0", "date": "2026-09-09", "author": "T", "scope": "s",
            "nodes": [{"id": "a", "label": "New", "kind": "state", "evidence": "x:1"},
                      {"id": "b", "label": "Done", "kind": "end", "evidence": "x:2"}],
            "edges": [{"from": "a", "to": "b", "label": "ship"}],
        }
        self.assertIn("start", " ".join(validate_spec.validate(spec)).lower())

    def test_node_metric_over_48_chars_is_reported(self):
        spec = container_spec()
        spec["nodes"][1]["metric"] = "x" * 49
        errors = " ".join(validate_spec.validate(spec))
        self.assertIn("48", errors)
        self.assertIn("api", errors)

    def test_edge_metric_over_48_chars_is_reported(self):
        spec = container_spec()
        spec["edges"][0]["metric"] = "x" * 49
        errors = " ".join(validate_spec.validate(spec))
        self.assertIn("48", errors)
        self.assertIn("web -> api", errors)

    def test_metric_at_exactly_48_chars_is_accepted(self):
        spec = container_spec()
        spec["nodes"][1]["metric"] = "x" * 48
        spec["edges"][0]["metric"] = "y" * 48
        self.assertEqual(validate_spec.validate(spec), [])

    def test_metric_warning_does_not_change_validate_result(self):
        self.assertEqual(validate_spec.validate(container_spec()), [])

    def test_tech_container_without_metrics_warns(self):
        warnings = " ".join(validate_spec.collect_warnings(container_spec()))
        self.assertIn("metric", warnings)

    def test_warning_clears_when_any_node_has_metric(self):
        spec = container_spec()
        spec["nodes"][1]["metric"] = "12k QPS peak"
        self.assertEqual(validate_spec.collect_warnings(spec), [])

    def test_exec_context_diagram_never_warns_about_metrics(self):
        self.assertEqual(validate_spec.collect_warnings(context_spec()), [])
        self.assertEqual(validate_spec.collect_warnings(container_spec(audience="exec")), [])

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
        self.assertIn("one-to-many", " ".join(validate_spec.validate(spec)))

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


class TestRendererCommon(unittest.TestCase):
    def test_output_is_wellformed_mxfile(self):
        root = parse(render_drawio.render(context_spec()))
        self.assertEqual(root.tag, "mxfile")
        self.assertIsNotNone(root.find("./diagram/mxGraphModel/root"))

    def test_root_has_base_layers(self):
        root = parse(render_drawio.render(context_spec()))
        self.assertIsNotNone(cell_by_id(root, "0"))
        self.assertIsNotNone(cell_by_id(root, "1"))

    def test_title_block_carries_title_scope_version_date(self):
        text = all_values(parse(render_drawio.render(context_spec())))
        self.assertIn("Acme — System Context", text)
        self.assertIn("How customers reach Acme.", text)
        self.assertIn("v1.0", text)
        self.assertIn("2026-09-09", text)

    def test_every_node_becomes_a_cell_with_catalog_style(self):
        root = parse(render_drawio.render(context_spec()))
        self.assertIn("mxgraph.c4.person2", style_of(root, "cust"))
        self.assertIn("rounded=1", style_of(root, "acme"))

    def test_sublabel_is_rendered_under_label(self):
        root = parse(render_drawio.render(container_spec()))
        self.assertIn("Next.js", value_of(root, "web"))
        self.assertIn("Web App", value_of(root, "web"))

    def test_node_without_evidence_renders_unverified(self):
        spec = context_spec()
        del spec["nodes"][2]["evidence"]
        root = parse(render_drawio.render(spec))
        self.assertIn("dashed=1", style_of(root, "sap"))
        self.assertIn("UNVERIFIED", value_of(root, "sap"))

    def test_documented_node_has_confidence_without_runtime_claim(self):
        root = parse(render_drawio.render(component_spec()))
        self.assertNotIn("dashed=1", style_of(root, "api"))
        self.assertIn("documented", value_of(root, "api"))

    def test_citation_alone_is_visibly_unverified(self):
        root = parse(render_drawio.render(context_spec()))
        self.assertIn("UNVERIFIED", value_of(root, "acme"))

    def test_unknown_kind_raises_with_catalog_in_message(self):
        spec = context_spec()
        spec["nodes"][0]["kind"] = "wizard"
        with self.assertRaises(render_drawio.SpecError) as ctx:
            render_drawio.render(spec)
        self.assertIn("person", str(ctx.exception))

    def test_edges_are_labeled_and_carry_white_label_background(self):
        root = parse(render_drawio.render(context_spec()))
        edge = [c for c in cells(root) if c.get("edge") == "1"][0]
        self.assertTrue(edge.get("value"))
        self.assertIn("labelBackgroundColor=#ffffff", edge.get("style"))

    def test_unverified_routed_edge_style_keeps_numeric_width_and_anchor_coordinates(self):
        spec = container_spec()
        spec["edges"][0].pop("evidence_kind")
        spec["edges"][0].pop("evidence_confidence")
        root = parse(render_drawio.render(spec))
        edge = next(
            cell for cell in cells(root)
            if cell.get("source") == "web" and cell.get("target") == "api"
        )
        style = dict(
            part.split("=", 1) for part in edge.get("style", "").split(";")
            if "=" in part
        )

        stroke_width = float(style["strokeWidth"])
        self.assertTrue(math.isfinite(stroke_width))

        for coordinate in ("exitX", "exitY", "entryX", "entryY"):
            value = float(style[coordinate])
            self.assertTrue(math.isfinite(value), coordinate)
            self.assertGreaterEqual(value, 0.0, coordinate)
            self.assertLessEqual(value, 1.0, coordinate)

    def test_async_edge_is_dashed_and_sync_edge_is_not(self):
        root = parse(render_drawio.render(context_spec()))
        edges = {(c.get("source"), c.get("target")): c.get("style")
                 for c in cells(root) if c.get("edge") == "1"}
        self.assertIn("dashed=1", edges[("acme", "sap")])
        self.assertNotIn("dashed=1", edges[("cust", "acme")])

    def test_edge_between_rows_is_pinned_bottom_to_top(self):
        root = parse(render_drawio.render(container_spec()))
        edges = {(c.get("source"), c.get("target")): c.get("style")
                 for c in cells(root) if c.get("edge") == "1"}
        self.assertIn("exitX=0.5;exitY=1;", edges[("api", "db")])
        self.assertIn("entryX=0.5;entryY=0;", edges[("api", "db")])
        self.assertIn("exitX=1;exitY=0.5;", edges[("web", "api")])

    def test_icon_source_exits_below_its_label_block(self):
        spec = container_spec()
        spec["nodes"][1] = {"id": "api", "label": "Lambda", "kind": "aws:lambda", "group": "gcp",
                            "evidence": "docs/a.md:11"}
        root = parse(render_drawio.render(spec))
        edges = {(c.get("source"), c.get("target")): c
                 for c in cells(root) if c.get("edge") == "1"}
        self.assertIn("exitY=1;exitDx=0;exitDy=52;", edges[("api", "db")].get("style"))
        self.assertIn("exitPerimeter=0;", edges[("api", "db")].get("style"))
        self.assertNotIn("entryPerimeter=0;", edges[("api", "db")].get("style"))

    def test_fan_out_edges_carry_waypoints_and_centred_labels(self):
        spec = container_spec()
        spec["nodes"].append({"id": "queue", "label": "Events", "kind": "queue", "group": "gcp",
                              "evidence": "docs/a.md:13"})
        spec["edges"].append({"from": "api", "to": "queue", "label": "publishes", "style": "async"})
        root = parse(render_drawio.render(spec))
        edges = {(c.get("source"), c.get("target")): c
                 for c in cells(root) if c.get("edge") == "1"}
        for key in (("api", "db"), ("api", "queue")):
            points = edges[key].findall("./mxGeometry/Array/mxPoint")
            self.assertEqual(len(points), 2, key)
            self.assertEqual(points[0].get("y"), points[1].get("y"), key)
        ys = {edges[k].find("./mxGeometry/Array/mxPoint").get("y") for k in (("api", "db"), ("api", "queue"))}
        self.assertEqual(len(ys), 2)
        straight = edges[("web", "api")]
        self.assertIsNone(straight.find("./mxGeometry/Array"))
        self.assertEqual(straight.find("./mxGeometry").get("x"), "0")

    def test_legend_lists_every_kind_used(self):
        text = all_values(parse(render_drawio.render(context_spec())))
        self.assertIn("Legend", text)
        self.assertIn("Person", text)
        self.assertIn("Software System", text)
        self.assertIn("External System", text)

    def test_legend_explains_async_only_when_async_edge_exists(self):
        with_async = all_values(parse(render_drawio.render(context_spec())))
        self.assertIn("Asynchronous", with_async)
        spec = context_spec()
        spec["edges"][1].pop("style")
        self.assertNotIn("Asynchronous", all_values(parse(render_drawio.render(spec))))

    def test_legend_explains_unverified_only_when_present(self):
        spec = component_spec()
        self.assertNotIn("UNVERIFIED", all_values(parse(render_drawio.render(spec))))
        for field in ("evidence", "evidence_kind", "evidence_revision", "evidence_digest"):
            spec["nodes"][0].pop(field, None)
        spec["nodes"][0]["evidence_confidence"] = "unverified"
        self.assertIn("UNVERIFIED", all_values(parse(render_drawio.render(spec))))

    def test_evidence_is_kept_as_cell_tooltip(self):
        root = parse(render_drawio.render(context_spec()))
        obj = root.find(".//object[@id='acme']")
        self.assertIsNotNone(obj, "evidence-bearing node should be wrapped in an object cell")
        self.assertIn("docs/a.md:2", obj.get("evidence"))


    def test_component_view_contract_and_state_are_rendered(self):
        root = parse(render_drawio.render(component_spec()))
        self.assertIn("Which module owns retries?", all_values(root))
        self.assertIn("implemented", value_of(root, "api"))
        self.assertIn("measured", value_of(root, "api"))

    def test_edge_provenance_is_preserved_as_custom_properties(self):
        root = parse(render_drawio.render(component_spec()))
        edge = next(c for c in cells(root) if c.get("source") == "api")
        self.assertEqual(edge.get("evidence"), "src/api.py:10")
        self.assertEqual(edge.get("evidence_confidence"), "documented")
        self.assertEqual(edge.get("lifecycle"), "implemented")

    def test_render_is_deterministic(self):
        self.assertEqual(render_drawio.render(context_spec()),
                         render_drawio.render(context_spec()))

    def test_accent_theme_colour_reaches_the_title_rule(self):
        xml = render_drawio.render(context_spec(theme={"accent": "#AA0000"}))
        self.assertIn("#AA0000", xml)

    def test_metric_is_rendered_under_sublabel(self):
        spec = container_spec()
        spec["nodes"][1]["metric"] = "12k QPS peak · p99 200ms"
        value = value_of(parse(render_drawio.render(spec)), "api")
        self.assertIn("12k QPS peak", value)
        self.assertLess(value.index("[Go]"), value.index("12k QPS peak"))

    def test_constraint_is_stored_as_custom_property(self):
        spec = container_spec()
        spec["nodes"][1]["constraint"] = "3k QPS store ceiling"
        holder = parse(render_drawio.render(spec)).find(".//object[@id='api']")
        self.assertEqual(holder.get("constraint"), "3k QPS store ceiling")
        self.assertEqual(holder.get("evidence"), "docs/a.md:11")

    def test_constraint_without_evidence_still_renders_unverified(self):
        spec = container_spec()
        del spec["nodes"][1]["evidence"]
        spec["nodes"][1]["constraint"] = "3k QPS store ceiling"
        root = parse(render_drawio.render(spec))
        self.assertIn("dashed=1", style_of(root, "api"))
        self.assertIn("UNVERIFIED", value_of(root, "api"))
        holder = root.find(".//object[@id='api']")
        self.assertEqual(holder.get("constraint"), "3k QPS store ceiling")
        self.assertIsNone(holder.get("evidence"))


    def test_container_citation_only_edge_renders_unverified_and_supported_control_stays_clean(self):
        spec = container_spec()
        for node in spec["nodes"]:
            node.update({"evidence_kind": "document", "evidence_confidence": "documented"})
        spec["edges"][0].update({"evidence": "docs/a.md:edge"})
        for field in ("evidence_kind", "evidence_confidence"):
            spec["edges"][0].pop(field, None)
        spec["edges"][1].update({
            "evidence": "docs/a.md:edge-supported",
            "evidence_kind": "document",
            "evidence_confidence": "documented",
        })
        root = parse(render_drawio.render(spec))
        edges = {(c.get("source"), c.get("target")): c
                 for c in cells(root) if c.get("edge") == "1"}
        self.assertIn("UNVERIFIED", edges[("web", "api")].get("value"))
        self.assertIn("dashed=1", edges[("web", "api")].get("style"))
        self.assertNotIn("UNVERIFIED", edges[("api", "db")].get("value"))
        self.assertIn("UNVERIFIED", all_values(root))

    def test_sequence_citation_only_edge_renders_unverified_and_supported_control_stays_clean(self):
        spec = {
            "title": "Login", "type": "sequence", "audience": "tech",
            "version": "1.0", "date": "2026-09-09", "author": "T",
            "scope": "Login handshake.",
            "nodes": [
                {"id": "u", "label": "User", "kind": "participant",
                 "evidence": "x:1", "evidence_kind": "document",
                 "evidence_confidence": "documented"},
                {"id": "w", "label": "Web", "kind": "participant",
                 "evidence": "x:2", "evidence_kind": "document",
                 "evidence_confidence": "documented"},
            ],
            "edges": [
                {"from": "u", "to": "w", "label": "opens app", "evidence": "docs/flow.md:4"},
                {"from": "w", "to": "u", "label": "page", "style": "return",
                 "evidence": "docs/flow.md:5", "evidence_kind": "document",
                 "evidence_confidence": "documented"},
            ],
        }
        root = parse(render_drawio.render(spec))
        unsupported = cell_by_id(root, "_msg_0")
        supported = cell_by_id(root, "_msg_1")
        self.assertIn("UNVERIFIED", unsupported.get("value"))
        self.assertIn("dashed=1", unsupported.get("style"))
        self.assertNotIn("UNVERIFIED", supported.get("value"))
        self.assertIn("UNVERIFIED", all_values(root))

    def test_erd_citation_only_relation_renders_unverified_and_supported_control_stays_clean(self):
        spec = erd_spec()
        for node in spec["nodes"]:
            node.update({"evidence_kind": "document", "evidence_confidence": "documented"})
        spec["edges"][0]["evidence"] = "db/schema.sql:9"
        for field in ("evidence_kind", "evidence_confidence"):
            spec["edges"][0].pop(field, None)
        spec["edges"].append({
            "from": "customers", "to": "orders", "cardinality": "zero-or-one",
            "label": "last order", "evidence": "db/schema.sql:10",
            "evidence_kind": "document", "evidence_confidence": "documented",
        })
        root = parse(render_drawio.render(spec))
        edges = {(c.get("source"), c.get("target")): c
                 for c in cells(root) if c.get("edge") == "1"}
        self.assertIn("UNVERIFIED", edges[("orders", "customers")].get("value"))
        self.assertIn("dashed=1", edges[("orders", "customers")].get("style"))
        self.assertNotIn("UNVERIFIED", edges[("customers", "orders")].get("value"))
        self.assertIn("UNVERIFIED", all_values(root))

    def test_edge_metric_is_appended_as_second_label_line(self):
        spec = container_spec()
        spec["edges"][0]["metric"] = "p99 120ms"
        root = parse(render_drawio.render(spec))
        edges = {(c.get("source"), c.get("target")): c.get("value")
                 for c in cells(root) if c.get("edge") == "1"}
        self.assertIn("GraphQL<br>", edges[("web", "api")])
        self.assertIn("p99 120ms", edges[("web", "api")])
        self.assertNotIn("<br>", edges[("api", "db")])

    def test_sequence_message_carries_edge_metric(self):
        spec = {
            "title": "Login", "type": "sequence", "audience": "tech", "version": "1.0",
            "date": "2026-09-09", "author": "T", "scope": "Login handshake.",
            "nodes": [
                {"id": "u", "label": "User", "kind": "participant", "evidence": "x:1"},
                {"id": "w", "label": "Web", "kind": "participant", "evidence": "x:2"},
            ],
            "edges": [
                {"from": "u", "to": "w", "label": "opens app",
                 "evidence": "docs/flow.md:4", "evidence_kind": "document",
                 "evidence_confidence": "documented"},
                {"from": "w", "to": "u", "label": "page", "style": "return",
                 "metric": "p99 300ms", "evidence": "docs/flow.md:5",
                 "evidence_kind": "document", "evidence_confidence": "documented"},
            ],
        }
        root = parse(render_drawio.render(spec))
        self.assertIn("p99 300ms", cell_by_id(root, "_msg_1").get("value"))
        self.assertNotIn("<br>", cell_by_id(root, "_msg_0").get("value"))

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


class TestErdRenderer(unittest.TestCase):
    def test_erd_entity_preserves_lifecycle_and_confidence_properties(self):
        spec = erd_spec()
        entity = spec["nodes"][1]
        entity.update({
            "identity": "orders.database",
            "lifecycle": "proposed",
            "evidence_confidence": "documented",
        })
        root = parse(render_drawio.render(spec))
        obj = root.find(".//object[@id='orders']")
        self.assertEqual(obj.get("identity"), "orders.database")
        self.assertEqual(obj.get("lifecycle"), "proposed")
        self.assertEqual(obj.get("evidence_confidence"), "documented")
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
        self.assertEqual(texts[1], "FK customer_id : uuid ?")
        self.assertEqual(texts[2], "note : text ?")

    def test_entity_height_grows_with_columns(self):
        root = parse(render_drawio.render(erd_spec()))
        self.assertGreater(self.geom(root, "orders")[3], self.geom(root, "customers")[3],
                           "entity with 3 columns and metric must be taller than entity with 2 columns")
    def test_relation_carries_er_arrows_for_cardinality(self):
        root = parse(render_drawio.render(erd_spec()))
        edge = [c for c in cells(root) if c.get("source") == "orders"][0]
        self.assertIn("edgeStyle=orthogonalEdgeStyle", edge.get("style"))
        self.assertIn("startArrow=ERmany", edge.get("style"))
        self.assertIn("endArrow=ERmandOne", edge.get("style"))
        # The route is pinned to ports, so the drawn line is the checked one.
        for port in ("exitX=", "exitY=", "entryX=", "entryY="):
            self.assertIn(port, edge.get("style"))
        self.assertEqual(edge.get("value"), "placed by")

    def test_erd_relation_preserves_edge_evidence(self):
        root = parse(render_drawio.render(erd_spec()))
        edge = [c for c in cells(root) if c.get("source") == "orders"][0]
        self.assertEqual(edge.get("evidence"), "db/schema.sql:9")

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


class TestLayouts(unittest.TestCase):
    def geom(self, root, cell_id):
        cell = cell_by_id(root, cell_id)
        if cell is None:
            obj = root.find(".//object[@id='%s']" % cell_id)
            cell = obj.find("mxCell") if obj is not None else None
        g = cell.find("mxGeometry")
        return float(g.get("x")), float(g.get("y")), float(g.get("width")), float(g.get("height"))

    def test_context_places_person_left_system_centre_external_right(self):
        root = parse(render_drawio.render(context_spec()))
        person_x = self.geom(root, "cust")[0]
        system_x = self.geom(root, "acme")[0]
        ext_x = self.geom(root, "sap")[0]
        self.assertLess(person_x, system_x)
        self.assertLess(system_x, ext_x)

    def test_columns_are_spaced_wide_enough_for_edge_labels(self):
        root = parse(render_drawio.render(context_spec()))
        px, _, pw, _ = self.geom(root, "cust")
        sx = self.geom(root, "acme")[0]
        self.assertGreaterEqual(sx - (px + pw), render_drawio.MIN_LABEL_GAP)

    def test_layered_layout_puts_data_below_services(self):
        root = parse(render_drawio.render(container_spec()))
        self.assertLess(self.geom(root, "web")[1], self.geom(root, "db")[1])

    def test_explicit_layer_overrides_inferred_layer(self):
        spec = container_spec()
        spec["nodes"][2]["layer"] = 0
        root = parse(render_drawio.render(spec))
        self.assertLess(self.geom(root, "db")[1], self.geom(root, "web")[1])

    def test_group_is_drawn_as_a_labelled_box_behind_its_members(self):
        root = parse(render_drawio.render(container_spec()))
        self.assertIn("GCP asia-southeast1", all_values(root))
        group_cell = [c for c in cells(root)
                      if (c.get("value") or "").startswith("GCP asia")][0]
        order = document_order_ids(root)
        self.assertLess(order.index(group_cell.get("id")), order.index("web"),
                        "group box must be emitted before its members so it sits behind them")
        gx, gy, gw, gh = self.geom(root, group_cell.get("id"))
        wx, wy, ww, wh = self.geom(root, "web")
        self.assertLessEqual(gx, wx)
        self.assertLessEqual(gy, wy)
        self.assertGreaterEqual(gx + gw, wx + ww)
        self.assertGreaterEqual(gy + gh, wy + wh)

    def test_sequence_lifelines_are_spread_and_messages_stack_downwards(self):
        spec = {
            "title": "Login", "type": "sequence", "audience": "tech", "version": "1.0",
            "date": "2026-09-09", "author": "T", "scope": "Login handshake.",
            "nodes": [
                {"id": "u", "label": "User", "kind": "participant", "evidence": "x:1"},
                {"id": "w", "label": "Web", "kind": "participant", "evidence": "x:2"},
                {"id": "o", "label": "Okta", "kind": "participant", "evidence": "x:3"},
            ],
            "edges": [
                {"from": "u", "to": "w", "label": "opens app"},
                {"from": "w", "to": "o", "label": "redirect"},
                {"from": "o", "to": "w", "label": "token", "style": "return"},
            ],
        }
        root = parse(render_drawio.render(spec))
        self.assertLess(self.geom(root, "u")[0], self.geom(root, "w")[0])
        self.assertLess(self.geom(root, "w")[0], self.geom(root, "o")[0])
        messages = [c for c in cells(root)
                    if c.get("edge") == "1" and c.find("./mxGeometry/Array/mxPoint") is not None]
        msg_y = [float(c.find("./mxGeometry/Array/mxPoint").get("y")) for c in messages]
        self.assertEqual(msg_y, sorted(msg_y))
        self.assertEqual(len(msg_y), 3)

    def test_state_layout_starts_at_the_start_node(self):
        spec = {
            "title": "Order lifecycle", "type": "state", "audience": "tech", "version": "1.0",
            "date": "2026-09-09", "author": "T", "scope": "Order states.",
            "nodes": [
                {"id": "s", "label": "", "kind": "start", "evidence": "x:1"},
                {"id": "new", "label": "New", "kind": "state", "evidence": "x:2"},
                {"id": "done", "label": "Delivered", "kind": "end", "evidence": "x:3"},
            ],
            "edges": [
                {"from": "s", "to": "new", "label": "created"},
                {"from": "new", "to": "done", "label": "delivered"},
            ],
        }
        root = parse(render_drawio.render(spec))
        self.assertLess(self.geom(root, "s")[1], self.geom(root, "new")[1])
        self.assertLess(self.geom(root, "new")[1], self.geom(root, "done")[1])


class TestExportBinaryResolution(unittest.TestCase):
    def setUp(self):
        self._env = os.environ.get("DRAWIO_BIN")
        os.environ.pop("DRAWIO_BIN", None)

    def tearDown(self):
        os.environ.pop("DRAWIO_BIN", None)
        if self._env is not None:
            os.environ["DRAWIO_BIN"] = self._env

    def test_env_var_wins_over_everything(self):
        os.environ["DRAWIO_BIN"] = __file__
        self.assertEqual(export_drawio.resolve_binary(), __file__)

    def test_env_var_pointing_at_missing_file_is_rejected(self):
        os.environ["DRAWIO_BIN"] = "/nope/drawio"
        with self.assertRaises(export_drawio.DrawioNotFound):
            export_drawio.resolve_binary()

    def test_path_lookup_is_tried_before_bundle_defaults(self):
        calls = []
        original = export_drawio.shutil.which
        export_drawio.shutil.which = lambda name: calls.append(name) or __file__
        try:
            self.assertEqual(export_drawio.resolve_binary(), __file__)
        finally:
            export_drawio.shutil.which = original
        self.assertIn("drawio", calls)

    def test_missing_binary_raises_with_install_hint(self):
        original_which = export_drawio.shutil.which
        original_candidates = export_drawio.BUNDLE_CANDIDATES
        export_drawio.shutil.which = lambda name: None
        export_drawio.BUNDLE_CANDIDATES = ["/nope/one", "/nope/two"]
        try:
            with self.assertRaises(export_drawio.DrawioNotFound) as ctx:
                export_drawio.resolve_binary()
        finally:
            export_drawio.shutil.which = original_which
            export_drawio.BUNDLE_CANDIDATES = original_candidates
        message = str(ctx.exception)
        self.assertIn("brew install", message)
        self.assertIn("DRAWIO_BIN", message)


    def test_generated_baseline_allows_spec_change_but_rejects_hand_mutation(self):
        first = render_drawio.render(component_spec())
        second = render_drawio.render(component_spec(title="Changed title"))
        with tempfile.TemporaryDirectory() as directory:
            output = os.path.join(directory, "component.drawio")
            # Public render output may be redirected to a file and reformatted.
            with open(output, "w", encoding="utf-8") as handle:
                handle.write("\n" + first.replace("<diagram", "\n<diagram", 1))
            render_drawio.write_output(second, output)
            with open(output, encoding="utf-8") as handle:
                changed = handle.read()
            self.assertIn("Changed title", changed)
            hand_edited = changed.replace("Order API", "Hand-edited API", 1)
            with open(output, "w", encoding="utf-8") as handle:
                handle.write(hand_edited)
            with self.assertRaises(render_drawio.SpecError) as ctx:
                render_drawio.write_output(second, output)
            with open(output, encoding="utf-8") as handle:
                self.assertEqual(handle.read(), hand_edited)
        self.assertIn("manual edits detected", str(ctx.exception))


    def test_export_command_uses_embed_and_border_flags(self):
        cmd = export_drawio.build_command("/bin/drawio", "a.drawio", "a.png", "png", scale=2)
        self.assertEqual(cmd[0], "/bin/drawio")
        for flag in ("-x", "-e", "-b", "-f", "-o"):
            self.assertIn(flag, cmd)
        self.assertIn("png", cmd)
        self.assertIn("2", cmd)



class TestThemesAndLiteralEscaping(unittest.TestCase):
    def test_render_default_theme_is_light(self):
        xml = render_drawio.render(context_spec())
        root = parse(xml)
        model = root.find("./diagram/mxGraphModel")
        self.assertNotIn("background", model.attrib)
        self.assertIn("labelBackgroundColor=#ffffff", xml)

    def test_render_theme_dark_sets_dark_background_and_palette(self):
        xml = render_drawio.render(context_spec(), theme="dark")
        root = parse(xml)
        model = root.find("./diagram/mxGraphModel")
        self.assertEqual(model.get("background"), "#111827")
        self.assertEqual(model.get("pageBackgroundColor"), "#111827")
        self.assertIn("labelBackgroundColor=#111827", xml)
        self.assertIn("fontColor=#F9FAFB", style_of(root, "_title"))

    def test_render_spec_theme_mode_dark_defaults_to_dark(self):
        spec = context_spec(theme={"mode": "dark", "accent": "#3B82F6"})
        xml = render_drawio.render(spec)
        root = parse(xml)
        model = root.find("./diagram/mxGraphModel")
        self.assertEqual(model.get("background"), "#111827")

    def test_render_unknown_theme_raises_spec_error(self):
        with self.assertRaises(render_drawio.SpecError) as ctx:
            render_drawio.render(context_spec(), theme="neon")
        self.assertIn("unknown theme mode 'neon'", str(ctx.exception))

    def test_validate_spec_theme_modes(self):
        valid_light = context_spec(theme={"mode": "light"})
        valid_dark = context_spec(theme={"mode": "dark"})
        invalid_mode = context_spec(theme={"mode": "sepia"})
        self.assertEqual(validate_spec.validate(valid_light), [])
        self.assertEqual(validate_spec.validate(valid_dark), [])
        errors = validate_spec.validate(invalid_mode)
        self.assertTrue(any("theme mode must be 'light' or 'dark'" in e for e in errors))

    def test_literal_text_escaping_in_labels_and_values(self):
        spec = context_spec(
            title="<Special & Title>",
            nodes=[
                {"id": "cust", "label": "Customer <Admin> & 'Buyer'", "sublabel": "Role <Primary>",
                 "kind": "person", "evidence": "docs/a.md:1"},
                {"id": "acme", "label": "Acme <Core>", "kind": "system", "evidence": "docs/a.md:2"},
            ],
            edges=[
                {"from": "cust", "to": "acme", "label": "Sends <payload> & 'data'",
                 "evidence": "docs/a.md:4", "evidence_kind": "document", "evidence_confidence": "documented"},
            ]
        )
        xml = render_drawio.render(spec)
        root = parse(xml)
        title_val = value_of(root, "_title")
        self.assertIn("&lt;Special &amp; Title&gt;", title_val)
        node_val = value_of(root, "cust")
        self.assertIn("&lt;Admin&gt;", node_val)
        self.assertIn("&amp;", node_val)
        edge = next(c for c in cells(root) if c.get("edge") == "1")
        self.assertIn("&lt;payload&gt;", edge.get("value", ""))

    def test_palette_isolation_leaves_style_catalog_unmutated(self):
        import style_catalog
        orig_saas_style = style_catalog.STYLE_CATALOG["saas"]["style"]
        orig_edge_style = style_catalog.EDGE_STYLES["sync"]
        render_drawio.render(context_spec(), theme="dark")
        self.assertEqual(style_catalog.STYLE_CATALOG["saas"]["style"], orig_saas_style)
        self.assertEqual(style_catalog.EDGE_STYLES["sync"], orig_edge_style)

    def test_all_eight_diagram_types_render_both_themes(self):
        import glob
        fixtures_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "fixtures")
        for spec_path in sorted(glob.glob(os.path.join(fixtures_dir, "*.spec.json"))):
            with open(spec_path, encoding="utf-8") as f:
                spec = json.load(f)
            xml_light = render_drawio.render(spec, theme="light")
            xml_dark = render_drawio.render(spec, theme="dark")
            self.assertIn("<mxfile", xml_light)
            self.assertIn("<mxfile", xml_dark)
            self.assertIn('background="#111827"', xml_dark)

    def test_long_label_geometry_expands_footprint(self):
        spec = container_spec()
        spec["nodes"][1]["label"] = "A Very Long Container Label That Wraps Across Multiple Consecutive Lines In The Grid"
        spec["nodes"][1]["sublabel"] = "Extensive Technology Sublabel Explaining Runtime Architecture In Detail"
        lay = render_drawio.layout(spec)
        bx, by, bw, bh = lay.boxes["api"]
        cx, cy, cw, ch = lay.cells["api"]
        self.assertGreater(bh, 80)
        self.assertEqual(ch, bh)
        self.assertEqual(cw, 180)
    def test_person_shape_width_and_multiline_unverified_room(self):
        spec = context_spec()
        lay = render_drawio.layout(spec)
        bx, by, bw, bh = lay.boxes["cust"]
        cx, cy, cw, ch = lay.cells["cust"]
        self.assertGreater(cw, 80, "person shape width must be wider than narrow 80px to accommodate label")
        self.assertGreaterEqual(bw, cw)
        self.assertGreaterEqual(bh, 100)
        acme_x = lay.cells["acme"][0]
        self.assertGreaterEqual(acme_x - (cx + cw), render_drawio.MIN_LABEL_GAP,
                                "column separation must be preserved")
        self.assertEqual(check_layout.check(spec, lay), [])

    def test_person_dark_mode_contrast_and_style(self):
        import style_catalog
        dark_style = style_catalog.get_node_style("person", mode="dark")
        self.assertIn("fillColor=#1D70B8", dark_style)
        self.assertIn("strokeColor=#60A5FA", dark_style)
        self.assertIn("fontColor=#ffffff", dark_style)
        # WCAG contrast calculation
        def lum(hex_code):
            h = hex_code.lstrip("#")
            rgb = [int(h[i:i+2], 16)/255.0 for i in (0, 2, 4)]
            rgb_lin = [c/12.92 if c <= 0.03928 else ((c+0.055)/1.055)**2.4 for c in rgb]
            return 0.2126*rgb_lin[0] + 0.7152*rgb_lin[1] + 0.0722*rgb_lin[2]
        def cr(c1, c2):
            l1, l2 = lum(c1), lum(c2)
            return (max(l1, l2) + 0.05) / (min(l1, l2) + 0.05)
        bg_dark = style_catalog.DARK_BG  # #111827
        person_fill = "#1D70B8"
        person_stroke = "#60A5FA"
        white_text = "#ffffff"
        self.assertGreaterEqual(cr(person_fill, bg_dark), 3.0, "UI element fill contrast against dark BG >= 3.0")
        self.assertGreaterEqual(cr(white_text, person_fill), 4.5, "Text contrast on person fill >= 4.5 (WCAG AA)")
        self.assertGreaterEqual(cr(person_stroke, bg_dark), 3.0, "Stroke contrast against dark BG >= 3.0")

    def test_supported_aws_dark_mode_contrast(self):
        import style_catalog
        aws_style_dark = style_catalog.get_node_style("aws:lambda", mode="dark")
        self.assertIn("fontColor=#F9FAFB", aws_style_dark)
        self.assertIn("fillColor=#ED7100", aws_style_dark, "brand icon fill must be preserved")
        # Contrast of label text against dark background
        def lum(hex_code):
            h = hex_code.lstrip("#")
            rgb = [int(h[i:i+2], 16)/255.0 for i in (0, 2, 4)]
            rgb_lin = [c/12.92 if c <= 0.03928 else ((c+0.055)/1.055)**2.4 for c in rgb]
            return 0.2126*rgb_lin[0] + 0.7152*rgb_lin[1] + 0.0722*rgb_lin[2]
        def cr(c1, c2):
            l1, l2 = lum(c1), lum(c2)
            return (max(l1, l2) + 0.05) / (min(l1, l2) + 0.05)
        self.assertGreaterEqual(cr("#F9FAFB", style_catalog.DARK_BG), 4.5,
                                "AWS dark label text contrast against dark background >= 4.5 (WCAG AA)")

    def test_unverified_vendor_icon_stencils_preserve_brand_art(self):
        import style_catalog
        gcp_bq = style_catalog.STYLE_CATALOG["gcp:bigquery"]["style"]
        unverified_gcp = render_drawio._unverified_style(gcp_bq, mode="light")
        self.assertIn("fillColor=#3B8DF1", unverified_gcp, "vendor brand color must be preserved")
        self.assertNotIn("dashed=1", unverified_gcp, "vendor icon stencil shape must not be dashed")
        self.assertIn("fontColor=", unverified_gcp, "warning fontColor must be applied for label")

    def test_state_start_end_circle_label_placement(self):
        import style_catalog
        start_style = style_catalog.STYLE_CATALOG["start"]["style"]
        self.assertIn("verticalLabelPosition=bottom", start_style)
        self.assertIn("align=center", start_style)
        # Test layout with unverified start node
        spec = {
            "title": "State Flow", "type": "state",
            "nodes": [
                {"id": "s0", "kind": "start", "evidence": ""},
                {"id": "st1", "label": "Active", "kind": "state", "evidence": "a.go:1", "evidence_kind": "code", "evidence_confidence": "documented"},
            ],
            "edges": [{"from": "s0", "to": "st1", "label": "activate"}]
        }
        lay = render_drawio.layout(spec)
        cw, ch = lay.cells["s0"][2], lay.cells["s0"][3]
        self.assertEqual((cw, ch), (40, 40), "start circle symbol must remain 40x40")
        self.assertGreaterEqual(lay.boxes["s0"][3], 40, "footprint must reserve space for label below circle")
        self.assertEqual(check_layout.check(spec, lay), [])

    def test_sequence_participant_expansion_and_message_spacing(self):
        spec = {
            "title": "Sequence Flow", "type": "sequence",
            "nodes": [
                {"id": "client", "label": "Web Client Application", "sublabel": "Browser SPA with Detailed Runtime",
                 "kind": "participant", "evidence": "web.ts:1", "evidence_kind": "code", "evidence_confidence": "documented"},
                {"id": "server", "label": "Backend API Server", "sublabel": "Go Service Engine",
                 "kind": "participant", "evidence": "server.go:1", "evidence_kind": "code", "evidence_confidence": "documented"},
            ],
            "edges": [
                {"from": "client", "to": "server", "label": "POST /order with high payload",
                 "metric": "p99 150ms", "evidence": "api.ts:10", "evidence_kind": "code", "evidence_confidence": "documented"},
            ]
        }
        lay = render_drawio.layout(spec)
        part_h = lay.boxes["client"][3]
        self.assertGreater(part_h, 50, "participant footprint expands for sublabel")
        self.assertEqual(check_layout.check(spec, lay), [])

    def test_erd_entity_dimension_expansion(self):
        import render_erd
        node = {
            "id": "orders", "label": "Orders Table", "sublabel": "PostgreSQL Multi-AZ Primary",
            "kind": "entity", "lifecycle": "implemented", "evidence_confidence": "documented",
            "evidence": "schema.sql:1", "evidence_kind": "code",
            "columns": [
                {"name": "id", "type": "bigint", "pk": True},
                {"name": "very_long_custom_serialized_configuration_payload", "type": "jsonb with composite constraints", "nullable": False},
            ]
        }
        h = render_erd.entity_height(node)
        self.assertGreater(h, 30 + 22 * 2, "entity height expands to prevent text clipping")

    def test_header_and_group_bounds_expansion(self):
        spec = container_spec(
            title="A Very Long Architecture Title That Spans Multiple Lines In The Header Layout",
            scope="A very long scope description explaining in extensive prose the complete boundary, system context, excluded modules, external interactions, and security requirements across the entire stack.",
            view={
                "question": "How do order events propagate safely?",
                "decision": "Use event outbox pattern with transactional log tailing",
                "scenario": "Peak holiday flash sale volume",
                "invariant": "No lost payment events even during partition",
            }
        )
        lay = render_drawio.layout(spec)
        hx, hy, hw, hh = lay.header_box
        self.assertGreater(hh, 100, "header box must expand for multiline scope and view contract")
        # Verify all nodes sit strictly below the header box
        for node_id, (bx, by, bw, bh) in lay.boxes.items():
            self.assertGreaterEqual(by, hy + hh, "nodes must not overlap header box")
        self.assertEqual(check_layout.check(spec, lay), [])

    def test_multiline_unverified_edges_auto_expand_row_gap(self):
        fixtures_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "fixtures")
        with open(os.path.join(fixtures_dir, "dataflow.spec.json"), encoding="utf-8") as f:
            spec = json.load(f)
        lay = render_drawio.layout(spec)
        findings = check_layout.check(spec, lay)
        self.assertEqual(findings, [], "dataflow row gap must expand to eliminate label overlap")

    def test_all_eight_diagram_types_preserve_semantics_across_themes(self):
        from html.parser import HTMLParser
        class HTMLText(HTMLParser):
            def __init__(self, val):
                super().__init__()
                self.text = []
                self.feed(val or "")
            def handle_data(self, val):
                self.text.append(val)
        fixtures_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "fixtures")
        for spec_path in sorted(glob.glob(os.path.join(fixtures_dir, "*.spec.json"))):
            with open(spec_path, encoding="utf-8") as f:
                spec = json.load(f)
            xml_light = render_drawio.render(spec, theme="light")
            xml_dark = render_drawio.render(spec, theme="dark")
            root_l = parse(xml_light)
            root_d = parse(xml_dark)
            sem_l = sorted((c.get("id") or "", c.get("source") or "", c.get("target") or "", "".join(HTMLText(c.get("value")).text))
                           for c in cells(root_l))
            sem_d = sorted((c.get("id") or "", c.get("source") or "", c.get("target") or "", "".join(HTMLText(c.get("value")).text))
                           for c in cells(root_d))
            self.assertEqual(sem_l, sem_d)


class TestEmittedGeometryPlans(unittest.TestCase):
    """The plans the checker measures must be the geometry the renderer draws."""

    PROVENANCE = ("identity", "evidence", "evidence_kind", "evidence_revision",
                  "evidence_digest", "evidence_confidence", "lifecycle", "metric_provenance")

    def sequence_spec(self, label="Reads the ledger", metric="p99 90ms"):
        return {
            "title": "Ledger write", "type": "sequence", "audience": "tech",
            "version": "1.0", "date": "2026-09-13", "author": "Test",
            "scope": "One ledger write.",
            "nodes": [
                {"id": "buyer", "label": "Buyer", "kind": "participant", "evidence": "a.md:1"},
                {"id": "api", "label": "Order API", "kind": "participant", "evidence": "a.md:2"},
                {"id": "db", "label": "Ledger", "kind": "participant", "evidence": "a.md:3"},
            ],
            "edges": [
                {"id": "e0", "from": "buyer", "to": "api", "label": label, "metric": metric,
                 "evidence": "a.md:4", "evidence_kind": "document",
                 "evidence_confidence": "documented"},
                {"id": "e1", "from": "api", "to": "db", "label": label + " again",
                 "evidence": "a.md:5", "evidence_kind": "document",
                 "evidence_confidence": "documented"},
            ],
        }

    def test_sequence_message_cells_carry_populated_edge_provenance(self):
        spec = self.sequence_spec()
        edge = spec["edges"][0]
        edge.update({
            "identity": "sequence.message.write",
            "evidence": "docs/sequence.md:4",
            "evidence_kind": "document",
            "evidence_revision": "captured-review-revision",
            "evidence_digest": "sha256:" + "a" * 64,
            "evidence_confidence": "documented",
            "lifecycle": "proposed",
            "metric_provenance": "measured",
        })
        root = parse(render_drawio.render(spec))
        messages = [c for c in cells(root) if (c.get("id") or "").startswith("_msg_")]
        self.assertEqual(len(messages), len(spec["edges"]))
        for key in self.PROVENANCE:
            self.assertEqual(messages[0].get(key), str(edge[key]), key)
        # The supported control must not invent the fields it does not carry.
        self.assertIsNone(messages[1].get("identity"))

    def test_sequence_message_geometry_matches_the_shared_plan(self):
        spec = self.sequence_spec(label="POST /orders with a long tenant scoped payload " * 4)
        lay = render_drawio.layout(spec)
        messages = check_layout.sequence_messages(spec["nodes"], spec["edges"], lay.boxes)
        root = parse(render_drawio.render(spec))
        for message in messages:
            cell = cell_by_id(root, "_msg_%d" % message.index)
            geometry = cell.find("mxGeometry")
            self.assertEqual((float(geometry.get("width")), float(geometry.get("height"))),
                             (message.plan.width, message.plan.height), message.index)
            points = cell.findall(".//mxPoint")
            self.assertEqual(float(points[0].get("x")), message.source_x)
            self.assertEqual(float(points[1].get("x")), message.target_x)
            self.assertEqual(float(points[0].get("y")), float(message.y))
            self.assertEqual(float(points[1].get("y")), float(message.y))
            self.assertEqual(float(points[2].get("x")), message.anchor[0])
            self.assertEqual(cell.get("value"),
                             render_drawio._edge_value(message.edge))
        for index, message in enumerate(messages[1:], start=1):
            self.assertFalse(text_layout.rects_overlap(message.rect, messages[index - 1].rect),
                             "planned message rectangles must never overlap")
        for message in messages:
            for node in spec["nodes"]:
                self.assertFalse(
                    text_layout.rects_overlap(message.rect, lay.boxes[node["id"]]),
                    "planned message rectangle must clear participant %s" % node["id"])
        self.assertEqual(check_layout.check(spec, lay), [])

    def test_routed_edge_label_geometry_and_escaping_match_the_plan(self):
        spec = container_spec()
        edge = spec["edges"][0]
        edge["label"] = "Reads <orders> & writes"
        lay = render_drawio.layout(spec)
        root = parse(render_drawio.render(spec))
        plan = text_layout.edge_label_plan(edge)
        cell = next(c for c in cells(root)
                    if c.get("source") == edge["from"] and c.get("target") == edge["to"])
        geometry = cell.find("mxGeometry")
        self.assertEqual((float(geometry.get("width")), float(geometry.get("height"))),
                         (plan.width, plan.height))
        routes = {(e["from"], e["to"]): points
                  for e, points in check_layout.plan_routes(spec, lay.boxes, lay.rows)}
        fraction = check_layout.label_fraction(routes[(edge["from"], edge["to"])])
        self.assertEqual(geometry.get("x"), "%g" % (2 * fraction - 1))
        self.assertIn("&lt;orders&gt;", cell.get("value"))
        self.assertIn("&amp;", cell.get("value"))
        for line in plan.lines:
            self.assertIn(line.text, cell.get("value"))
    def test_ordinary_edge_waypoints_preserve_fractional_planned_coordinates(self):
        spec = container_spec()
        spec["nodes"].append({"id": "queue", "label": "Events", "kind": "queue", "group": "gcp",
                              "evidence": "docs/a.md:13"})
        spec["edges"].append({"from": "api", "to": "queue", "label": "publishes",
                              "evidence": "docs/a.md:15", "evidence_kind": "document",
                              "evidence_confidence": "documented"})
        lay = render_drawio.layout(spec)
        root = parse(render_drawio.render(spec))
        routes = {id(edge): points for edge, points in
                  check_layout.plan_routes(spec, lay.boxes, lay.rows)}
        drawn_edges = {cell.get("id"): cell for cell in cells(root)
                       if (cell.get("id") or "").startswith("_edge_")}
        expected_fractional_route = False
        for index, edge in enumerate(spec["edges"]):
            points = routes[id(edge)]
            expected = points[1:3] if len(points) == 4 and points[1] != points[2] else []
            drawn = [(float(point.get("x")), float(point.get("y")))
                     for point in drawn_edges["_edge_%d" % index].findall(
                         "mxGeometry/Array/mxPoint")]
            self.assertEqual(drawn, [(float(x), float(y)) for x, y in expected])
            expected_fractional_route |= any(x % 1 or y % 1 for x, y in expected)
        self.assertTrue(expected_fractional_route,
                        "fixture must exercise a fractional ordinary-edge waypoint")


    def test_cross_row_edge_label_rectangle_clears_every_other_node(self):
        spec = container_spec()
        lay = render_drawio.layout(spec)
        routes = {(e["from"], e["to"]): points
                  for e, points in check_layout.plan_routes(spec, lay.boxes, lay.rows)}
        edge = next(e for e in spec["edges"] if e["from"] == "api" and e["to"] == "db")
        plan = text_layout.edge_label_plan(edge)
        rect = text_layout.label_rect(check_layout.label_point(routes[("api", "db")]), plan)
        for node_id, box in lay.boxes.items():
            if node_id in ("api", "db"):
                continue
            self.assertFalse(text_layout.rects_overlap(rect, box), node_id)

    def test_erd_swimlane_start_size_rows_and_header_text_match_the_plan(self):
        spec = erd_spec()
        node = spec["nodes"][1]
        node.update({
            "label": "Orders with tenant scoped reconciliation history " * 2,
            "sublabel": "PostgreSQL multi-region primary with async replica",
            "lifecycle": "implemented",
            "evidence_confidence": "documented",
        })
        node["columns"] = [
            {"name": "id", "type": "uuid", "pk": True},
            {"name": "tenant_scoped_reconciliation_identifier_with_semantic_meaning",
             "type": "numeric(38, 12) with check constraint and default", "nullable": False},
        ]
        plan = text_layout.entity_plan(node, render_erd.ENTITY_W)
        self.assertGreater(plan.header_height, text_layout.ENTITY_HEADER_MIN_H)
        root = parse(render_drawio.render(spec))
        lay = render_drawio.layout(spec)

        self.assertIn("startSize=%d;" % plan.header_height, style_of(root, "orders"))
        entity = cell_by_id(root, "orders")
        geometry = entity.find("mxGeometry")
        self.assertEqual(float(geometry.get("height")), plan.total_height)
        self.assertEqual(float(geometry.get("y")), lay.cells["orders"][1])
        self.assertEqual(value_of(root, "orders"), plan.header_text)

        cur_y = plan.header_height
        for index, row in enumerate(plan.rows):
            row_cell = cell_by_id(root, "orders__row_%d" % index)
            row_geometry = row_cell.find("mxGeometry")
            self.assertEqual(row_cell.get("value"), row.text)
            self.assertEqual(float(row_geometry.get("y")), cur_y)
            self.assertEqual(float(row_geometry.get("height")), row.height)
            self.assertNotIn("overflow=hidden", row_cell.get("style"))
            cur_y += row.height
        self.assertEqual(cur_y, plan.total_height)
        # The long column is emitted in full and wrapped, never clipped: the emitted
        # breaks consume only source whitespace or continue an over-budget token, every
        # word that fits the row budget stays intact on one line, and no line exceeds it.
        column = node["columns"][1]
        source_text = text_layout.entity_row_text(column)
        emitted = cell_by_id(root, "orders__row_1").get("value")
        self.assertTrue(wrap_replays_source(source_text, emitted),
                        "wrapped rows must keep every source character in order")
        budget = text_layout.chars_for(render_erd.ENTITY_W, text_layout.ENTITY_ROW_SIZE,
                                       2 * text_layout.ENTITY_ROW_SPACING + 4)
        lines = rendered_lines(emitted)
        self.assertGreater(len(lines), 1)
        self.assertGreater(plan.rows[1].height, text_layout.ENTITY_ROW_MIN_H)
        for line in lines:
            self.assertLessEqual(len(line), budget, line)
        for word in source_text.split():
            if len(word) <= budget:
                self.assertTrue(any(word in line for line in lines),
                                "word %r must survive intact on one line" % word)
        breaks = intra_token_breaks(source_text, emitted)
        self.assertTrue(breaks, "the over-budget identifier must be chunked, not clipped")
        for offset in breaks:
            self.assertGreater(len(token_at(source_text, offset)), budget,
                               "only an over-budget token may break mid-token")
        self.assertIn("tenant_scoped_reconciliation_identifier_with_semantic_meaning",
                      "".join(lines))

    def test_header_plan_owns_every_emitted_header_offset(self):
        spec = container_spec(
            title="A deliberately long architecture title that has to wrap " * 2,
            scope="A long scope that explains the boundary in prose " * 6,
            view={
                "question": "How do orders travel safely? " * 3,
                "decision": "Outbox with transactional log tailing " * 3,
                "scenario": "Peak sale volume " * 4,
                "invariant": "No lost payment events " * 4,
            },
        )
        lay = render_drawio.layout(spec)
        header = lay.header
        self.assertIsNotNone(header.contract)
        self.assertGreater(header.body_y, header.rule_y)
        root = parse(render_drawio.render(spec))
        blocks = (("_title", header.title), ("_meta", header.meta),
                  ("_view_contract", header.contract))
        for cell_id, block in blocks:
            cell = cell_by_id(root, cell_id)
            geometry = cell.find("mxGeometry")
            self.assertEqual(cell.get("value"), block.text, cell_id)
            self.assertEqual(
                (float(geometry.get("x")), float(geometry.get("y")),
                 float(geometry.get("width")), float(geometry.get("height"))),
                (float(render_drawio.MARGIN_X + block.x), float(block.y),
                 float(block.width), float(block.height)), cell_id)
            self.assertIn("fontSize=%d" % block.size, cell.get("style"))
        rule = cell_by_id(root, "_rule").find("mxGeometry")
        self.assertEqual(float(rule.get("y")), float(header.rule_y))
        self.assertEqual(lay.header_box,
                         (render_drawio.MARGIN_X, text_layout.HEADER_TITLE_Y,
                          header.width, header.height))
        for node_id, (_, y, _, _) in lay.boxes.items():
            self.assertGreaterEqual(y, header.body_y, node_id)
        meta = word_boundary_text(cell_by_id(root, "_meta").get("value"))
        self.assertIn(spec["scope"], meta)

    def test_erd_header_wraps_at_the_emitted_swimlane_font(self):
        spec = erd_spec()
        node = spec["nodes"][1]
        node.update({
            "label": "Orders ledger",
            "sublabel": "PostgreSQL multi-region primary with asynchronous replica and "
                        "tenant scoped reconciliation history retained for audit replay",
            "lifecycle": "implemented",
            "evidence_confidence": "documented",
            "metric": "4M rows retained · measured over the last full billing cycle",
            "metric_provenance": "measured",
        })
        plan = text_layout.entity_plan(node, render_erd.ENTITY_W)
        root = parse(render_drawio.render(spec))
        style = dict(part.split("=", 1) for part in style_of(root, "orders").split(";")
                     if "=" in part)
        self.assertEqual(int(style["fontSize"]), text_layout.ENTITY_HEADER_FONT)
        self.assertEqual(int(style["startSize"]), plan.header_height)
        self.assertEqual(value_of(root, "orders"), plan.header_text)

        budget = text_layout.entity_header_budget(render_erd.ENTITY_W)
        allowed = render_erd.ENTITY_W - 2 * text_layout.ENTITY_PAD_X
        lines = rendered_lines(plan.header_text)
        self.assertGreater(len(lines), 4, "long sublabel, state, and metric must wrap")
        for line in lines:
            self.assertLessEqual(len(line), budget, line)
            self.assertLessEqual(
                len(line) * text_layout.char_px(text_layout.ENTITY_HEADER_FONT), allowed, line)
        source = " ".join(text_layout._entity_header_parts(node))
        self.assertTrue(wrap_replays_source(source, plan.header_text),
                        "header wrapping must keep every part's characters in order")
        for word in ("asynchronous", "replica", "reconciliation", "measured"):
            self.assertTrue(any(word in line for line in lines),
                            "header word %r must survive intact on one line" % word)

    def test_erd_relation_is_drawn_on_the_route_the_checker_measures(self):
        spec = erd_spec()
        spec["edges"].append({"from": "customers", "to": "orders", "cardinality": "zero-or-one",
                              "label": "last order", "evidence": "db/schema.sql:10",
                              "evidence_kind": "document",
                              "evidence_confidence": "documented"})
        lay = render_drawio.layout(spec)
        root = parse(render_drawio.render(spec))
        routes = {id(edge): points for edge, points in
                  check_layout.plan_routes(spec, lay.boxes, lay.rows)}
        relations = {cell.get("id"): cell for cell in cells(root)
                     if (cell.get("id") or "").startswith("_rel_")}
        for index, edge in enumerate(spec["edges"]):
            cell = relations["_rel_%d" % index]
            points = routes[id(edge)]
            geometry = cell.find("mxGeometry")
            plan = text_layout.edge_label_plan(edge)
            self.assertEqual((float(geometry.get("width")), float(geometry.get("height"))),
                             (plan.width, plan.height))
            self.assertEqual(geometry.get("x"),
                             "%g" % (2 * check_layout.label_fraction(points) - 1))
            expected = points[1:3] if len(points) == 4 and points[1] != points[2] else []
            drawn = [(float(point.get("x")), float(point.get("y")))
                     for point in geometry.findall("./Array/mxPoint")]
            self.assertEqual(drawn, [(float(x), float(y)) for x, y in expected])
            sides = check_layout.anchor_sides(lay.boxes[edge["from"]],
                                              lay.boxes[edge["to"]])
            (ex, ey) = render_drawio._PORTS[sides[0]]
            (nx, ny) = render_drawio._PORTS[sides[1]]
            style = dict(part.split("=", 1) for part in cell.get("style").split(";")
                         if "=" in part)
            self.assertEqual((style["exitX"], style["exitY"], style["entryX"], style["entryY"]),
                             (str(ex), str(ey), str(nx), str(ny)))
            self.assertIn("edgeStyle=orthogonalEdgeStyle", cell.get("style"))
            self.assertIn("startArrow=%s" % render_erd.ER_ARROWS[
                edge["cardinality"]][0], cell.get("style"))

    def test_group_headers_expanding_upward_push_the_body_below_the_rule(self):
        spec = container_spec(groups=[{
            "id": "gcp",
            "label": "Explicit security boundary and ownership responsibility " * 6,
            "kind": "boundary",
        }])
        lay = render_drawio.layout(spec)
        group_top = min(box[1] for box in lay.groups.values())
        self.assertGreaterEqual(group_top,
                                lay.header.rule_y + text_layout.HEADER_BODY_GAP)
        self.assertGreaterEqual(min(box[1] for box in lay.boxes.values()),
                                lay.header.body_y)
        self.assertEqual(check_layout.check(spec, lay), [])

    def test_state_terminal_is_distinct_from_start_in_both_themes(self):
        import style_catalog

        def tokens(style):
            return dict(part.split("=", 1) for part in style.split(";") if "=" in part)

        for mode in ("light", "dark"):
            start = tokens(style_catalog.get_node_style("start", mode=mode))
            end = tokens(style_catalog.get_node_style("end", mode=mode))
            self.assertIn("doubleEllipse", end.get("shape", ""))
            self.assertNotIn("shape", start)
            self.assertEqual(end.get("strokeWidth"), "3")
            self.assertNotEqual(start.get("fillColor"), end.get("fillColor"))
            self.assertEqual((end.get("fillColor"), end.get("strokeColor")),
                             (style_catalog.DARK_BG, "#F9FAFB") if mode == "dark"
                             else ("#FFFFFF", "#1F2933"))

        spec = {
            "title": "Order lifecycle", "type": "state", "audience": "tech",
            "version": "1.0", "date": "2026-09-09", "author": "T", "scope": "States.",
            "nodes": [
                {"id": "s", "kind": "start", "evidence": "x:1"},
                {"id": "d", "label": "Delivered", "kind": "end", "evidence": "x:2"},
            ],
            "edges": [{"from": "s", "to": "d", "label": "delivered"}],
        }
        root = parse(render_drawio.render(spec, theme="dark"))
        self.assertIn("doubleEllipse", style_of(root, "d"))
        self.assertIn("strokeWidth=3", style_of(root, "d"))
        self.assertNotIn("doubleEllipse", style_of(root, "s"))

    def test_circle_under_label_width_and_height_are_emitted_not_just_planned(self):
        spec = {
            "title": "State flow", "type": "state", "audience": "tech", "version": "1.0",
            "date": "2026-09-09", "author": "T", "scope": "One circle label.",
            "nodes": [
                {"id": "s", "label": "Settlement start for every captured payment",
                 "kind": "start", "evidence": "x:1", "evidence_kind": "code",
                 "evidence_confidence": "documented"},
                {"id": "st", "label": "Active", "kind": "state", "evidence": "x:2",
                 "evidence_kind": "code", "evidence_confidence": "documented"},
            ],
            "edges": [{"from": "s", "to": "st", "label": "activate"}],
        }
        lay = render_drawio.layout(spec)
        plan = text_layout.circle_label_plan(spec["nodes"][0])
        self.assertGreater(plan.width, 40)
        root = parse(render_drawio.render(spec))
        style = style_of(root, "s")
        self.assertIn("labelWidth=%d;" % plan.width, style)
        self.assertIn("labelHeight=%d;" % plan.height, style)
        self.assertEqual(lay.boxes["s"][2], max(40, plan.width))
        self.assertEqual(lay.boxes["s"][3], 40 + 8 + plan.height)
        self.assertEqual(cell_by_id(root, "s").find("mxGeometry").get("width"), "40")


if __name__ == "__main__":
    unittest.main(verbosity=2)
