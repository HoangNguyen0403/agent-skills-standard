#!/usr/bin/env python3
"""Entity-relationship rendering for the draw.io pipeline.

Entities are swimlane cells whose children are one text row per column; relations use
draw.io's entityRelationEdgeStyle with IE-notation arrows chosen by cardinality.
"""

import xml.etree.ElementTree as ET

from style_catalog import (EDGE_PROPERTIES, ENTITY_HEADER_H, ENTITY_ROW_H, ENTITY_ROW_STYLE,
                           ER_ARROWS, STYLE_CATALOG, _C4_EDGE)

ENTITY_W = STYLE_CATALOG["entity"]["w"]


def entity_height(node):
    return ENTITY_HEADER_H + ENTITY_ROW_H * len(node.get("columns") or [])


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


def layout_erd(nodes, edges):
    from render_drawio import _place_columns
    depth = _depths(nodes, edges)
    columns = {}
    for node in nodes:
        kind = dict(STYLE_CATALOG["entity"], h=entity_height(node))
        columns.setdefault(depth[node["id"]], []).append((node, kind))
    return _place_columns(columns)


def _row_text(column):
    prefix = "PK " if column.get("pk") else "FK " if column.get("fk") else ""
    suffix = " ?" if column.get("nullable", True) and not column.get("pk") else ""
    return "%s%s : %s%s" % (prefix, column["name"], column["type"], suffix)


def render_entities(root, nodes, placed):
    from render_drawio import _geometry, _node_cell
    for node in nodes:
        x, y = placed[node["id"]]
        _node_cell(root, node, STYLE_CATALOG["entity"]["style"], x, y, ENTITY_W,
                   entity_height(node))
        for index, column in enumerate(node.get("columns") or []):
            row = ET.SubElement(root, "mxCell", {
                "id": "%s__row_%d" % (node["id"], index), "value": _row_text(column),
                "style": ENTITY_ROW_STYLE, "vertex": "1", "parent": node["id"],
            })
            _geometry(row, 0, ENTITY_HEADER_H + index * ENTITY_ROW_H, ENTITY_W, ENTITY_ROW_H)


def relation_style(cardinality):
    start, end = ER_ARROWS[cardinality]
    base = _C4_EDGE.replace("edgeStyle=orthogonalEdgeStyle", "edgeStyle=entityRelationEdgeStyle")
    base = base.replace("endArrow=blockThin;", "").replace("endFill=1;", "")
    return base + "startArrow=%s;endArrow=%s;startFill=0;endFill=0;" % (start, end)


def render_relations(root, edges):
    from render_drawio import _edge_value, _has_supported_evidence, _unverified_style
    for index, edge in enumerate(edges):
        style = relation_style(edge["cardinality"])
        if not _has_supported_evidence(edge):
            style = _unverified_style(style)
        attrs = {
            "id": "_rel_%d" % index, "value": _edge_value(edge),
            "style": style, "edge": "1", "parent": "1",
            "source": edge["from"], "target": edge["to"],
        }
        attrs.update({key: edge[key] for key in EDGE_PROPERTIES if edge.get(key) is not None})
        cell = ET.SubElement(root, "mxCell", attrs)
        ET.SubElement(cell, "mxGeometry", {"relative": "1", "as": "geometry"})


def legend_entries(edges):
    seen, entries = set(), []
    for edge in edges:
        card = edge["cardinality"]
        if card not in seen:
            seen.add(card)
            entries.append((relation_style(card), card))
    return entries
