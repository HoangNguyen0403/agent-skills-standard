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
from dataclasses import dataclass, field
import xml.etree.ElementTree as ET

import check_layout
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


def _footprint(kind):
    """Vertical room a shape needs, including a label drawn underneath an icon."""
    return kind["h"] + kind.get("label_h", 0)


def _footprint_w(kind):
    """Horizontal room, including a label wider than the icon it sits under."""
    return max(kind["w"], kind.get("label_w", 0))


def _place_columns(columns):
    """Stack each column and centre the columns against each other.

    Centring matters: a hub pinned to the top row forces every edge into a long
    dog-leg that crosses the boxes underneath it.
    """
    heights = {}
    for column, members in columns.items():
        heights[column] = (sum(_footprint(k) for _, k in members)
                           + ROW_GAP * max(0, len(members) - 1))
    tallest = max(heights.values()) if heights else 0
    placed = {}
    for column in sorted(columns):
        y = BODY_Y + (tallest - heights[column]) / 2.0
        for node, kind in columns[column]:
            x = MARGIN_X + column * COL_STEP + (CELL_W - _footprint_w(kind)) / 2.0
            placed[node["id"]] = (int(x), int(y))
            y += _footprint(kind) + ROW_GAP
    return placed


def _place_rows(rows, align="centre", gap=ROW_GAP + 30):
    """Lay rows out top-down; centred on the widest row, or left-aligned for group bands."""
    widths = {}
    for row, members in rows.items():
        widths[row] = (sum(_footprint_w(k) for _, k in members)
                       + MIN_LABEL_GAP * max(0, len(members) - 1))
    widest = max(widths.values()) if widths else 0
    placed = {}
    y = BODY_Y
    for row in sorted(rows):
        members = rows[row]
        x = MARGIN_X + ((widest - widths[row]) / 2.0 if align == "centre" else 0)
        row_height = max(_footprint(k) for _, k in members)
        for node, kind in members:
            placed[node["id"]] = (int(x), int(y + (row_height - _footprint(kind)) / 2.0))
            x += _footprint_w(kind) + MIN_LABEL_GAP
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
        limit = (max(placed[n["id"]][0] + _footprint_w(k) for n, k in members)
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


FAN_LABEL_STEP = 22   # vertical room per staggered fan-out edge so labels do not stack


def _row_gap(nodes, edges):
    """Widen the gap between rows when one node fans out to several nodes in other rows."""
    layer_of = {n["id"]: n.get("layer", _kind(n)["layer"]) for n in nodes}
    fan = {}
    for edge in edges:
        src, dst = edge.get("from"), edge.get("to")
        if src in layer_of and dst in layer_of and layer_of[src] != layer_of[dst]:
            fan[src] = fan.get(src, 0) + 1
    widest = max(fan.values(), default=0)
    return max(ROW_GAP + 30, FAN_LABEL_STEP * (widest + 1))


def _layout_layered(nodes, edges):
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
        return _place_rows(rows, gap=gap)
    rows = {}
    for index, layer in enumerate(sorted(layers)):
        rows[index] = sorted(layers[layer],
                             key=lambda pair: ranks.get(pair[0].get("group"), len(ranks)))
    placed = _place_rows(rows, align="left", gap=gap)
    return _push_past_group_bands(rows, placed, ranks)


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


def _render_groups(root, spec, layout):
    """Boundary boxes are emitted before their members so they sit behind them."""
    for group in spec.get("groups") or []:
        if group["id"] not in layout.groups:
            continue
        x, y, w, h = layout.groups[group["id"]]
        cell = ET.SubElement(root, "mxCell", {
            "id": "_group_%s" % group["id"], "value": group.get("label", ""),
            "style": ("rounded=1;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#9AA5B1;"
                      "dashed=1;dashPattern=8 4;verticalAlign=top;align=left;spacingLeft=12;"
                      "spacingTop=6;fontColor=%s;fontSize=11;arcSize=6;" % MUTED),
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


def _render_edges(root, spec, edges, lay):
    boxes = lay.boxes
    label_h = {n["id"]: _kind(n).get("label_h", 0) for n in spec["nodes"]}
    routes = {id(edge): points
              for edge, points in check_layout.plan_routes(spec, boxes, lay.rows)}
    for index, edge in enumerate(edges):
        style = EDGE_STYLES[edge.get("style", "sync")]
        points = routes.get(id(edge))
        if points:
            style += _anchor_style(boxes[edge["from"]], boxes[edge["to"]],
                                   label_h[edge["from"]], label_h[edge["to"]])
        cell = ET.SubElement(root, "mxCell", {
            "id": "_edge_%d" % index, "value": _edge_value(edge),
            "style": style, "edge": "1", "parent": "1",
            "source": edge["from"], "target": edge["to"],
        })
        # Label position is relative along the path: -1 source, 0 middle, 1 target.
        fraction = check_layout.label_fraction(points) if points else 0.5
        geometry = ET.SubElement(cell, "mxGeometry",
                                 {"x": "%g" % (2 * fraction - 1), "relative": "1", "as": "geometry"})
        if points and len(points) == 4 and points[1] != points[2]:
            waypoints = ET.SubElement(geometry, "Array", {"as": "points"})
            for x, y in points[1:3]:
                ET.SubElement(waypoints, "mxPoint", {"x": str(int(x)), "y": str(int(y))})


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


@dataclass(frozen=True)
class Layout:
    """Where everything lands; render() draws exactly this.

    boxes: visual footprint per node (x, y, w, h), including an icon's label block.
    cells: the shape geometry per node, centred inside its footprint.
    groups: boundary boxes. rows: row index per node for layered types, else empty.
    """
    boxes: dict
    cells: dict = field(default_factory=dict)
    groups: dict = field(default_factory=dict)
    rows: dict = field(default_factory=dict)


GROUP_PAD_X = 30


def group_box(member_boxes):
    pad_x, pad_top, pad_bottom = GROUP_PAD_X, 46, 30
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
    return _layout_layered(nodes, edges)


def layout(spec):
    """Geometry only. Raises SpecError on anything unrenderable."""
    if spec.get("type") not in DIAGRAM_TYPES:
        raise SpecError("unknown diagram type %r. Known types: %s"
                        % (spec.get("type"), ", ".join(DIAGRAM_TYPES)))
    nodes = spec.get("nodes") or []
    if not nodes:
        raise SpecError("spec has no nodes")
    edges = spec.get("edges") or []
    placed = _place(spec, nodes, edges)
    boxes, cells = {}, {}
    for node in nodes:
        x, y = placed[node["id"]]
        kind = _kind(node)
        if node["kind"] == "entity":
            h, fw, fh = render_erd.entity_height(node), kind["w"], render_erd.entity_height(node)
        else:
            h, fw, fh = kind["h"], _footprint_w(kind), _footprint(kind)
        boxes[node["id"]] = (x, y, fw, fh)
        cells[node["id"]] = (int(x + (fw - kind["w"]) / 2.0), y, kind["w"], h)
    groups = {}
    for group in spec.get("groups") or []:
        members = [boxes[n["id"]] for n in nodes if n.get("group") == group["id"]]
        if members:
            groups[group["id"]] = group_box(members)
    return Layout(boxes=boxes, cells=cells, groups=groups, rows=_rows(spec, nodes))


def _rows(spec, nodes):
    if spec["type"] not in ("container", "deployment", "dataflow"):
        return {}
    layers = sorted({n.get("layer", _kind(n)["layer"]) for n in nodes})
    return {n["id"]: layers.index(n.get("layer", _kind(n)["layer"])) for n in nodes}


def render(spec):
    """Return draw.io XML for one spec. Raises SpecError on anything unrenderable."""
    lay = layout(spec)
    nodes = spec.get("nodes") or []
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

    boxes = lay.boxes
    placed = {node_id: (x, y) for node_id, (x, y, _, _) in lay.cells.items()}

    width = max(x + w + 60 for x, _, w, _ in boxes.values())
    _render_title(root, spec, accent, width)
    _render_groups(root, spec, lay)
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
        _render_edges(root, spec, edges, lay)
        bottom = max(y + h for _, y, _, h in boxes.values())
    _render_legend(root, spec, edges, bottom + 70)
    return ET.tostring(mxfile, encoding="unicode")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Render a diagram spec to draw.io XML.")
    parser.add_argument("spec", help="path to the spec JSON file")
    parser.add_argument("-o", "--output", help="output .drawio path (default: stdout)")
    parser.add_argument("--strict", action="store_true",
                        help="exit 2 when the layout check reports a finding")
    args = parser.parse_args(argv)

    with open(args.spec, encoding="utf-8") as handle:
        spec = json.load(handle)
    try:
        lay = layout(spec)
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
    findings = check_layout.check(spec, lay)
    for finding in findings:
        sys.stderr.write("layout: %s\n" % finding)
    if findings and args.strict:
        sys.stderr.write("%d layout finding(s); fix the spec or drop --strict\n" % len(findings))
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
