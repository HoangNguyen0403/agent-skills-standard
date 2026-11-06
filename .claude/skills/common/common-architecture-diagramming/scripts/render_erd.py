#!/usr/bin/env python3
"""Entity-relationship rendering for the draw.io pipeline.

Entities are swimlane cells whose children are one text row per column; relations are
orthogonal edges carrying IE-notation arrows chosen by cardinality, drawn on explicit
ports and waypoints so the rendered route is the one `check_layout` measures.

Header height, header text and row heights come from `text_layout.entity_plan`, the
same plan the checker measures: the swimlane's `startSize` is the planned header, and
each row's height is the height its wrapped text needs.
"""

import xml.etree.ElementTree as ET
import text_layout
from style_catalog import (EDGE_PROPERTIES, ENTITY_ROW_STYLE, ER_ARROWS, STYLE_CATALOG,
                           _C4_EDGE)

ENTITY_W = STYLE_CATALOG["entity"]["w"]


def entity_plan(node):
    return text_layout.entity_plan(node, ENTITY_W)


def entity_height(node):
    return entity_plan(node).total_height


def _depths(nodes, edges):
    """Column index per entity: referenced tables left, referencing tables right."""
    outgoing = {}
    for edge in edges:
        outgoing.setdefault(edge["from"], []).append(edge["to"])
    depth = {}

    def visit(node_id, trail):
        if node_id in depth:
            return depth[node_id]
        if node_id in trail:          # cycle: break at the first edge seen
            return 0
        targets = outgoing.get(node_id, [])
        value = 0 if not targets else 1 + max(visit(t, trail | {node_id}) for t in targets)
        depth[node_id] = value
        return value

    for node in nodes:
        visit(node["id"], frozenset())
    return depth


def layout_erd(nodes, edges, body_y=170):
    from render_drawio import _place_columns
    depth = _depths(nodes, edges)
    columns = {}
    for node in nodes:
        kind = dict(STYLE_CATALOG["entity"], h=entity_height(node))
        columns.setdefault(depth[node["id"]], []).append((node, kind))
    return _place_columns(columns, body_y=body_y)


def _entity_style(mode, header_height):
    """The swimlane style with the planned header and font as its actual startSize/fontSize."""
    from style_catalog import get_node_style
    tokens = [token for token in get_node_style("entity", mode=mode).split(";") if token]
    replacements = {"startSize=": header_height, "fontSize=": text_layout.ENTITY_HEADER_FONT}
    styled = []
    for token in tokens:
        prefix = next((key for key in replacements if token.startswith(key)), None)
        styled.append("%s%d" % (prefix, replacements[prefix]) if prefix else token)
    return ";".join(styled) + ";"


def render_entities(root, nodes, placed, mode="light"):
    from render_drawio import _geometry, _node_cell
    from style_catalog import ENTITY_ROW_STYLE_DARK
    row_style = ENTITY_ROW_STYLE_DARK if mode == "dark" else ENTITY_ROW_STYLE
    for node in nodes:
        x, y = placed[node["id"]]
        plan = entity_plan(node)
        _node_cell(root, node, _entity_style(mode, plan.header_height),
                   x, y, ENTITY_W, plan.total_height, mode=mode, label=plan.header_text)
        cur_y = plan.header_height
        for index, row in enumerate(plan.rows):
            cell = ET.SubElement(root, "mxCell", {
                "id": "%s__row_%d" % (node["id"], index), "value": row.text,
                "style": row_style, "vertex": "1", "parent": node["id"],
            })
            _geometry(cell, 0, cur_y, ENTITY_W, row.height)
            cur_y += row.height


def relation_style(cardinality, mode="light"):
    """Orthogonal base with IE-notation arrows: cardinality without a private router."""
    from style_catalog import _C4_EDGE_DARK
    start, end = ER_ARROWS[cardinality]
    edge_base = _C4_EDGE_DARK if mode == "dark" else _C4_EDGE
    base = edge_base.replace("endArrow=blockThin;", "").replace("endFill=1;", "")
    return base + "startArrow=%s;endArrow=%s;startFill=0;endFill=0;" % (start, end)


def render_relations(root, spec, edges, lay, mode="light"):
    """Draw each relation on the planned route: same ports, waypoints, and label anchor
    the checker measures (`check_layout.plan_routes`/`label_fraction`)."""
    from render_drawio import (_anchor_style, _edge_value, _has_supported_evidence,
                               _property_value, _unverified_style)
    import check_layout
    boxes = lay.boxes
    routes = {id(edge): points
              for edge, points in check_layout.plan_routes(spec, boxes, lay.rows)}
    label_h = {node["id"]: max(0, boxes[node["id"]][3] - lay.cells[node["id"]][3])
               for node in spec["nodes"]}
    for index, edge in enumerate(edges):
        style = relation_style(edge["cardinality"], mode=mode)
        if not _has_supported_evidence(edge):
            style = _unverified_style(style, mode=mode)
        points = routes.get(id(edge))
        if points:
            style += _anchor_style(boxes[edge["from"]], boxes[edge["to"]],
                                   label_h[edge["from"]], label_h[edge["to"]])
        attrs = {
            "id": "_rel_%d" % index, "value": _edge_value(edge, mode=mode),
            "style": style, "edge": "1", "parent": "1",
            "source": edge["from"], "target": edge["to"],
        }
        attrs.update({
            key: _property_value(edge[key])
            for key in EDGE_PROPERTIES if edge.get(key) is not None
        })
        cell = ET.SubElement(root, "mxCell", attrs)
        plan = text_layout.edge_label_plan(edge)
        fraction = check_layout.label_fraction(points) if points else 0.5
        geometry = ET.SubElement(cell, "mxGeometry", {
            "x": "%g" % (2 * fraction - 1),
            "width": str(plan.width), "height": str(plan.height),
            "relative": "1", "as": "geometry",
        })
        if points and len(points) == 4 and points[1] != points[2]:
            waypoints = ET.SubElement(geometry, "Array", {"as": "points"})
            for x, y in points[1:3]:
                ET.SubElement(waypoints, "mxPoint", {"x": str(x), "y": str(y)})


def legend_entries(edges, mode="light"):
    seen, entries = set(), []
    for edge in edges:
        card = edge["cardinality"]
        if card not in seen:
            seen.add(card)
            entries.append((relation_style(card, mode=mode), card))
    return entries
