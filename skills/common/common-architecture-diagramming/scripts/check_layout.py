#!/usr/bin/env python3
"""Geometric lint for a rendered layout: the defects the XML hides and the PNG shows.

Runs automatically from render_drawio.py, or on its own:
    python3 check_layout.py spec.json
Exit code 0 when clean, 2 when there are findings.
"""

import argparse
import json
import sys

LABEL_OFFSET = 0.35   # matches the -0.35 relative label geometry in render_drawio


def _centre(box):
    x, y, w, h = box
    return x + w / 2.0, y + h / 2.0


def route(source_box, target_box):
    """Exit the facing side, bend at the midpoint, enter the facing side."""
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


def _dist(a, b):
    return abs(b[0] - a[0]) + abs(b[1] - a[1])   # routes are axis-aligned


def label_point(points):
    total = sum(_dist(a, b) for a, b in zip(points, points[1:]))
    target = total * LABEL_OFFSET
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


def _edge_points(spec_type, source_box, target_box):
    if spec_type == "erd":                 # straight entityRelationEdgeStyle line
        a, b = _centre(source_box), _centre(target_box)
        return [a, (b[0], a[1]), b]
    return route(source_box, target_box)


def _overlap_findings(boxes):
    ids = list(boxes)
    return ["nodes %s and %s overlap" % (a, b)
            for i, a in enumerate(ids) for b in ids[i + 1:] if _overlap(boxes[a], boxes[b])]


def _edge_findings(spec, boxes):
    findings = []
    for edge in spec.get("edges") or []:
        src, dst = edge["from"], edge["to"]
        if src not in boxes or dst not in boxes:
            continue
        points = _edge_points(spec.get("type"), boxes[src], boxes[dst])
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
