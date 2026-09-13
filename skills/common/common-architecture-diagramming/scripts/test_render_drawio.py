#!/usr/bin/env python3
"""Unit tests for the diagram spec validator, renderer, and export wrapper.

Run: python3 test_render_drawio.py
"""

import os
import sys
import unittest
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import export_drawio
import render_drawio
import validate_spec


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
            {"from": "cust", "to": "acme", "label": "Places order"},
            {"from": "acme", "to": "sap", "label": "Syncs orders", "style": "async"},
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
            {"from": "web", "to": "api", "label": "GraphQL"},
            {"from": "api", "to": "db", "label": "SQL"},
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


class TestValidator(unittest.TestCase):
    def test_valid_spec_has_no_errors(self):
        self.assertEqual(validate_spec.validate(context_spec()), [])

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

    def test_node_with_evidence_is_not_dashed(self):
        root = parse(render_drawio.render(context_spec()))
        self.assertNotIn("dashed=1", style_of(root, "acme"))

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

    def test_async_edge_is_dashed_and_sync_edge_is_not(self):
        root = parse(render_drawio.render(context_spec()))
        edges = {(c.get("source"), c.get("target")): c.get("style")
                 for c in cells(root) if c.get("edge") == "1"}
        self.assertIn("dashed=1", edges[("acme", "sap")])
        self.assertNotIn("dashed=1", edges[("cust", "acme")])

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
        self.assertNotIn("UNVERIFIED", all_values(parse(render_drawio.render(context_spec()))))
        spec = context_spec()
        del spec["nodes"][2]["evidence"]
        self.assertIn("UNVERIFIED", all_values(parse(render_drawio.render(spec))))

    def test_evidence_is_kept_as_cell_tooltip(self):
        root = parse(render_drawio.render(context_spec()))
        obj = root.find(".//object[@id='acme']")
        self.assertIsNotNone(obj, "evidence-bearing node should be wrapped in an object cell")
        self.assertIn("docs/a.md:2", obj.get("evidence"))

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

    def test_node_without_metric_has_no_extra_label_line(self):
        value = value_of(parse(render_drawio.render(container_spec())), "web")
        self.assertEqual(value.count("<br>"), 1)

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
                {"from": "u", "to": "w", "label": "opens app"},
                {"from": "w", "to": "u", "label": "page", "style": "return", "metric": "p99 300ms"},
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

    def test_export_command_uses_embed_and_border_flags(self):
        cmd = export_drawio.build_command("/bin/drawio", "a.drawio", "a.png", "png", scale=2)
        self.assertEqual(cmd[0], "/bin/drawio")
        for flag in ("-x", "-e", "-b", "-f", "-o"):
            self.assertIn(flag, cmd)
        self.assertIn("png", cmd)
        self.assertIn("2", cmd)


if __name__ == "__main__":
    unittest.main(verbosity=2)
