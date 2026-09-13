#!/usr/bin/env python3
"""Geometric lint for a rendered layout: the defects the XML hides and the PNG shows.

Runs automatically from render_drawio.py, or on its own:
    python3 check_layout.py spec.json
Exit code 0 when clean, 2 when there are findings.
"""

import argparse
import json
import sys

def _centre(box):
    x, y, w, h = box
    return x + w / 2.0, y + h / 2.0


def anchor_sides(source_box, target_box):
    """Which side an edge leaves and enters.

    Boxes that share a row (their vertical ranges overlap) connect side to side; boxes
    in different rows leave the bottom and enter the top, so the horizontal run happens
    in the gap between rows instead of through a same-row neighbour.
    """
    sx, sy, sw, sh = source_box
    tx, ty, tw, th = target_box
    same_row = sy < ty + th and ty < sy + sh
    if same_row:
        return ("right", "left") if tx + tw / 2.0 >= sx + sw / 2.0 else ("left", "right")
    return ("bottom", "top") if ty >= sy else ("top", "bottom")


def _port(box, side):
    x, y, w, h = box
    return {"left": (float(x), y + h / 2.0), "right": (float(x + w), y + h / 2.0),
            "top": (x + w / 2.0, float(y)), "bottom": (x + w / 2.0, float(y + h))}[side]


def route(source_box, target_box):
    """Port to port, orthogonal, one crossing at the midpoint between the ports."""
    exit_side, entry_side = anchor_sides(source_box, target_box)
    start, end = _port(source_box, exit_side), _port(target_box, entry_side)
    if exit_side in ("left", "right"):
        if start[1] == end[1]:
            return [start, end]
        mid_x = (start[0] + end[0]) / 2.0
        return [start, (mid_x, start[1]), (mid_x, end[1]), end]
    if start[0] == end[0]:
        return [start, end]
    mid_y = (start[1] + end[1]) / 2.0
    return [start, (start[0], mid_y), (end[0], mid_y), end]


def plan_routes(spec, boxes):
    """Every edge's polyline, with fan-out edges from one node staggered across the gap.

    Edges that leave the same node through the same side would all bend at the same
    height and stack their labels; each gets its own height inside the band between the
    source port and the nearest target port instead. A straight edge in the fan keeps a
    straight line but gets a zero-length middle leg so its label lands in its own slot.
    """
    routes = []
    fans = {}
    for index, edge in enumerate(spec.get("edges") or []):
        src, dst = edge.get("from"), edge.get("to")
        if src not in boxes or dst not in boxes:
            continue
        points = route(boxes[src], boxes[dst])
        routes.append([edge, points])
        side = anchor_sides(boxes[src], boxes[dst])[0]
        fans.setdefault((src, side), []).append(len(routes) - 1)
    for (src, side), members in fans.items():
        if len(members) < 2:
            continue
        vertical = side in ("top", "bottom")
        axis = 1 if vertical else 0
        starts = [routes[i][1][0][axis] for i in members]
        ends = [routes[i][1][-1][axis] for i in members]
        lo = starts[0]
        hi = min(ends) if side in ("bottom", "right") else max(ends)
        step = (hi - lo) / (len(members) + 1)
        order = sorted(members, key=lambda i: routes[i][1][-1][1 - axis])
        for slot, i in enumerate(order):
            bend = lo + step * (slot + 1)
            a, d = routes[i][1][0], routes[i][1][-1]
            # A straight edge keeps its line but labels at its slot: a zero-length middle leg.
            routes[i][1] = ([a, (a[0], bend), (d[0], bend), d] if vertical
                            else [a, (bend, a[1]), (bend, d[1]), d])
    return [(edge, points) for edge, points in routes]


def _dist(a, b):
    return abs(b[0] - a[0]) + abs(b[1] - a[1])   # routes are axis-aligned


def label_fraction(points):
    """Where along the polyline the label sits: halfway for a straight edge, the centre
    of the middle leg for a bent one (that leg runs in the gap between rows or columns)."""
    if len(points) < 4:
        return 0.5
    total = sum(_dist(a, b) for a, b in zip(points, points[1:]))
    first = _dist(points[0], points[1])
    middle = _dist(points[1], points[2])
    return (first + middle / 2.0) / total if total else 0.5


def label_point(points):
    total = sum(_dist(a, b) for a, b in zip(points, points[1:]))
    target = total * label_fraction(points)
    for a, b in zip(points, points[1:]):
        seg = _dist(a, b)
        if target <= seg:
            t = 0 if seg == 0 else target / seg
            return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
        target -= seg
    return points[-1]


def _inside(point, box):
    x, y, w, h = box
    return x < point[0] < x + w and y < point[1] < y + h


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


def _overlap_findings(boxes):
    ids = list(boxes)
    return ["nodes %s and %s overlap" % (a, b)
            for i, a in enumerate(ids) for b in ids[i + 1:] if _overlap(boxes[a], boxes[b])]


def _edge_findings(spec, boxes):
    findings = []
    for edge, points in plan_routes(spec, boxes):
        src, dst = edge["from"], edge["to"]
        lp = label_point(points)
        for third in boxes:
            if third in (src, dst):
                continue
            if any(_segment_crosses(p, q, boxes[third]) for p, q in zip(points, points[1:])):
                findings.append("edge %s -> %s crosses node %s" % (src, dst, third))
            if _inside(lp, boxes[third]):
                findings.append("label of edge %s -> %s sits on node %s" % (src, dst, third))
    return findings


def _group_findings(spec, layout):
    members = {}
    for node in spec.get("nodes") or []:
        if node.get("group"):
            members.setdefault(node["group"], set()).add(node["id"])
    return ["group %s encloses non-member node %s" % (group_id, node_id)
            for group_id, gbox in layout.groups.items()
            for node_id, box in layout.boxes.items()
            if node_id not in members.get(group_id, set()) and _overlap(gbox, box)]


def check(spec, layout):
    """Return human-readable findings; empty means the picture should be clean."""
    findings = _overlap_findings(layout.boxes)
    if spec.get("type") != "sequence":    # messages are horizontal by construction
        findings += _edge_findings(spec, layout.boxes)
    findings += _group_findings(spec, layout)
    return findings


def main(argv=None):
    parser = argparse.ArgumentParser(description="Check a spec's layout for visual defects.")
    parser.add_argument("spec", help="path to the spec JSON file")
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
