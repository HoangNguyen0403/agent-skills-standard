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

    def test_different_rows_leave_the_bottom_and_enter_the_top(self):
        pts = check_layout.route((0, 0, 100, 50), (300, 200, 100, 50))
        self.assertEqual(len(pts), 4)
        self.assertEqual(pts[0], (50.0, 50.0))
        self.assertEqual(pts[1][1], pts[2][1])          # the crossing runs in the row gap
        self.assertEqual(pts[-1], (350.0, 200.0))

    def test_anchor_sides_match_route(self):
        self.assertEqual(check_layout.anchor_sides((0, 0, 100, 50), (300, 0, 100, 50)), ("right", "left"))
        self.assertEqual(check_layout.anchor_sides((300, 0, 100, 50), (0, 10, 100, 50)), ("left", "right"))
        self.assertEqual(check_layout.anchor_sides((0, 0, 100, 50), (300, 200, 100, 50)), ("bottom", "top"))
        self.assertEqual(check_layout.anchor_sides((0, 200, 100, 50), (300, 0, 100, 50)), ("top", "bottom"))

    def test_hub_in_a_row_reaches_the_next_row_without_crossing_neighbours(self):
        spec = container_spec()
        spec["nodes"].append({"id": "queue", "label": "Events", "kind": "queue", "group": "gcp",
                              "evidence": "docs/a.md:13"})
        spec["edges"].append({"from": "web", "to": "queue", "label": "publishes", "style": "async"})
        self.assertEqual(check_layout.check(spec, render_drawio.layout(spec)), [])

    def test_straight_edge_label_sits_halfway(self):
        self.assertEqual(check_layout.label_point([(0.0, 0.0), (100.0, 0.0)]), (50.0, 0.0))

    def test_bent_edge_label_sits_on_the_middle_leg(self):
        pts = [(50.0, 50.0), (50.0, 100.0), (350.0, 100.0), (350.0, 200.0)]
        self.assertEqual(check_layout.label_point(pts), (200.0, 100.0))


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
        # route runs y=25 from x=100 to x=400; the halfway point is x=250, inside c
        lay = layout_of({"a": (0, 0, 100, 50), "b": (400, 0, 100, 50), "c": (235, 0, 30, 50)})
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
        for node_id, (x, y, w, h) in lay.cells.items():
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


class TestLayoutRules(unittest.TestCase):
    def test_icon_kinds_reserve_room_for_the_label_underneath(self):
        spec = container_spec()
        spec["nodes"][2] = {"id": "db", "label": "Postgres", "sublabel": "Multi-AZ",
                            "kind": "aws:rds", "group": "gcp", "evidence": "docs/a.md:12",
                            "metric": "2 TB"}
        lay = render_drawio.layout(spec)
        x, y, w, h = lay.boxes["db"]
        self.assertGreater(h, 58, "footprint must include the label block under the icon")
        self.assertGreater(w, 66, "footprint must include a label wider than the icon")
        self.assertEqual(lay.cells["db"][2:], (66, 58))

    def test_group_members_are_contiguous_and_non_members_sit_outside(self):
        spec = container_spec()
        del spec["nodes"][1]["group"]             # api leaves the group
        spec["nodes"].insert(0, spec["nodes"].pop(1))   # and is listed first, so naive order puts it left
        spec["nodes"].append({"id": "queue", "label": "Events", "kind": "queue",
                              "evidence": "docs/a.md:13"})
        spec["edges"].append({"from": "api", "to": "queue", "label": "publishes", "style": "async"})
        lay = render_drawio.layout(spec)
        gx, gy, gw, gh = lay.groups["gcp"]
        for outsider in ("api", "queue"):
            x, y, w, h = lay.boxes[outsider]
            self.assertGreaterEqual(x, gx + gw, outsider)
        self.assertEqual(check_layout.check(spec, lay), [])

    def test_earlier_group_keeps_its_place_when_a_row_lacks_the_later_group(self):
        spec = container_spec()
        spec["groups"] = [{"id": "a", "label": "A", "kind": "boundary"},
                          {"id": "b", "label": "B", "kind": "boundary"}]
        # row 2: web (a), api (b); row 3: db (a) only
        spec["nodes"][0]["group"] = "a"
        spec["nodes"][1]["group"] = "b"
        spec["nodes"][2]["group"] = "a"
        lay = render_drawio.layout(spec)
        self.assertLess(lay.boxes["db"][0], lay.boxes["api"][0])
        self.assertEqual(check_layout.check(spec, lay), [])


class TestRoutePlanning(unittest.TestCase):
    def fan_spec(self):
        spec = container_spec()
        spec["nodes"].append({"id": "queue", "label": "Events", "kind": "queue", "group": "gcp",
                              "evidence": "docs/a.md:13"})
        spec["nodes"].append({"id": "blob", "label": "Blobs", "kind": "gcp:gcs", "group": "gcp",
                              "evidence": "docs/a.md:14"})
        spec["edges"] += [{"from": "api", "to": "queue", "label": "publishes", "style": "async"},
                          {"from": "api", "to": "blob", "label": "PUT object"}]
        return spec

    def test_fan_out_edges_bend_at_distinct_heights_inside_the_gap(self):
        spec = self.fan_spec()
        lay = render_drawio.layout(spec)
        routes = check_layout.plan_routes(spec, lay.boxes)
        bends = [pts[1][1] for edge, pts in routes if edge["from"] == "api" and len(pts) == 4]
        self.assertEqual(len(bends), 3)
        self.assertEqual(len(set(bends)), 3, "each fan-out edge gets its own bend height")
        ax, ay, aw, ah = lay.boxes["api"]
        top_of_next_row = min(lay.boxes[t][1] for t in ("db", "queue", "blob"))
        for y in bends:
            self.assertGreater(y, ay + ah)
            self.assertLess(y, top_of_next_row)

    def test_straight_edge_in_a_fan_takes_a_slot_for_its_label(self):
        spec = {"type": "container", "nodes": [{"id": "a"}, {"id": "b"}, {"id": "c"}],
                "edges": [{"from": "a", "to": "b"}, {"from": "a", "to": "c"}]}
        boxes = {"a": (100, 0, 100, 50), "b": (100, 200, 100, 50), "c": (400, 200, 100, 50)}
        routes = {e["to"]: pts for e, pts in check_layout.plan_routes(spec, boxes)}
        self.assertEqual(routes["b"][1], routes["b"][2], "straight edge keeps a zero-length leg")
        self.assertEqual(routes["b"][0][0], routes["b"][-1][0])
        label_ys = {check_layout.label_point(pts)[1] for pts in routes.values()}
        self.assertEqual(len(label_ys), 2, "each fan edge labels at its own height")
        self.assertTrue(all(50 < y < 200 for y in label_ys))

    def test_row_gap_grows_with_fan_out(self):
        narrow = render_drawio.layout(container_spec())
        wide = render_drawio.layout(self.fan_spec())
        gap = lambda lay: lay.boxes["db"][1] - (lay.boxes["api"][1] + lay.boxes["api"][3])
        self.assertGreater(gap(wide), gap(narrow))

    def test_planned_routes_are_what_the_checker_uses(self):
        spec = self.fan_spec()
        lay = render_drawio.layout(spec)
        self.assertEqual(check_layout.check(spec, lay), [])


class TestFootprintsAndRows(unittest.TestCase):
    def test_icon_footprint_is_wider_than_its_cell_and_centred_on_it(self):
        spec = container_spec()
        spec["nodes"][2] = {"id": "db", "label": "Postgres", "sublabel": "Multi-AZ",
                            "kind": "aws:rds", "group": "gcp", "evidence": "docs/a.md:12"}
        lay = render_drawio.layout(spec)
        bx, by, bw, bh = lay.boxes["db"]
        cx, cy, cw, ch = lay.cells["db"]
        self.assertEqual((cw, ch), (66, 58))
        self.assertGreater(bw, cw)
        self.assertEqual(cx - bx, (bw - cw) / 2)
        self.assertEqual(lay.cells["web"], lay.boxes["web"])

    def test_layered_layout_reports_row_per_node(self):
        lay = render_drawio.layout(container_spec())
        self.assertEqual(lay.rows["web"], lay.rows["api"])
        self.assertEqual(lay.rows["db"], lay.rows["api"] + 1)
        self.assertEqual(render_drawio.layout(context_spec()).rows, {})


class TestGapSlots(unittest.TestCase):
    def spec(self):
        return {"type": "container",
                "nodes": [{"id": "a"}, {"id": "b"}, {"id": "c"}, {"id": "d"}],
                "edges": [{"from": "a", "to": "c"}, {"from": "b", "to": "d"}, {"from": "d", "to": "a"}]}

    def boxes(self):
        return {"a": (0, 0, 100, 50), "b": (400, 0, 100, 50),
                "c": (400, 200, 100, 50), "d": (0, 200, 100, 50)}

    def rows(self):
        return {"a": 0, "b": 0, "c": 1, "d": 1}

    def test_edges_sharing_a_row_gap_take_distinct_slots_regardless_of_source_or_direction(self):
        routes = check_layout.plan_routes(self.spec(), self.boxes(), self.rows())
        ys = [check_layout.label_point(pts)[1] for _, pts in routes]
        self.assertEqual(len(set(ys)), 3)
        self.assertTrue(all(50 < y < 200 for y in ys))

    def test_without_rows_fans_are_per_source(self):
        routes = check_layout.plan_routes(self.spec(), self.boxes())
        self.assertEqual(len(routes), 3)

    def test_overlapping_labels_are_reported(self):
        spec = {"type": "container", "nodes": [{"id": "a"}, {"id": "b"}, {"id": "c"}],
                "edges": [{"from": "a", "to": "b"}, {"from": "c", "to": "b"}]}
        boxes = {"a": (0, 0, 100, 50), "b": (0, 300, 100, 50), "c": (0, 600, 100, 50)}
        # a->b centres its label at y=175; c->b (upward) centres at y=475: no overlap.
        self.assertEqual(check_layout.check(spec, layout_of(boxes)), [])
        boxes["c"] = (300, 0, 100, 50)   # now both labels land in the same gap band
        routes = dict(((e["from"], e["to"]), pts) for e, pts in check_layout.plan_routes(spec, boxes))
        self.assertNotEqual(check_layout.label_point(routes[("a", "b")]),
                            check_layout.label_point(routes[("c", "b")]))
        stacked = [check_layout.label_point(routes[("a", "b")])] * 2
        self.assertTrue(check_layout.labels_collide(stacked[0], stacked[1]))
        self.assertFalse(check_layout.labels_collide((0, 0), (0, 40)))


if __name__ == "__main__":
    unittest.main()
