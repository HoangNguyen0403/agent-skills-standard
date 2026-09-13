#!/usr/bin/env python3
"""Lint a diagram spec before it is rendered.

Catches the two failure modes that make architecture diagrams useless: shapes a
reader cannot decode, and executive diagrams dense enough to be skipped.

Usage:
    python3 validate_spec.py spec.json
Exit code 0 when clean, 1 when the spec has errors (printed one per line).
"""

import argparse
import json
import sys

from render_drawio import DIAGRAM_TYPES, EDGE_STYLES, STYLE_CATALOG

# Above this, an executive stops reading and asks for a walkthrough instead.
EXEC_NODE_CAP = 12

REQUIRED_FIELDS = ("title", "type", "audience", "version", "date", "scope")
AUDIENCES = ("exec", "tech")


def validate(spec):
    """Return a list of human-readable errors; empty means the spec is renderable."""
    errors = []
    if not isinstance(spec, dict):
        return ["spec must be a JSON object"]

    for field in REQUIRED_FIELDS:
        if not spec.get(field):
            errors.append("missing required field: %s" % field)

    diagram_type = spec.get("type")
    if diagram_type and diagram_type not in DIAGRAM_TYPES:
        errors.append("unknown diagram type %r; known types: %s"
                      % (diagram_type, ", ".join(DIAGRAM_TYPES)))

    audience = spec.get("audience")
    if audience and audience not in AUDIENCES:
        errors.append("unknown audience %r; known audiences: %s"
                      % (audience, ", ".join(AUDIENCES)))

    nodes = spec.get("nodes") or []
    edges = spec.get("edges") or []
    if not nodes:
        errors.append("spec has no nodes")
        return errors

    errors += _validate_nodes(spec, nodes)
    errors += _validate_edges(nodes, edges)
    errors += _validate_type_rules(diagram_type, nodes)

    if audience == "exec" and len(nodes) > EXEC_NODE_CAP:
        errors.append(
            "exec diagram has %d nodes; cap is %d. Split it by C4 level or by flow, "
            "or re-target it at audience 'tech'." % (len(nodes), EXEC_NODE_CAP))
    return errors


def _validate_nodes(spec, nodes):
    errors = []
    known_groups = {g.get("id") for g in (spec.get("groups") or [])}
    seen = set()
    for node in nodes:
        node_id = node.get("id")
        if not node_id:
            errors.append("node without an id: %r" % node)
            continue
        if node_id in seen:
            errors.append("duplicate node id: %s" % node_id)
        seen.add(node_id)
        if not node.get("label") and node.get("kind") not in ("start", "end"):
            errors.append("node %s has no label" % node_id)
        if node.get("kind") not in STYLE_CATALOG:
            errors.append("node %s has unknown kind %r; known kinds: %s"
                          % (node_id, node.get("kind"), ", ".join(sorted(STYLE_CATALOG))))
        group = node.get("group")
        if group and group not in known_groups:
            errors.append("node %s references undeclared group %r" % (node_id, group))
    return errors


def _validate_edges(nodes, edges):
    errors = []
    ids = {n.get("id") for n in nodes}
    connected = set()
    for edge in edges:
        source, target = edge.get("from"), edge.get("to")
        for end in (source, target):
            if end not in ids:
                errors.append("edge references unknown node %r" % end)
        if not edge.get("label"):
            errors.append("edge %s -> %s has no label; every relationship must state "
                          "its protocol or event" % (source, target))
        style = edge.get("style", "sync")
        if style not in EDGE_STYLES:
            errors.append("edge %s -> %s has unknown style %r; known styles: %s"
                          % (source, target, style, ", ".join(sorted(EDGE_STYLES))))
        connected.update([source, target])
    for node in nodes:
        if node.get("id") not in connected:
            errors.append("node %s is not connected to anything; delete it or connect it"
                          % node.get("id"))
    return errors


def _validate_type_rules(diagram_type, nodes):
    kinds = {n.get("kind") for n in nodes}
    if diagram_type == "sequence" and "participant" not in kinds:
        return ["sequence diagrams need nodes of kind 'participant'"]
    if diagram_type == "state" and "start" not in kinds:
        return ["state diagrams need exactly one node of kind 'start'"]
    return []


def main(argv=None):
    parser = argparse.ArgumentParser(description="Validate a diagram spec.")
    parser.add_argument("spec", help="path to the spec JSON file")
    args = parser.parse_args(argv)

    with open(args.spec, encoding="utf-8") as handle:
        spec = json.load(handle)
    errors = validate(spec)
    for error in errors:
        sys.stderr.write("%s\n" % error)
    if errors:
        sys.stderr.write("\n%d problem(s); nothing rendered.\n" % len(errors))
        return 1
    sys.stderr.write("spec OK\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
