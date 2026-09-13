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
import json
import sys
import xml.etree.ElementTree as ET

import render_erd

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
    AWS_ICONS, CARDINALITIES, CLOUD_KINDS, DIAGRAM_TYPES, EDGE_LEGEND, EDGE_STYLES, ER_ARROWS,
    INK, MUTED, NODE_PROPERTIES, STYLE_CATALOG, WARN, WARN_TEXT, _C4_EDGE,
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


def _label_html(node):
    """Build the cell label: bold name, muted sublabel, warning when unproven."""
    parts = ["<b>%s</b>" % node.get("label", "")] if node.get("label") else []
    if node.get("sublabel"):
        parts.append('<font style="font-size:10px">[%s]</font>' % node["sublabel"])
    if node.get("metric"):
        parts.append('<font style="font-size:10px">%s</font>' % node["metric"])
    if not node.get("evidence"):
        parts.append('<font style="font-size:10px">&#9888; UNVERIFIED</font>')
    return "<br>".join(parts)


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


def _shape_cell(root, node, x, y):
    spec_kind = _kind(node)
    _node_cell(root, node, spec_kind["style"], x, y, spec_kind["w"], spec_kind["h"])


def _node_cell(root, node, style, x, y, w, h):
    """One vertex per node: object-wrapped when it carries evidence or a constraint."""
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
    _geometry(cell, x, y, w, h)


def _unverified_style(style):
    """Strip the confident fill and mark the shape as not yet proven by evidence."""
    kept = [part for part in style.split(";")
            if part and not part.startswith(("fillColor", "fontColor", "strokeColor",
                                             "dashed", "dashPattern", "strokeWidth"))]
    kept += ["fillColor=#FFFFFF", "fontColor=%s" % WARN_TEXT, "strokeColor=%s" % WARN,
             "dashed=1", "dashPattern=6 4", "strokeWidth=2"]
    return ";".join(kept)


def _place_columns(columns):
    """Stack each column and centre the columns against each other.

    Centring matters: a hub pinned to the top row forces every edge into a long
    dog-leg that crosses the boxes underneath it.
    """
    heights = {}
    for column, members in columns.items():
        heights[column] = (sum(k["h"] for _, k in members)
                           + ROW_GAP * max(0, len(members) - 1))
    tallest = max(heights.values()) if heights else 0
    placed = {}
    for column in sorted(columns):
        y = BODY_Y + (tallest - heights[column]) / 2.0
        for node, kind in columns[column]:
            x = MARGIN_X + column * COL_STEP + (CELL_W - kind["w"]) / 2.0
            placed[node["id"]] = (int(x), int(y))
            y += kind["h"] + ROW_GAP
    return placed


def _place_rows(rows):
    """Lay rows out top-down, each row centred on the widest one."""
    widths = {}
    for row, members in rows.items():
        widths[row] = (sum(k["w"] for _, k in members)
                       + MIN_LABEL_GAP * max(0, len(members) - 1))
    widest = max(widths.values()) if widths else 0
    placed = {}
    y = BODY_Y
    for row in sorted(rows):
        members = rows[row]
        x = MARGIN_X + (widest - widths[row]) / 2.0
        row_height = max(k["h"] for _, k in members)
        for node, kind in members:
            placed[node["id"]] = (int(x), int(y + (row_height - kind["h"]) / 2.0))
            x += kind["w"] + MIN_LABEL_GAP
        y += row_height + ROW_GAP + 30
    return placed


def _layout_context(nodes):
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
    return _place_columns({c: m for c, m in columns.items() if m})


def _layout_layered(nodes):
    """Rows read as the request travels: clients, edge, services, data, external."""
    layers = {}
    for node in nodes:
        kind = _kind(node)
        layer = node.get("layer", kind["layer"])
        layers.setdefault(layer, []).append((node, kind))
    rows = {index: layers[layer] for index, layer in enumerate(sorted(layers))}
    return _place_rows(rows)


def _layout_state(nodes, edges):
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
    return _place_rows(rows)


def _layout_sequence(nodes):
    return _place_columns({index: [(node, _kind(node))]
                           for index, node in enumerate(nodes)})


def _lifeline_x(node, placed):
    x, _ = placed[node["id"]]
    return x + _kind(node)["w"] / 2.0


def _render_sequence_body(root, nodes, edges, placed):
    """Messages are free-floating horizontal edges so each sits exactly on its row."""
    bottom = BODY_Y + CELL_H + 80 + len(edges) * 60
    for node in nodes:
        x = _lifeline_x(node, placed)
        top = placed[node["id"]][1] + _kind(node)["h"]
        line = ET.SubElement(root, "mxCell", {
            "id": "_life_%s" % node["id"], "value": "",
            "style": "endArrow=none;dashed=1;html=1;strokeColor=#9AA5B1;",
            "edge": "1", "parent": "1",
        })
        geometry = ET.SubElement(line, "mxGeometry", {"relative": "1", "as": "geometry"})
        ET.SubElement(geometry, "mxPoint",
                      {"x": str(int(x)), "y": str(int(top)), "as": "sourcePoint"})
        ET.SubElement(geometry, "mxPoint",
                      {"x": str(int(x)), "y": str(int(bottom)), "as": "targetPoint"})
    for index, edge in enumerate(edges):
        y = BODY_Y + CELL_H + 80 + index * 60
        source = _lifeline_x(_node_by_id(nodes, edge["from"]), placed)
        target = _lifeline_x(_node_by_id(nodes, edge["to"]), placed)
        cell = ET.SubElement(root, "mxCell", {
            "id": "_msg_%d" % index, "value": _edge_value(edge),
            "style": EDGE_STYLES[edge.get("style", "sync")], "edge": "1", "parent": "1",
        })
        geometry = ET.SubElement(cell, "mxGeometry", {"relative": "1", "as": "geometry"})
        ET.SubElement(geometry, "mxPoint",
                      {"x": str(int(source)), "y": str(int(y)), "as": "sourcePoint"})
        ET.SubElement(geometry, "mxPoint",
                      {"x": str(int(target)), "y": str(int(y)), "as": "targetPoint"})
        points = ET.SubElement(geometry, "Array", {"as": "points"})
        ET.SubElement(points, "mxPoint",
                      {"x": str(int((source + target) / 2)), "y": str(int(y))})
    return bottom


def _edge_value(edge):
    """Edge label, with the metric as a smaller second line when the spec carries one."""
    label = edge.get("label", "")
    if not edge.get("metric"):
        return label
    return '%s<br><font style="font-size:9px;color:%s">%s</font>' % (label, MUTED, edge["metric"])


def _node_by_id(nodes, node_id):
    for node in nodes:
        if node["id"] == node_id:
            return node
    raise SpecError("edge references unknown node %r" % node_id)


def _render_groups(root, spec, placed):
    """Boundary boxes are emitted before their members so they sit behind them."""
    groups = spec.get("groups") or []
    for group in groups:
        members = [n for n in spec["nodes"] if n.get("group") == group["id"]]
        if not members:
            continue
        boxes = []
        for node in members:
            x, y = placed[node["id"]]
            kind = _kind(node)
            boxes.append((x, y, x + kind["w"], y + kind["h"]))
        pad_x, pad_top, pad_bottom = 30, 46, 30
        x0 = min(b[0] for b in boxes) - pad_x
        y0 = min(b[1] for b in boxes) - pad_top
        x1 = max(b[2] for b in boxes) + pad_x
        y1 = max(b[3] for b in boxes) + pad_bottom
        cell = ET.SubElement(root, "mxCell", {
            "id": "_group_%s" % group["id"], "value": group.get("label", ""),
            "style": ("rounded=1;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#9AA5B1;"
                      "dashed=1;dashPattern=8 4;verticalAlign=top;align=left;spacingLeft=12;"
                      "spacingTop=6;fontColor=%s;fontSize=11;arcSize=6;" % MUTED),
            "vertex": "1", "parent": "1",
        })
        _geometry(cell, int(x0), int(y0), int(x1 - x0), int(y1 - y0))


def _anchor_style(source_box, target_box):
    """Pin each end to the facing side, so a line never cuts through a third box."""
    sx, sy, sw, sh = source_box
    tx, ty, tw, th = target_box
    dx = (tx + tw / 2.0) - (sx + sw / 2.0)
    dy = (ty + th / 2.0) - (sy + sh / 2.0)
    if abs(dx) >= abs(dy):
        exit_point, entry_point = ((1, 0.5), (0, 0.5)) if dx >= 0 else ((0, 0.5), (1, 0.5))
    else:
        exit_point, entry_point = ((0.5, 1), (0.5, 0)) if dy >= 0 else ((0.5, 0), (0.5, 1))
    return ("exitX=%s;exitY=%s;exitDx=0;exitDy=0;entryX=%s;entryY=%s;entryDx=0;entryDy=0;"
            % (exit_point[0], exit_point[1], entry_point[0], entry_point[1]))


def _render_edges(root, spec, edges, boxes):
    for index, edge in enumerate(edges):
        style = EDGE_STYLES[edge.get("style", "sync")]
        if edge["from"] in boxes and edge["to"] in boxes:
            style += _anchor_style(boxes[edge["from"]], boxes[edge["to"]])
        cell = ET.SubElement(root, "mxCell", {
            "id": "_edge_%d" % index, "value": _edge_value(edge),
            "style": style, "edge": "1", "parent": "1",
            "source": edge["from"], "target": edge["to"],
        })
        # Push the label off the midpoint: on a dog-legged route the midpoint
        # lands on the turn, which puts the text on top of the box it left.
        ET.SubElement(cell, "mxGeometry",
                      {"x": "-0.35", "relative": "1", "as": "geometry"})


def _render_title(root, spec, accent, width):
    _text_cell(root, "_title", spec.get("title", ""), MARGIN_X, TITLE_Y, width, 30,
               20, INK, bold=True)
    meta = " · ".join(filter(None, [
        spec.get("scope", ""),
        "v%s" % spec["version"] if spec.get("version") else "",
        spec.get("date", ""),
        spec.get("author", ""),
    ]))
    _text_cell(root, "_meta", meta, MARGIN_X, TITLE_Y + 30, width, 18, 11, MUTED)
    rule = ET.SubElement(root, "mxCell", {
        "id": "_rule", "value": "",
        "style": "line;html=1;strokeWidth=3;strokeColor=%s;" % accent,
        "vertex": "1", "parent": "1",
    })
    _geometry(rule, MARGIN_X, TITLE_Y + 52, 120, 10)


def _render_legend(root, spec, edges, top):
    """A reader must never have to guess what a shape or a line style means."""
    kinds, seen = [], set()
    for node in spec["nodes"]:
        if node["kind"] not in seen:
            seen.add(node["kind"])
            kinds.append(node["kind"])
    entries = [(STYLE_CATALOG[k]["style"], STYLE_CATALOG[k]["legend"]) for k in kinds]
    if spec.get("type") == "erd":
        edge_entries = render_erd.legend_entries(edges)
    else:
        edge_entries, seen_edges = [], set()
        for edge in edges:
            style = edge.get("style", "sync")
            if style not in seen_edges:
                seen_edges.add(style)
                edge_entries.append((EDGE_STYLES[style], EDGE_LEGEND[style]))
    if any(not n.get("evidence") for n in spec["nodes"]):
        entries.append((_unverified_style(STYLE_CATALOG["system"]["style"]),
                        "UNVERIFIED — not yet confirmed against code or docs"))

    _text_cell(root, "_legend_title", "Legend", MARGIN_X, top, 200, 20, 12, INK, bold=True)
    y = top + 26
    for index, (style, label) in enumerate(entries):
        swatch = ET.SubElement(root, "mxCell", {
            "id": "_legend_shape_%d" % index, "value": "", "style": style,
            "vertex": "1", "parent": "1",
        })
        _geometry(swatch, MARGIN_X, y, 34, 22)
        _text_cell(root, "_legend_text_%d" % index, label, MARGIN_X + 46, y, 460, 22,
                   11, MUTED)
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
                   MARGIN_X + 46, y, 460, 22, 11, MUTED)
        y += 30


def render(spec):
    """Return draw.io XML for one spec. Raises SpecError on anything unrenderable."""
    if spec.get("type") not in DIAGRAM_TYPES:
        raise SpecError("unknown diagram type %r. Known types: %s"
                        % (spec.get("type"), ", ".join(DIAGRAM_TYPES)))
    nodes = spec.get("nodes") or []
    if not nodes:
        raise SpecError("spec has no nodes")
    edges = spec.get("edges") or []
    accent = (spec.get("theme") or {}).get("accent", DEFAULT_ACCENT)

    mxfile = ET.Element("mxfile", {"host": "agent-skills-standard", "type": "device"})
    diagram = ET.SubElement(mxfile, "diagram", {"id": "diagram-1",
                                                "name": spec.get("title", "Diagram")[:50]})
    model = ET.SubElement(diagram, "mxGraphModel", {
        "dx": "1400", "dy": "900", "grid": "0", "gridSize": "10", "guides": "1",
        "tooltips": "1", "connect": "1", "arrows": "1", "fold": "1", "page": "1",
        "pageScale": "1", "pageWidth": "1600", "pageHeight": "1200", "math": "0",
        "shadow": "0",
    })
    root = ET.SubElement(model, "root")
    ET.SubElement(root, "mxCell", {"id": "0"})
    ET.SubElement(root, "mxCell", {"id": "1", "parent": "0"})

    if spec["type"] == "erd":
        placed = render_erd.layout_erd(nodes, edges)
    elif spec["type"] == "context":
        placed = _layout_context(nodes)
    elif spec["type"] == "sequence":
        placed = _layout_sequence(nodes)
    elif spec["type"] == "state":
        placed = _layout_state(nodes, edges)
    else:
        placed = _layout_layered(nodes)

    boxes = {}
    for node in nodes:
        x, y = placed[node["id"]]
        kind = _kind(node)
        h = render_erd.entity_height(node) if node["kind"] == "entity" else kind["h"]
        boxes[node["id"]] = (x, y, kind["w"], h)

    width = max(x + w + 60 for x, _, w, _ in boxes.values())
    _render_title(root, spec, accent, width)
    _render_groups(root, spec, placed)
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
    _render_legend(root, spec, edges, bottom + 70)
    return ET.tostring(mxfile, encoding="unicode")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Render a diagram spec to draw.io XML.")
    parser.add_argument("spec", help="path to the spec JSON file")
    parser.add_argument("-o", "--output", help="output .drawio path (default: stdout)")
    args = parser.parse_args(argv)

    with open(args.spec, encoding="utf-8") as handle:
        spec = json.load(handle)
    try:
        xml = render(spec)
    except SpecError as error:
        sys.stderr.write("render failed: %s\n" % error)
        return 1
    if args.output:
        with open(args.output, "w", encoding="utf-8") as handle:
            handle.write(xml)
        sys.stderr.write("wrote %s\n" % args.output)
    else:
        sys.stdout.write(xml)
    return 0


if __name__ == "__main__":
    sys.exit(main())
