#!/usr/bin/env python3
"""Tests for the geometric layout check and the layout() geometry API."""

import os
import sys
import unittest
import xml.etree.ElementTree as ET

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
        spec = {"type": "sequence", "nodes": [{"id": "u"}, {"id": "w"}],
                "edges": [{"from": "u", "to": "w"}]}
        lay = layout_of({"u": (0, 0, 160, 50), "w": (0, 0, 160, 50)})
        findings = check_layout.check(spec, lay)
        self.assertTrue(findings)
        self.assertTrue(all("->" not in f for f in findings))

    def test_layout_boxes_match_rendered_geometry(self):
        spec = container_spec()
        lay = render_drawio.layout(spec)
        root = ET.fromstring(render_drawio.render(spec))
        for node_id, (x, y, w, h) in lay.boxes.items():
            g = root.find(".//object[@id='%s']/mxCell/mxGeometry" % node_id)
            if g is None:
                g = root.find(".//mxCell[@id='%s']/mxGeometry" % node_id)
            self.assertEqual((float(g.get("x")), float(g.get("y"))), (float(x), float(y)), node_id)

    def test_layout_groups_match_rendered_group_box(self):
        spec = container_spec()
        lay = render_drawio.layout(spec)
        root = ET.fromstring(render_drawio.render(spec))
        g = root.find(".//mxCell[@id='_group_gcp']/mxGeometry")
        x, y, w, h = lay.groups["gcp"]
        self.assertEqual((g.get("x"), g.get("y"), g.get("width"), g.get("height")),
                         (str(x), str(y), str(w), str(h)))


if __name__ == "__main__":
    unittest.main()
