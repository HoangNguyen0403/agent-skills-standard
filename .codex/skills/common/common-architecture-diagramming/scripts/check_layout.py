#!/usr/bin/env python3
"""Geometric lint for a rendered layout: the defects the XML hides and the PNG shows.

Runs automatically from render_drawio.py, or on its own:
    python3 check_layout.py spec.json
Exit code 0 when clean, 2 when there are findings.

Every check here measures the same plans the renderer emits (`text_layout`), so
a clean run means the drawn picture is clean, not that an estimate was clean.
"""

import argparse
import json
import sys
from dataclasses import dataclass
from typing import Any, Dict, List, Tuple

import text_layout

SEQUENCE_MESSAGE_TOP_GAP = 24
SEQUENCE_MESSAGE_MID_GAP = 26
SEQUENCE_MESSAGE_MIN_STEP = 60
SEQUENCE_MESSAGE_BOTTOM = 40


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


LABEL_W, LABEL_H = 96, 16   # fallback label box, for collision checks without a plan


def _band_key(src, dst, side, rows):
    """Edges that bend in the same row gap share slots; otherwise fans are per source."""
    if rows and src in rows and dst in rows and side in ("top", "bottom"):
        upper = min(rows[src], rows[dst])
        return ("gap", upper)
    return ("fan", src, side)


def _band_limits(key, members, routes, rows, boxes):
    """The interval a band's bends may use: between the upper row and the row below it."""
    if key[0] == "gap":
        upper = key[1]
        lo = max(y + h for n, (x, y, w, h) in boxes.items() if rows.get(n) == upper)
        hi = min(y for n, (x, y, w, h) in boxes.items() if rows.get(n) == upper + 1)
        return lo, hi, 1
    side = key[2]
    axis = 1 if side in ("top", "bottom") else 0
    starts = [routes[i][1][0][axis] for i in members]
    ends = [routes[i][1][-1][axis] for i in members]
    lo = starts[0]
    hi = min(ends) if side in ("bottom", "right") else max(ends)
    return lo, hi, axis


def plan_routes(spec, boxes, rows=None):
    """Every edge's polyline, with bends staggered so labels never stack.

    Vertical edges that bend inside the same row gap (any source, either direction)
    share that gap's slots; without row information, edges leaving one node through
    one side share a band instead. A straight edge in a band keeps a straight line but
    gets a zero-length middle leg so its label lands in its own slot.
    """
    routes, bands = [], {}
    for edge in spec.get("edges") or []:
        src, dst = edge.get("from"), edge.get("to")
        if src not in boxes or dst not in boxes:
            continue
        routes.append([edge, route(boxes[src], boxes[dst])])
        side = anchor_sides(boxes[src], boxes[dst])[0]
        bands.setdefault(_band_key(src, dst, side, rows), []).append(len(routes) - 1)
    for key, members in bands.items():
        if len(members) < 2:
            continue
        lo, hi, axis = _band_limits(key, members, routes, rows, boxes)
        step = (hi - lo) / (len(members) + 1)
        order = sorted(members, key=lambda i: (routes[i][1][-1][1 - axis], routes[i][1][0][1 - axis]))
        for slot, i in enumerate(order):
            bend = lo + step * (slot + 1)
            a, d = routes[i][1][0], routes[i][1][-1]
            routes[i][1] = ([a, (a[0], bend), (d[0], bend), d] if axis == 1
                            else [a, (bend, a[1]), (bend, d[1]), d])
    return [(edge, points) for edge, points in routes]


def labels_collide(p, q, size_p=(LABEL_W, LABEL_H), size_q=(LABEL_W, LABEL_H)):
    pw, ph = size_p
    qw, qh = size_q
    return abs(p[0] - q[0]) < (pw + qw) / 2.0 and abs(p[1] - q[1]) < (ph + qh) / 2.0


def edge_label_size(edge):
    return text_layout.edge_label_size(edge)


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


@dataclass(frozen=True)
class SequenceMessage:
    """One sequence message as drawn: its row, its endpoints, and its label rectangle."""
    index: int
    edge: Dict[str, Any]
    plan: text_layout.LabelPlan
    y: int
    source_x: float
    target_x: float
    rect: Tuple[float, float, int, int]

    @property
    def anchor(self) -> Tuple[float, float]:
        return ((self.source_x + self.target_x) / 2.0, float(self.y))


def _participant_bottom(nodes, boxes):
    return max((boxes[n["id"]][1] + boxes[n["id"]][3] for n in nodes if n["id"] in boxes),
               default=0)


def sequence_messages(nodes, edges, boxes) -> List[SequenceMessage]:
    """The single message-position plan: rows, endpoints, and label rectangles.

    Rows advance by the taller of a minimum step and the two neighbouring label
    heights, so an expanded message label never lands on its neighbour.
    """
    participant_bottom = _participant_bottom(nodes, boxes)
    messages: List[SequenceMessage] = []
    previous_y = None
    previous_h = 0
    for index, edge in enumerate(edges):
        plan = text_layout.edge_label_plan(edge)
        if previous_y is None:
            y = participant_bottom + SEQUENCE_MESSAGE_TOP_GAP + plan.height / 2.0
        else:
            step = max(SEQUENCE_MESSAGE_MIN_STEP,
                       previous_h / 2.0 + plan.height / 2.0 + SEQUENCE_MESSAGE_MID_GAP)
            y = previous_y + step
        source = boxes.get(edge.get("from"))
        target = boxes.get(edge.get("to"))
        source_x = float(int(source[0] + source[2] / 2.0)) if source else 0.0
        target_x = float(int(target[0] + target[2] / 2.0)) if target else 0.0
        y = float(int(round(y)))
        anchor = ((source_x + target_x) / 2.0, y)
        messages.append(SequenceMessage(index, edge, plan, int(y),
                                        source_x, target_x,
                                        text_layout.label_rect(anchor, plan)))
        previous_y, previous_h = y, plan.height
    return messages


def sequence_bottom(nodes, messages, boxes) -> int:
    """Where the lifelines stop: below the last message label."""
    participant_bottom = _participant_bottom(nodes, boxes)
    if not messages:
        return int(participant_bottom + SEQUENCE_MESSAGE_TOP_GAP + SEQUENCE_MESSAGE_BOTTOM)
    last = messages[-1]
    return int(round(last.y + last.plan.height / 2.0 + SEQUENCE_MESSAGE_BOTTOM))


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


def _edge_findings(spec, layout):
    findings, boxes = [], layout.boxes
    routes = plan_routes(spec, boxes, layout.rows)
    labels = []
    for edge, points in routes:
        src, dst = edge["from"], edge["to"]
        plan = text_layout.edge_label_plan(edge)
        label_rect = text_layout.label_rect(label_point(points), plan)

        for other_rect, (osrc, odst) in labels:
            if text_layout.rects_overlap(label_rect, other_rect):
                findings.append("labels of edges %s -> %s and %s -> %s overlap"
                                % (osrc, odst, src, dst))
        if not plan.empty:
            labels.append((label_rect, (src, dst)))

        for third in boxes:
            if third in (src, dst):
                continue
            if any(_segment_crosses(p, q, boxes[third]) for p, q in zip(points, points[1:])):
                findings.append("edge %s -> %s crosses node %s" % (src, dst, third))
            if _overlap(label_rect, boxes[third]):
                findings.append("label of edge %s -> %s overlaps node %s" % (src, dst, third))

        for other_edge, other_points in routes:
            if other_edge is edge:
                continue
            osrc, odst = other_edge["from"], other_edge["to"]
            if osrc in (src, dst) or odst in (src, dst):
                continue
            if any(_segment_crosses(p, q, label_rect) for p, q in zip(other_points, other_points[1:])):
                findings.append("unrelated edge %s -> %s crosses label of edge %s -> %s"
                                % (osrc, odst, src, dst))
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


def _sequence_findings(spec, layout):
    findings = []
    nodes = spec.get("nodes") or []
    messages = sequence_messages(nodes, spec.get("edges") or [], layout.boxes)
    for index, message in enumerate(messages):
        for other in messages[:index]:
            if text_layout.rects_overlap(message.rect, other.rect):
                findings.append("messages %d and %d labels overlap"
                                % (other.index, message.index))
        for node in nodes:
            box = layout.boxes.get(node["id"])
            if box and text_layout.rects_overlap(message.rect, box):
                findings.append("message %d label overlaps participant %s"
                                % (message.index, node["id"]))
    return findings


def _header_findings(spec, layout):
    findings = []
    header_box = getattr(layout, "header_box", None)
    if not header_box or header_box[3] <= 0:
        return findings
    for node_id, box in layout.boxes.items():
        if _overlap(header_box, box):
            findings.append("node %s overlaps header/view contract" % node_id)
    for group_id, box in layout.groups.items():
        if _overlap(header_box, box):
            findings.append("group %s overlaps header/view contract" % group_id)
    return findings


def check(spec, layout):
    """Return human-readable findings; empty means the picture should be clean."""
    findings = _overlap_findings(layout.boxes)
    if spec.get("type") == "sequence":
        findings += _sequence_findings(spec, layout)
    else:
        findings += _edge_findings(spec, layout)
    findings += _group_findings(spec, layout)
    findings += _header_findings(spec, layout)
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
