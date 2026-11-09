#!/usr/bin/env python3
"""Render a diagram spec (JSON) into editable draw.io XML.

The agent writes the spec; this script owns every visual decision, so diagrams
stay consistent across authors, repositories, and sessions.

Usage:
    python3 render_drawio.py spec.json -o out.drawio

See ../references/diagram-spec.md for the schema; the shape catalogue lives in
style_catalog.py and is explained in ../references/style-catalog.md.
"""

import argparse
import hashlib
import html
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
import xml.etree.ElementTree as ET

import check_layout
import render_erd

import text_layout
# Wide enough that an edge label sits between two columns instead of on top of a
# box; the value was set after a rendered-PNG review, not from theory.
MIN_LABEL_GAP = 180

MARGIN_X = 40
TITLE_Y = 24
BODY_Y = 170
CELL_W = 180
CELL_H = 90
COL_STEP = CELL_W + MIN_LABEL_GAP
ROW_GAP = 46
DEFAULT_ACCENT = "#1E6FD9"

from style_catalog import (  # noqa: F401  (re-exported for validate_spec and tests)
    AWS_ICONS, CARDINALITIES, DARK_BG, DARK_BORDER, DARK_CARD_BG, DIAGRAM_TYPES,
    EDGE_LEGEND, EDGE_PROPERTIES, EDGE_STYLES, EDGE_STYLES_DARK, ENTITY_ROW_STYLE_DARK,
    ER_ARROWS, INK, INK_DARK, MUTED, MUTED_DARK, NODE_PROPERTIES, STYLE_CATALOG,
    WARN, WARN_DARK, WARN_TEXT, WARN_TEXT_DARK, _C4_EDGE, _C4_EDGE_DARK,
    get_edge_style, get_node_style,
)


class SpecError(ValueError):
    """The spec cannot be rendered as written."""


def _kind(node):
    kind = node.get("kind")
    if kind not in STYLE_CATALOG:
        raise SpecError(
            "unknown kind %r on node %r. Known kinds: %s"
            % (kind, node.get("id"), ", ".join(sorted(STYLE_CATALOG)))
        )
    return STYLE_CATALOG[kind]


def _has_supported_evidence(item):
    return text_layout.has_supported_evidence(item)


def _escape_html(text):
    return text_layout.escape_html(text)


def _label_plan_html(plan, mode="light", ink_font=False):
    """Draw a planned label block: exactly its lines, coloured by tone.

    Edge labels keep the edge style's font for their name line; a block that sets its
    own sizes (the label under a circle) asks for `ink_font`.
    """
    muted_color = MUTED_DARK if mode == "dark" else MUTED
    warn_color = WARN_TEXT_DARK if mode == "dark" else WARN_TEXT
    parts = []
    for line in plan.lines:
        if line.tone == text_layout.MUTED:
            text = '<font style="font-size:%dpx;color:%s">%s</font>' % (
                line.size, muted_color, line.text)
        elif line.tone == text_layout.WARN:
            text = '<font style="font-size:%dpx;color:%s">%s</font>' % (
                line.size, warn_color, line.text)
        elif line.bold:
            text = "<b>%s</b>" % line.text
        elif ink_font:
            text = '<font style="font-size:%dpx">%s</font>' % (line.size, line.text)
        else:
            text = line.text
        parts.append(text)
    return "<br>".join(parts)


def _label_html(node, kind=None, mode="light"):
    """Build the cell label: identity state, metric, and warning when unproven."""
    kind = kind or _kind(node)
    if kind.get("legend") in ("Start", "End"):
        return _label_plan_html(text_layout.circle_label_plan(node), mode=mode, ink_font=True)
    parts = ["<b>%s</b>" % _escape_html(node.get("label", ""))] if node.get("label") else []
    if node.get("sublabel"):
        parts.append('<font style="font-size:10px">[%s]</font>' % _escape_html(node["sublabel"]))
    state = " · ".join(filter(None, [
        node.get("lifecycle"),
        node.get("evidence_confidence"),
    ]))
    if state:
        parts.append('<font style="font-size:9px">[%s]</font>' % _escape_html(state))
    if node.get("metric"):
        metric = node["metric"]
        if node.get("metric_provenance"):
            metric = "%s · %s" % (metric, node["metric_provenance"])
        parts.append('<font style="font-size:10px">%s</font>' % _escape_html(metric))
    if not _has_supported_evidence(node):
        parts.append('<font style="font-size:10px">&#9888; UNVERIFIED</font>')
    return "<br>".join(parts)


def _property_value(value):
    if isinstance(value, list):
        return ",".join(str(item) for item in value)
    return str(value)


def _geometry(parent, x, y, w, h):
    ET.SubElement(parent, "mxGeometry", {
        "x": str(x), "y": str(y), "width": str(w), "height": str(h), "as": "geometry",
    })


def _text_cell(root, cell_id, value, x, y, w, h, size, colour, bold=False):
    style = ("text;html=1;fontSize=%d;fontColor=%s;align=left;verticalAlign=middle;"
             "%s" % (size, colour, "fontStyle=1;" if bold else ""))
    cell = ET.SubElement(root, "mxCell", {
        "id": cell_id, "value": value, "style": style, "vertex": "1", "parent": "1",
    })
    _geometry(cell, x, y, w, h)


def _shape_cell(root, node, x, y, w, h, mode="light"):
    style = get_node_style(node["kind"], mode=mode)
    kind = _kind(node)
    if kind.get("legend") in ("Start", "End"):
        plan = text_layout.circle_label_plan(node)
        style += "labelWidth=%d;labelHeight=%d;whiteSpace=wrap;" % (plan.width, plan.height)
    _node_cell(root, node, style, x, y, w, h, mode=mode,
               label=_label_html(node, kind=kind, mode=mode))


def _node_cell(root, node, style, x, y, w, h, mode="light", label=None):
    """One vertex per node: object-wrapped when it carries custom properties."""
    if not _has_supported_evidence(node):
        style = _unverified_style(style, mode=mode)
    attrs = {"style": style, "vertex": "1", "parent": "1"}
    if label is None:
        label = _label_html(node, mode=mode)
    props = {
        key: _property_value(node[key])
        for key in NODE_PROPERTIES if node.get(key) is not None
    }
    if props:
        holder = ET.SubElement(
            root, "object", dict({"id": node["id"], "label": label}, **props)
        )
        cell = ET.SubElement(holder, "mxCell", attrs)
    else:
        attrs.update({"id": node["id"], "value": label})
        cell = ET.SubElement(root, "mxCell", attrs)
    _geometry(cell, x, y, w, h)


def _unverified_style(style, mode="light"):
    """Strip the confident fill and mark the shape as not yet proven by evidence."""
    is_stencil = ("shape=mxgraph.gcp2." in style or "shape=mxgraph.aws4." in style or "resIcon=" in style)
    is_circle = ("shape=doubleEllipse" in style or style.startswith("ellipse;"))
    if is_stencil or is_circle:
        kept = [part for part in style.split(";") if part and not part.startswith("fontColor")]
        font_c = WARN_TEXT_DARK if mode == "dark" else WARN_TEXT
        kept.append("fontColor=%s" % font_c)
        return ";".join(kept) + ";"

    kept = [part for part in style.split(";")
            if part and not part.startswith(("fillColor", "fontColor", "strokeColor",
                                              "dashed", "dashPattern", "strokeWidth"))]
    if mode == "dark":
        kept += ["fillColor=%s" % DARK_CARD_BG, "fontColor=%s" % WARN_TEXT_DARK,
                 "strokeColor=%s" % WARN_DARK, "dashed=1", "dashPattern=6 4", "strokeWidth=2"]
    else:
        kept += ["fillColor=#FFFFFF", "fontColor=%s" % WARN_TEXT, "strokeColor=%s" % WARN,
                 "dashed=1", "dashPattern=6 4", "strokeWidth=2"]
    return ";".join(kept) + ";"


def _node_text_bounds(node, kind):
    return text_layout.node_text_bounds(node, kind)


def _footprint(node_or_kind, kind=None):
    """Vertical room a shape needs, including a label drawn underneath an icon or long text."""
    if kind is None:
        node, k = {}, node_or_kind
    else:
        node, k = node_or_kind, kind
    if node.get("kind") == "entity":
        import render_erd
        return render_erd.entity_height(node)
    is_circle = k.get("legend") in ("Start", "End")
    if is_circle:
        text_h = _node_text_bounds(node, k)
        return k["h"] + (text_h + 8 if text_h > 0 else 0)
    if k.get("label_h"):
        text_h = _node_text_bounds(node, k)
        label_h = max(k.get("label_h", 52), text_h + 8)
        return k["h"] + label_h
    text_h = _node_text_bounds(node, k)
    return max(k["h"], text_h + 16)


def _footprint_w(node_or_kind, kind=None):
    """Horizontal room, including a label wider than the icon it sits under."""
    if kind is None:
        node, k = {}, node_or_kind
    else:
        node, k = node_or_kind, kind
    is_circle = k.get("legend") in ("Start", "End")
    if is_circle and node:
        return max(k["w"], text_layout.circle_label_plan(node).width)
    return max(k["w"], k.get("label_w", 0))


def _place_columns(columns, body_y=BODY_Y):
    """Stack each column and centre the columns against each other.

    Centring matters: a hub pinned to the top row forces every edge into a long
    dog-leg that crosses the boxes underneath it.
    """
    heights = {}
    for column, members in columns.items():
        heights[column] = (sum(_footprint(n, k) for n, k in members)
                           + ROW_GAP * max(0, len(members) - 1))
    tallest = max(heights.values()) if heights else 0
    placed = {}
    for column in sorted(columns):
        y = body_y + (tallest - heights[column]) / 2.0
        for node, kind in columns[column]:
            x = MARGIN_X + column * COL_STEP + (CELL_W - _footprint_w(node, kind)) / 2.0
            placed[node["id"]] = (int(x), int(y))
            y += _footprint(node, kind) + ROW_GAP
    return placed


def _place_rows(rows, align="centre", gap=ROW_GAP + 30, body_y=BODY_Y):
    """Lay rows out top-down; centred on the widest row, or left-aligned for group bands."""
    widths = {}
    for row, members in rows.items():
        widths[row] = (sum(_footprint_w(n, k) for n, k in members)
                       + MIN_LABEL_GAP * max(0, len(members) - 1))
    widest = max(widths.values()) if widths else 0
    placed = {}
    y = body_y
    for row in sorted(rows):
        members = rows[row]
        x = MARGIN_X + ((widest - widths[row]) / 2.0 if align == "centre" else 0)
        row_height = max(_footprint(n, k) for n, k in members)
        for node, kind in members:
            placed[node["id"]] = (int(x), int(y + (row_height - _footprint(node, kind)) / 2.0))
            x += _footprint_w(node, kind) + MIN_LABEL_GAP
        y += row_height + gap
    return placed



def _group_rank(nodes):
    """Groups in order of first appearance; ungrouped nodes sort after every group."""
    ranks = {}
    for node in nodes:
        group = node.get("group")
        if group and group not in ranks:
            ranks[group] = len(ranks)
    return ranks


def _push_past_group_bands(rows, placed, ranks):
    """Shift nodes right so nothing outside a group sits inside its column band.

    Groups are handled in rank order and only nodes of a later rank (or no group)
    move; a shift only ever moves nodes right, so each band is final by the time
    the next group is measured.
    """
    def rank(node):
        return ranks.get(node.get("group"), len(ranks))

    for group in sorted(ranks, key=ranks.get):
        members = [(n, k) for row in rows.values() for n, k in row if n.get("group") == group]
        if not members:
            continue
        limit = (max(placed[n["id"]][0] + _footprint_w(n, k) for n, k in members)
                 + MIN_LABEL_GAP + GROUP_PAD_X * 2)
        for row in rows.values():
            shift = 0
            for node, _ in row:
                if rank(node) <= ranks[group]:
                    continue
                x, y = placed[node["id"]]
                shift = max(shift, limit - x) if x + shift < limit else shift
                placed[node["id"]] = (int(x + shift), y)
    return placed


def _layout_context(nodes, body_y=BODY_Y):
    """Actors on the left, the system under discussion centre, externals right."""
    columns = {0: [], 1: [], 2: []}
    for node in nodes:
        kind = _kind(node)
        if node["kind"] == "person":
            column = 0
        elif node["kind"] in ("system-ext", "saas"):
            column = 2
        else:
            column = 1
        columns[column].append((node, kind))
    return _place_columns({c: m for c, m in columns.items() if m}, body_y=body_y)

FAN_LABEL_STEP = 22   # vertical room per staggered fan-out edge so labels do not stack


def _row_gap(nodes, edges):
    """Widen the gap between rows when edges cross between rows, so labels do not stack."""
    layer_of = {n["id"]: n.get("layer", _kind(n)["layer"]) for n in nodes}
    layers = sorted({layer_of[n["id"]] for n in nodes})
    row_of = {n["id"]: layers.index(layer_of[n["id"]]) for n in nodes}

    fan = {}
    for edge in edges:
        src, dst = edge.get("from"), edge.get("to")
        if src in layer_of and dst in layer_of and layer_of[src] != layer_of[dst]:
            fan[src] = fan.get(src, 0) + 1
    widest = max(fan.values(), default=0)
    base_gap = max(ROW_GAP + 30, FAN_LABEL_STEP * (widest + 1))

    # Preliminary layout to detect whether any edges crossing a row gap collide in X
    spec_dummy = {"type": "container", "nodes": nodes, "edges": edges}
    layers_dict = {}
    for n in nodes:
        layers_dict.setdefault(layer_of[n["id"]], []).append((n, _kind(n)))
    ranks = _group_rank(nodes)
    if not ranks:
        rows = {idx: layers_dict[l] for idx, l in enumerate(sorted(layers_dict))}
        pre_placed = _place_rows(rows, gap=base_gap)
    else:
        rows = {}
        for idx, l in enumerate(sorted(layers_dict)):
            rows[idx] = sorted(layers_dict[l], key=lambda pair: ranks.get(pair[0].get("group"), len(ranks)))
        pre_placed = _place_rows(rows, align="left", gap=base_gap)
        pre_placed = _push_past_group_bands(rows, pre_placed, ranks)

    pre_boxes = {}
    for n in nodes:
        x, y = pre_placed[n["id"]]
        k = _kind(n)
        h = _footprint(n, k)
        fw = _footprint_w(n, k)
        pre_boxes[n["id"]] = (x, y, fw, h)

    routes = check_layout.plan_routes(spec_dummy, pre_boxes, row_of)
    labels = []
    max_needed_gap = base_gap
    for edge, points in routes:
        plan = text_layout.edge_label_plan(edge)
        rect = text_layout.label_rect(check_layout.label_point(points), plan)
        for other_rect, other_edge, other_h in labels:
            if text_layout.rects_overlap(rect, other_rect):
                src1, dst1 = edge["from"], edge["to"]
                src2, dst2 = other_edge["from"], other_edge["to"]
                if row_of.get(src1) != row_of.get(dst1) and row_of.get(src2) != row_of.get(dst2):
                    u1 = min(row_of[src1], row_of[dst1])
                    u2 = min(row_of[src2], row_of[dst2])
                    if u1 == u2:
                        count = sum(1 for e, _ in routes
                                    if row_of.get(e["from"]) != row_of.get(e["to"]) and
                                    min(row_of[e["from"]], row_of[e["to"]]) == u1)
                        step_needed = (plan.height + other_h) / 2.0 + 3
                        needed = int(step_needed * (count + 1))
                        if needed > max_needed_gap:
                            max_needed_gap = needed
        labels.append((rect, edge, plan.height))
    return max_needed_gap


def _layout_layered(nodes, edges, body_y=BODY_Y):
    """Rows read as the request travels: clients, edge, services, data, external.

    With groups present, each row lists grouped nodes first (in group order) and rows
    are left-aligned, so a group's members form one column band that outsiders are
    pushed past; without groups, rows are centred against each other.
    """
    ranks = _group_rank(nodes)
    layers = {}
    for node in nodes:
        kind = _kind(node)
        layer = node.get("layer", kind["layer"])
        layers.setdefault(layer, []).append((node, kind))
    gap = _row_gap(nodes, edges)
    if not ranks:
        rows = {index: layers[layer] for index, layer in enumerate(sorted(layers))}
        return _place_rows(rows, gap=gap, body_y=body_y)
    rows = {}
    for index, layer in enumerate(sorted(layers)):
        rows[index] = sorted(layers[layer],
                             key=lambda pair: ranks.get(pair[0].get("group"), len(ranks)))
    placed = _place_rows(rows, align="left", gap=gap, body_y=body_y)
    return _push_past_group_bands(rows, placed, ranks)


def _layout_state(nodes, edges, body_y=BODY_Y):
    """Depth from the start node decides the row, so the lifecycle reads downwards."""
    depth = {}
    starts = [n["id"] for n in nodes if n["kind"] == "start"] or [nodes[0]["id"]]
    frontier = [(node_id, 0) for node_id in starts]
    outgoing = {}
    for edge in edges:
        outgoing.setdefault(edge["from"], []).append(edge["to"])
    while frontier:
        node_id, level = frontier.pop(0)
        if node_id in depth and depth[node_id] <= level:
            continue
        depth[node_id] = level
        for target in outgoing.get(node_id, []):
            frontier.append((target, level + 1))
    levels = {}
    for node in nodes:
        levels.setdefault(depth.get(node["id"], len(nodes)), []).append((node, _kind(node)))
    rows = {index: levels[level] for index, level in enumerate(sorted(levels))}
    return _place_rows(rows, body_y=body_y)


def _layout_sequence(nodes, body_y=BODY_Y):
    return _place_columns({index: [(node, _kind(node))]
                           for index, node in enumerate(nodes)}, body_y=body_y)


def _lifeline_x(node, placed):
    x, _ = placed[node["id"]]
    return x + _kind(node)["w"] / 2.0


def _render_sequence_body(root, nodes, edges, placed, lay, mode="light"):
    """Messages are free-floating horizontal edges placed on the shared message plan."""
    lifeline_stroke = DARK_BORDER if mode == "dark" else "#9AA5B1"
    messages = check_layout.sequence_messages(nodes, edges, lay.boxes)
    bottom = check_layout.sequence_bottom(nodes, messages, lay.boxes)

    for node in nodes:
        x = _lifeline_x(node, placed)
        top = placed[node["id"]][1] + lay.boxes[node["id"]][3]
        line = ET.SubElement(root, "mxCell", {
            "id": "_life_%s" % node["id"], "value": "",
            "style": "endArrow=none;dashed=1;html=1;strokeColor=%s;" % lifeline_stroke,
            "edge": "1", "parent": "1",
        })
        geometry = ET.SubElement(line, "mxGeometry", {"relative": "1", "as": "geometry"})
        ET.SubElement(geometry, "mxPoint",
                      {"x": str(int(x)), "y": str(int(top)), "as": "sourcePoint"})
        ET.SubElement(geometry, "mxPoint",
                      {"x": str(int(x)), "y": str(int(bottom)), "as": "targetPoint"})
    for message in messages:
        edge = message.edge
        plan = message.plan
        y = message.y
        style = get_edge_style(edge.get("style", "sync"), mode=mode)
        if not _has_supported_evidence(edge):
            style = _unverified_style(style, mode=mode)
        attrs = {
            "id": "_msg_%d" % message.index, "value": _edge_value(edge, mode=mode),
            "style": style, "edge": "1", "parent": "1",
        }
        attrs.update({
            key: _property_value(edge[key])
            for key in EDGE_PROPERTIES if edge.get(key) is not None
        })
        cell = ET.SubElement(root, "mxCell", attrs)
        geometry = ET.SubElement(cell, "mxGeometry", {
            "x": "0", "width": str(plan.width), "height": str(plan.height),
            "relative": "1", "as": "geometry",
        })
        ET.SubElement(geometry, "mxPoint",
                      {"x": str(int(message.source_x)), "y": str(int(y)), "as": "sourcePoint"})
        ET.SubElement(geometry, "mxPoint",
                      {"x": str(int(message.target_x)), "y": str(int(y)), "as": "targetPoint"})
        points = ET.SubElement(geometry, "Array", {"as": "points"})
        ET.SubElement(points, "mxPoint",
                      {"x": "%g" % message.anchor[0], "y": str(int(y))})
    return bottom


def _edge_value(edge, mode="light"):
    """Edge label, metric, and warning: the planned label lines, drawn as planned."""
    return _label_plan_html(text_layout.edge_label_plan(edge), mode=mode)

def _render_groups(root, spec, layout, mode="light"):
    """Boundary boxes are emitted before their members so they sit behind them."""
    stroke_color = DARK_BORDER if mode == "dark" else "#9AA5B1"
    font_color = MUTED_DARK if mode == "dark" else MUTED
    for group in spec.get("groups") or []:
        if group["id"] not in layout.groups:
            continue
        x, y, w, h = layout.groups[group["id"]]
        cell = ET.SubElement(root, "mxCell", {
            "id": "_group_%s" % group["id"], "value": _escape_html(group.get("label", "")),
            "style": ("rounded=1;whiteSpace=wrap;html=1;fillColor=none;strokeColor=%s;"
                      "dashed=1;dashPattern=8 4;verticalAlign=top;align=left;spacingLeft=12;"
                      "spacingTop=6;fontColor=%s;fontSize=11;arcSize=6;" % (stroke_color, font_color)),
            "vertex": "1", "parent": "1",
        })
        _geometry(cell, x, y, w, h)

_PORTS = {"left": (0, 0.5), "right": (1, 0.5), "top": (0.5, 0), "bottom": (0.5, 1)}


def _anchor_style(source_box, target_box, source_label_h=0, target_label_h=0):
    """Pin each end to the side check_layout.anchor_sides picks, so the checker and the
    renderer agree on where a line runs. A bottom port on an icon is pushed below the
    label drawn under it."""
    exit_side, entry_side = check_layout.anchor_sides(source_box, target_box)
    (ex, ey), (nx, ny) = _PORTS[exit_side], _PORTS[entry_side]
    exit_dy = source_label_h if exit_side == "bottom" else 0
    entry_dy = target_label_h if entry_side == "bottom" else 0
    style = ("exitX=%s;exitY=%s;exitDx=0;exitDy=%d;entryX=%s;entryY=%s;entryDx=0;entryDy=%d;"
             % (ex, ey, exit_dy, nx, ny, entry_dy))
    # draw.io snaps an offset port back onto the shape unless perimeter projection is off.
    if exit_dy:
        style += "exitPerimeter=0;"
    if entry_dy:
        style += "entryPerimeter=0;"
    return style


def _render_edges(root, spec, edges, lay, mode="light"):
    boxes = lay.boxes
    label_h = {n["id"]: max(0, lay.boxes[n["id"]][3] - lay.cells[n["id"]][3]) for n in spec["nodes"]}
    routes = {id(edge): points
              for edge, points in check_layout.plan_routes(spec, boxes, lay.rows)}
    for index, edge in enumerate(edges):
        style = get_edge_style(edge.get("style", "sync"), mode=mode)
        if not _has_supported_evidence(edge):
            style = _unverified_style(style, mode=mode)
        points = routes.get(id(edge))
        if points:
            style += _anchor_style(boxes[edge["from"]], boxes[edge["to"]],
                                   label_h[edge["from"]], label_h[edge["to"]])
        attrs = {
            "id": "_edge_%d" % index, "value": _edge_value(edge, mode=mode),
            "style": style, "edge": "1", "parent": "1",
            "source": edge["from"], "target": edge["to"],
        }
        attrs.update({
            key: _property_value(edge[key])
            for key in EDGE_PROPERTIES if edge.get(key) is not None
        })
        cell = ET.SubElement(root, "mxCell", attrs)
        # Label position is relative along the path: -1 source, 0 middle, 1 target.
        # Width/height are the planned label box, so the drawn label is the measured one.
        fraction = check_layout.label_fraction(points) if points else 0.5
        plan = text_layout.edge_label_plan(edge)
        geometry = ET.SubElement(cell, "mxGeometry",
                                 {"x": "%g" % (2 * fraction - 1),
                                  "width": str(plan.width), "height": str(plan.height),
                                  "relative": "1", "as": "geometry"})
        if points and len(points) == 4 and points[1] != points[2]:
            waypoints = ET.SubElement(geometry, "Array", {"as": "points"})
            for x, y in points[1:3]:
                ET.SubElement(waypoints, "mxPoint", {"x": str(x), "y": str(y)})

def _header_cell(root, cell_id, block, size, colour, bold=False):
    _text_cell(root, cell_id, block.text, MARGIN_X + block.x, block.y,
               block.width, block.height, size, colour, bold=bold)


def _render_title(root, lay, accent, mode="light"):
    """Draw the header exactly as planned: title, meta, view contract, and rule."""
    ink_color = INK_DARK if mode == "dark" else INK
    muted_color = MUTED_DARK if mode == "dark" else MUTED
    header = lay.header
    _header_cell(root, "_title", header.title, header.title.size, ink_color, bold=True)
    _header_cell(root, "_meta", header.meta, header.meta.size, muted_color)
    if header.contract:
        _header_cell(root, "_view_contract", header.contract, header.contract.size, muted_color)
    rule = ET.SubElement(root, "mxCell", {
        "id": "_rule", "value": "",
        "style": "line;html=1;strokeWidth=3;strokeColor=%s;" % (accent or DEFAULT_ACCENT),
        "vertex": "1", "parent": "1",
    })
    _geometry(rule, MARGIN_X, header.rule_y, 120, 10)

def _render_legend(root, spec, edges, top, mode="light"):
    """A reader must never have to guess what a shape or a line style means."""
    ink_color = INK_DARK if mode == "dark" else INK
    muted_color = MUTED_DARK if mode == "dark" else MUTED
    kinds, seen = [], set()
    for node in spec["nodes"]:
        if node["kind"] not in seen:
            seen.add(node["kind"])
            kinds.append(node["kind"])
    entries = [(get_node_style(k, mode=mode), STYLE_CATALOG[k]["legend"]) for k in kinds]
    if spec.get("type") == "erd":
        edge_entries = render_erd.legend_entries(edges, mode=mode)
    else:
        edge_entries, seen_edges = [], set()
        for edge in edges:
            style_key = edge.get("style", "sync")
            if style_key not in seen_edges:
                seen_edges.add(style_key)
                edge_entries.append((get_edge_style(style_key, mode=mode), EDGE_LEGEND[style_key]))
    if (any(not _has_supported_evidence(n) for n in spec["nodes"]) or
            any(not _has_supported_evidence(edge) for edge in edges)):
        system_style = get_node_style("system", mode=mode)
        entries.append((_unverified_style(system_style, mode=mode),
                        "UNVERIFIED — supporting provenance not established"))

    _text_cell(root, "_legend_title", "Legend", MARGIN_X, top, 200, 20, 12, ink_color, bold=True)
    y = top + 26
    for index, (style, label) in enumerate(entries):
        swatch = ET.SubElement(root, "mxCell", {
            "id": "_legend_shape_%d" % index, "value": "", "style": style,
            "vertex": "1", "parent": "1",
        })
        _geometry(swatch, MARGIN_X, y, 34, 22)
        _text_cell(root, "_legend_text_%d" % index, label, MARGIN_X + 46, y, 460, 22,
                   11, muted_color)
        y += 30
    for index, (style, label) in enumerate(edge_entries):
        line = ET.SubElement(root, "mxCell", {
            "id": "_legend_edge_%d" % index, "value": "",
            "style": style, "edge": "1", "parent": "1",
        })
        geometry = ET.SubElement(line, "mxGeometry", {"relative": "1", "as": "geometry"})
        ET.SubElement(geometry, "mxPoint",
                      {"x": str(MARGIN_X), "y": str(y + 11), "as": "sourcePoint"})
        ET.SubElement(geometry, "mxPoint",
                      {"x": str(MARGIN_X + 34), "y": str(y + 11), "as": "targetPoint"})
        _text_cell(root, "_legend_edge_text_%d" % index, label,
                   MARGIN_X + 46, y, 460, 22, 11, muted_color)
        y += 30

@dataclass(frozen=True)
class Layout:
    """Where everything lands; render() draws exactly this.

    boxes: visual footprint per node (x, y, w, h), including an icon's label block.
    cells: the shape geometry per node, centred inside its footprint.
    groups: boundary boxes. rows: row index per node for layered types, else empty.
    header: the single header plan the renderer draws and the checker measures.
    header_box: the header's occupied rectangle, for overlap findings.
    """
    boxes: dict
    cells: dict = field(default_factory=dict)
    groups: dict = field(default_factory=dict)
    rows: dict = field(default_factory=dict)
    header_box: tuple = (MARGIN_X, TITLE_Y, 1000, 0)
    header: Any = None


HEADER_MIN_WIDTH = 1000
HEADER_MARGIN_RIGHT = 60
LAYOUT_PASSES = 4


GROUP_PAD_X = 30


def group_box(member_boxes, group=None):
    label = group.get("label", "") if group else ""
    glines = text_layout.wrap_lines(label, 30) if label else 1
    pad_top = max(46, glines * 16 + 14)
    pad_x, pad_bottom = GROUP_PAD_X, 30
    x0 = min(b[0] for b in member_boxes) - pad_x
    y0 = min(b[1] for b in member_boxes) - pad_top
    x1 = max(b[0] + b[2] for b in member_boxes) + pad_x
    y1 = max(b[1] + b[3] for b in member_boxes) + pad_bottom
    return int(x0), int(y0), int(x1 - x0), int(y1 - y0)


def _place(spec, nodes, edges, body_y=BODY_Y):
    if spec["type"] == "erd":
        return render_erd.layout_erd(nodes, edges, body_y=body_y)
    if spec["type"] == "context":
        return _layout_context(nodes, body_y=body_y)
    if spec["type"] == "sequence":
        return _layout_sequence(nodes, body_y=body_y)
    if spec["type"] == "state":
        return _layout_state(nodes, edges, body_y=body_y)
    return _layout_layered(nodes, edges, body_y=body_y)


def _cells_for(nodes, placed):
    """Footprint and shape geometry per node; an entity is its own footprint."""
    boxes, cells = {}, {}
    for node in nodes:
        x, y = placed[node["id"]]
        kind = _kind(node)
        if node["kind"] == "entity":
            h = render_erd.entity_height(node)
            fw, fh = kind["w"], h
            cw, ch = kind["w"], h
        elif kind.get("label_h"):
            fw = _footprint_w(node, kind)
            fh = _footprint(node, kind)
            cw, ch = kind["w"], kind["h"]
        elif kind.get("legend") in ("Start", "End"):
            h = _footprint(node, kind)
            fw, fh = _footprint_w(node, kind), h
            cw, ch = kind["w"], kind["h"]
        else:
            h = _footprint(node, kind)
            fw, fh = _footprint_w(node, kind), h
            cw, ch = kind["w"], h
        boxes[node["id"]] = (x, y, fw, fh)
        cells[node["id"]] = (int(x + (fw - cw) / 2.0), y, cw, ch)
    return boxes, cells


def _group_boxes(spec, nodes, boxes):
    groups = {}
    for group in spec.get("groups") or []:
        members = [boxes[n["id"]] for n in nodes if n.get("group") == group["id"]]
        if members:
            groups[group["id"]] = group_box(members, group=group)
    return groups


def layout(spec):
    """Geometry only. Raises SpecError on anything unrenderable.

    The header is planned from the rendered content width, and that plan owns the
    body offset, so a long title, contract, or group header pushes the body down
    instead of being drawn over it. Two passes converge: column x never depends on
    the body offset.
    """
    if spec.get("type") not in DIAGRAM_TYPES:
        raise SpecError("unknown diagram type %r. Known types: %s"
                        % (spec.get("type"), ", ".join(DIAGRAM_TYPES)))
    nodes = spec.get("nodes") or []
    if not nodes:
        raise SpecError("spec has no nodes")
    edges = spec.get("edges") or []
    header = text_layout.plan_header(spec, HEADER_MIN_WIDTH)
    body_y = header.body_y
    boxes, cells, groups = {}, {}, {}
    for _ in range(LAYOUT_PASSES):
        placed = _place(spec, nodes, edges, body_y=body_y)
        boxes, cells = _cells_for(nodes, placed)
        groups = _group_boxes(spec, nodes, boxes)
        width = max(HEADER_MIN_WIDTH,
                    max(x + w for x, _, w, _ in boxes.values()) + HEADER_MARGIN_RIGHT)
        header = text_layout.plan_header(spec, width)
        group_top = min((box[1] for box in groups.values()), default=body_y)
        required = max(header.body_y,
                       header.rule_y + text_layout.HEADER_BODY_GAP + max(0, body_y - group_top))
        if required == body_y:
            break
        body_y = required
    header_box = (MARGIN_X, text_layout.HEADER_TITLE_Y, header.width, header.height)
    return Layout(boxes=boxes, cells=cells, groups=groups, rows=_rows(spec, nodes),
                  header_box=header_box, header=header)

def _rows(spec, nodes):
    if spec["type"] not in ("container", "component", "deployment", "dataflow"):
        return {}
    layers = sorted({n.get("layer", _kind(n)["layer"]) for n in nodes})
    return {n["id"]: layers.index(n.get("layer", _kind(n)["layer"])) for n in nodes}


def render(spec, *, theme=None):
    """Return draw.io XML for one spec. Raises SpecError on anything unrenderable.

    theme: optional presentation theme mode override ("light" or "dark").
           Defaults to spec.theme.mode if present, else "light".
    """
    mode = theme
    if mode is None:
        spec_theme = spec.get("theme")
        if isinstance(spec_theme, dict):
            mode = spec_theme.get("mode", "light")
        else:
            mode = "light"
    if mode not in ("light", "dark"):
        raise SpecError("unknown theme mode %r. Known modes: light, dark" % mode)

    lay = layout(spec)
    nodes = spec.get("nodes") or []
    edges = spec.get("edges") or []
    accent = (spec.get("theme") or {}).get("accent", DEFAULT_ACCENT)

    mxfile = ET.Element("mxfile", {"host": "agent-skills-standard", "type": "device"})
    diagram = ET.SubElement(mxfile, "diagram", {"id": "diagram-1",
                                                "name": spec.get("title", "Diagram")[:50]})
    model_attrs = {
        "dx": "1400", "dy": "900", "grid": "0", "gridSize": "10", "guides": "1",
        "tooltips": "1", "connect": "1", "arrows": "1", "fold": "1", "page": "1",
        "pageScale": "1", "pageWidth": "1600", "pageHeight": "1200", "math": "0",
        "shadow": "0",
    }
    if mode == "dark":
        model_attrs["background"] = DARK_BG
        model_attrs["pageBackgroundColor"] = DARK_BG
    model = ET.SubElement(diagram, "mxGraphModel", model_attrs)
    root = ET.SubElement(model, "root")
    ET.SubElement(root, "mxCell", {"id": "0"})
    ET.SubElement(root, "mxCell", {"id": "1", "parent": "0"})

    boxes = lay.boxes
    _render_title(root, lay, accent, mode=mode)
    _render_groups(root, spec, lay, mode=mode)
    if spec["type"] == "erd":
        placed = {node_id: (x, y) for node_id, (x, y, _, _) in lay.cells.items()}
        render_erd.render_entities(root, nodes, placed, mode=mode)
    else:
        for node in nodes:
            x, y, w, h = lay.cells[node["id"]]
            _shape_cell(root, node, x, y, w, h, mode=mode)

    if spec["type"] == "sequence":
        placed = {node_id: (x, y) for node_id, (x, y, _, _) in lay.cells.items()}
        bottom = _render_sequence_body(root, nodes, edges, placed, lay, mode=mode)
    elif spec["type"] == "erd":
        render_erd.render_relations(root, spec, edges, lay, mode=mode)
        bottom = max(y + h for _, y, _, h in boxes.values())
    else:
        _render_edges(root, spec, edges, lay, mode=mode)
        bottom = max(y + h for _, y, _, h in boxes.values())
    _render_legend(root, spec, edges, bottom + 70, mode=mode)
    _fit_page(model)
    return _stamp_generated_baseline(ET.tostring(mxfile, encoding="unicode"))


PAGE_MIN_WIDTH = 1600
PAGE_MIN_HEIGHT = 1200
PAGE_MARGIN = 40


def _fit_page(model):
    """Grow the page to the emitted content so an export never crops a long diagram."""
    right = bottom = 0.0
    for cell in model.iter("mxCell"):
        geometry = cell.find("mxGeometry")
        if geometry is None:
            continue
        if cell.get("vertex") == "1" and geometry.get("relative") is None:
            right = max(right, float(geometry.get("x") or 0) + float(geometry.get("width") or 0))
            bottom = max(bottom, float(geometry.get("y") or 0) + float(geometry.get("height") or 0))
        for point in geometry.iter("mxPoint"):
            right = max(right, float(point.get("x") or 0))
            bottom = max(bottom, float(point.get("y") or 0))
    model.set("pageWidth", str(max(PAGE_MIN_WIDTH, int(right) + PAGE_MARGIN)))
    model.set("pageHeight", str(max(PAGE_MIN_HEIGHT, int(bottom) + PAGE_MARGIN)))

GENERATED_BASELINE = "data-generated-sha256"


def _parse_xml(xml):
    parser = ET.XMLParser(target=ET.TreeBuilder(insert_comments=True, insert_pis=True))
    return ET.fromstring(xml, parser=parser)


def _canonical_xml(xml):
    root = _parse_xml(xml)
    root.attrib.pop(GENERATED_BASELINE, None)
    for element in root.iter():
        if element.text is not None and not element.text.strip():
            element.text = None
        if element.tail is not None and not element.tail.strip():
            element.tail = None
    return ET.tostring(root, encoding="unicode")


def _stamp_generated_baseline(xml):
    root = _parse_xml(xml)
    root.attrib.pop(GENERATED_BASELINE, None)
    canonical = _canonical_xml(ET.tostring(root, encoding="unicode"))
    root.set(GENERATED_BASELINE, hashlib.sha256(canonical.encode("utf-8")).hexdigest())
    return ET.tostring(root, encoding="unicode")


def _manual_edit_error(reason):
    return SpecError(
        "%s; pass --acknowledge-manual-edits only after returning semantic changes to the spec"
        % reason
    )


def write_output(xml, output, acknowledge_manual_edits=False):
    """Write a stamped render after checking the output's own prior generated baseline."""
    path = Path(output)
    if path.exists():
        current = path.read_text(encoding="utf-8")
        try:
            root = _parse_xml(current)
            baseline = root.attrib.get(GENERATED_BASELINE)
        except ET.ParseError:
            baseline = None
        if not baseline:
            if not acknowledge_manual_edits:
                raise _manual_edit_error("existing output has no generated baseline")
        elif hashlib.sha256(_canonical_xml(current).encode("utf-8")).hexdigest() != baseline:
            if not acknowledge_manual_edits:
                raise _manual_edit_error("manual edits detected in existing output")
    path.write_text(xml, encoding="utf-8")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Render a diagram spec to draw.io XML.")
    parser.add_argument("spec", help="path to the spec JSON file")
    parser.add_argument("-o", "--output", help="output .drawio path (default: stdout)")
    parser.add_argument("--theme", choices=["light", "dark"], default=None,
                        help="presentation theme override (light or dark)")
    parser.add_argument("--strict", action="store_true",
                        help="exit 2 when the layout check reports a finding")
    parser.add_argument("--acknowledge-manual-edits", action="store_true",
                        help="explicitly allow replacing an untrusted or hand-edited output")
    args = parser.parse_args(argv)

    import validate_spec

    try:
        with open(args.spec, encoding="utf-8") as handle:
            spec = json.load(handle)
        errors = validate_spec.validate(spec)
        if errors:
            raise SpecError("; ".join(errors))
        lay = layout(spec)
        xml = render(spec, theme=args.theme)
    except (SpecError, OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        sys.stderr.write("render failed: %s\n" % error)
        return 1
    if args.output:
        try:
            write_output(
                xml, args.output,
                acknowledge_manual_edits=args.acknowledge_manual_edits,
            )
        except (OSError, SpecError) as error:
            sys.stderr.write("render failed: %s\n" % error)
            return 1
        sys.stderr.write("wrote %s\n" % args.output)
    else:
        sys.stdout.write(xml)
    findings = check_layout.check(spec, lay)
    for finding in findings:
        sys.stderr.write("layout: %s\n" % finding)
    if findings and args.strict:
        sys.stderr.write("%d layout finding(s); fix the spec or drop --strict\n" % len(findings))
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
