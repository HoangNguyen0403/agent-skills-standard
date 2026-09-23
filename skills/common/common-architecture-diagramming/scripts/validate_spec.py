#!/usr/bin/env python3
"""Lint a diagram spec before it is rendered.

Catches the two failure modes that make architecture diagrams useless: shapes a
reader cannot decode, and executive diagrams dense enough to be skipped.

Usage:
    python3 validate_spec.py spec.json
Exit code 0 when clean or warnings only, 1 when the spec has errors (printed one per line).
"""

import argparse
import json
import re
import sys

from render_drawio import CARDINALITIES, DIAGRAM_TYPES, EDGE_STYLES, STYLE_CATALOG

# Above this, an executive stops reading and asks for a walkthrough instead.
EXEC_NODE_CAP = 12

REQUIRED_FIELDS = ("title", "type", "audience", "version", "date", "scope")
AUDIENCES = ("exec", "tech")

# A metric provenance says whether the number is a target, estimate, or measurement.
# Metric provenance describes the kind of number, not its confidence.
METRIC_PROVENANCES = ("target", "estimated", "measured")
LIFECYCLES = ("proposed", "implemented", "retired")
# Source kind is separate from confidence: code/document citations are documented evidence,
# while runtime/deployment captures may support an observed confidence.
EVIDENCE_KINDS = ("code", "document", "runtime", "deployment")
EVIDENCE_CONFIDENCES = ("unverified", "assumed", "documented", "observed")

VIEW_FIELDS = (
    "question", "decision", "scenario", "invariant", "status", "evidence", "omissions",
)
IDENTITY_PATTERN = r"^[A-Za-z][A-Za-z0-9_.:-]*$"
METRIC_MAX_CHARS = 48
# Diagram types where a tech reader expects to see the numbers that justified each box.
METRIC_EXPECTED_TYPES = ("container", "deployment", "dataflow")



def validate(spec, require_contract=False):
    """Return a list of human-readable errors; empty means the spec is renderable."""
    errors = []
    if not isinstance(spec, dict):
        return ["spec must be a JSON object"]

    for field in REQUIRED_FIELDS:
        if not spec.get(field):
            errors.append("missing required field: %s" % field)
        elif not isinstance(spec[field], str):
            errors.append("%s must be a string" % field)
    if "author" in spec and not isinstance(spec["author"], str):
        errors.append("author must be a string")
    theme = spec.get("theme")
    if theme is not None:
        if not isinstance(theme, dict):
            errors.append("theme must be an object")
        elif "accent" in theme and (
                not isinstance(theme["accent"], str) or
                not re.fullmatch(r"#[0-9a-fA-F]{6}", theme["accent"])):
            errors.append("theme accent must be a six-digit hex colour")

    diagram_type = spec.get("type")
    if diagram_type and diagram_type not in DIAGRAM_TYPES:
        errors.append("unknown diagram type %r; known types: %s"
                      % (diagram_type, ", ".join(DIAGRAM_TYPES)))

    audience = spec.get("audience")
    if audience and audience not in AUDIENCES:
        errors.append("unknown audience %r; known audiences: %s"
                      % (audience, ", ".join(AUDIENCES)))

    raw_nodes = spec.get("nodes", [])
    raw_edges = spec.get("edges", [])
    if raw_nodes is None:
        raw_nodes = []
    if raw_edges is None:
        raw_edges = []
    nodes = raw_nodes if isinstance(raw_nodes, list) else []
    edges = raw_edges if isinstance(raw_edges, list) else []
    if not isinstance(raw_nodes, list):
        errors.append("nodes must be a list of objects")
    if not isinstance(raw_edges, list):
        errors.append("edges must be a list of objects")
    errors += _validate_view_contract(spec, require_contract)
    errors += _validate_nodes(spec, nodes)
    errors += _validate_edges(spec, nodes, edges)
    errors += _validate_type_rules(diagram_type, nodes)
    metadata_mode = require_contract or spec.get("view") is not None or any(
        isinstance(item, dict) and _has_provenance_fields(item)
        for item in nodes + edges
    )
    if metadata_mode:
        metadata_required = require_contract or spec.get("view") is not None
        errors += _validate_provenance(nodes, edges, metadata_required, require_contract)
    if not nodes:
        errors.append("spec has no nodes")

    if audience == "exec" and len(nodes) > EXEC_NODE_CAP:
        errors.append(
            "exec diagram has %d nodes; cap is %d. Split it by C4 level or by flow, "
            "or re-target it at audience 'tech'." % (len(nodes), EXEC_NODE_CAP))
    return errors


def collect_warnings(spec):
    """Return advisory warnings; the spec still renders, but a reader will miss something."""
    if not isinstance(spec, dict):
        return []
    nodes = spec.get("nodes") or []
    if not isinstance(nodes, list):
        nodes = []
    if (spec.get("audience") == "tech" and spec.get("type") in METRIC_EXPECTED_TYPES
            and nodes and not any(isinstance(n, dict) and n.get("metric") for n in nodes)):
        return ["tech %s diagram has no node with a metric; put the number that justified "
                "each box on the box, or say in scope why none applies" % spec["type"]]
    return []

def _validate_citation(owner, evidence):
    if evidence is None or evidence == "":
        return []
    if isinstance(evidence, str):
        source, separator, line = evidence.rpartition(":")
        if (separator and source.strip() and "://" not in source and
                not any(ord(char) < 32 for char in source) and
                re.fullmatch(r"[1-9][0-9]*", line)):
            return []
    return ["%s evidence must identify a local source and positive line: path:line" % owner]



def _validate_metric(owner, metric):
    if metric is not None and not isinstance(metric, str):
        return ["%s metric must be a short string" % owner]
    if metric and len(metric) > METRIC_MAX_CHARS:
        return ["%s metric is %d chars; cap is %d. Keep the headline number, move the rest "
                "to the doc" % (owner, len(metric), METRIC_MAX_CHARS)]
    return []


def _validate_entity(node, diagram_type):
    node_id = node.get("id")
    is_entity = node.get("kind") == "entity"
    columns = node.get("columns")
    errors = []
    if is_entity and diagram_type != "erd":
        errors.append("node %s is an entity but the diagram type is %r; entities belong to "
                      "type 'erd'" % (node_id, diagram_type))
    if columns is not None and not isinstance(columns, list):
        return errors + ["node %s columns must be a list of objects" % node_id]
    if is_entity and not columns:
        errors.append("entity %s has no columns; list at least one {name, type}" % node_id)
    if not is_entity and columns:
        errors.append("node %s has columns but is not an entity" % node_id)
    for column in columns or []:
        if not isinstance(column, dict):
            errors.append("entity %s column must be an object: %r" % (node_id, column))
        elif any(not isinstance(column.get(key), str) or not column[key]
                 for key in ("name", "type")):
            errors.append("entity %s has a column without name or type: %r" % (node_id, column))
    return errors


def _validate_nodes(spec, nodes):
    errors = []
    raw_groups = spec.get("groups") or []
    groups = raw_groups if isinstance(raw_groups, list) else []
    known_groups = {
        group.get("id") for group in groups
        if isinstance(group, dict) and isinstance(group.get("id"), str)
    }
    if not isinstance(raw_groups, list):
        errors.append("groups must be a list of objects")
        known_groups = set()
    group_ids = set()
    for group in groups:
        if not isinstance(group, dict):
            errors.append("each group must be an object")
            continue
        group_id = group.get("id")
        if not isinstance(group_id, str) or not group_id or group_id in group_ids:
            errors.append("each group needs a unique non-empty string id")
        else:
            group_ids.add(group_id)
        if not isinstance(group.get("label"), str) or not group["label"]:
            errors.append("each group needs a non-empty label")
    seen = set()
    for index, node in enumerate(nodes):
        if not isinstance(node, dict):
            errors.append("node %d must be an object, got %s" % (index, type(node).__name__))
            continue
        node_id = node.get("id")
        if not isinstance(node_id, str) or not node_id:
            errors.append("node %d needs a non-empty string id" % index)
            continue
        if node_id in seen:
            errors.append("duplicate node id: %s" % node_id)
        seen.add(node_id)
        for field in ("label", "sublabel", "constraint"):
            if field in node and not isinstance(node[field], str):
                errors.append("node %s %s must be a string" % (node_id, field))
        if "layer" in node and type(node["layer"]) is not int:
            errors.append("node %s layer must be an integer" % node_id)
        errors += _validate_citation("node %s" % node_id, node.get("evidence"))
        if not node.get("label") and node.get("kind") not in ("start", "end"):
            errors.append("node %s has no label" % node_id)
        if not isinstance(node.get("kind"), str) or node["kind"] not in STYLE_CATALOG:
            errors.append("node %s has unknown kind %r; known kinds: %s"
                          % (node_id, node.get("kind"), ", ".join(sorted(STYLE_CATALOG))))
        group = node.get("group")
        if group and (not isinstance(group, str) or group not in known_groups):
            errors.append("node %s references undeclared group %r" % (node_id, group))
        errors += _validate_metric("node %s" % node_id, node.get("metric"))
        errors += _validate_entity(node, spec.get("type"))
    return errors

def _validate_lifecycle(owner, item):
    lifecycle = item.get("lifecycle")
    if lifecycle not in LIFECYCLES:
        return ["%s lifecycle must be one of: %s" %
                (owner, ", ".join(LIFECYCLES))]
    return []


def _validate_evidence(owner, item, required_capture=False):
    errors = []
    evidence = item.get("evidence")
    kind = item.get("evidence_kind")
    confidence = item.get("evidence_confidence")
    if confidence not in EVIDENCE_CONFIDENCES:
        errors.append("%s evidence_confidence must be one of: %s" %
                      (owner, ", ".join(EVIDENCE_CONFIDENCES)))
    if kind is not None and kind not in EVIDENCE_KINDS:
        errors.append("%s evidence_kind must be one of: %s" %
                      (owner, ", ".join(EVIDENCE_KINDS)))
    if evidence is not None and not isinstance(evidence, str):
        errors.append("%s evidence must be a path:line string" % owner)
    if evidence and not kind:
        errors.append("%s evidence requires an evidence_kind" % owner)
    if kind and not evidence:
        errors.append("%s evidence_kind requires evidence" % owner)
    if evidence and confidence in ("unverified", "assumed"):
        errors.append("%s has evidence but confidence is %s" % (owner, confidence))
    if not evidence and confidence in ("documented", "observed"):
        errors.append("%s has no evidence but confidence is %s" % (owner, confidence))
    if confidence == "documented" and kind not in ("code", "document"):
        errors.append("%s documented confidence requires code or document evidence" % owner)
    if confidence == "observed" and kind not in ("runtime", "deployment"):
        errors.append("%s observed confidence requires runtime or deployment evidence" % owner)
    revision = item.get("evidence_revision")
    digest = item.get("evidence_digest")
    if revision is not None and not isinstance(revision, str):
        errors.append("%s evidence_revision must be a captured revision string" % owner)
    if bool(revision) != bool(digest):
        errors.append("%s evidence_revision and evidence_digest must be supplied together"
                      % owner)
    if digest and (not isinstance(digest, str) or
                   not re.fullmatch(r"sha256:[0-9a-f]{64}", digest)):
        errors.append("%s evidence_digest must be sha256:<64 lowercase hex chars>" % owner)
    if required_capture and evidence and (not revision or not digest):
        errors.append("%s evidence requires a captured revision and digest" % owner)
    return errors


def _validate_metric_provenance(owner, item, required=False):
    provenance = item.get("metric_provenance")
    if item.get("metric") and (required or provenance is not None) and (
            provenance not in METRIC_PROVENANCES):
        return ["%s metric_provenance must be one of: %s when metric is present" %
                (owner, ", ".join(METRIC_PROVENANCES))]
    if provenance is not None and provenance not in METRIC_PROVENANCES:
        return ["%s metric_provenance must be one of: %s" %
                (owner, ", ".join(METRIC_PROVENANCES))]
    return []


def _validate_identity(owner, item, required=False):
    errors = []
    identity = item.get("identity")
    if required and (not isinstance(identity, str) or not identity):
        errors.append("%s needs a canonical identity" % owner)
    if identity is not None and (
            not isinstance(identity, str) or not re.fullmatch(IDENTITY_PATTERN, identity)):
        errors.append("%s identity must match %s" % (owner, IDENTITY_PATTERN))
    values = item.get("refines", [])
    if not isinstance(values, list) or any(
            not isinstance(value, str) or not re.fullmatch(IDENTITY_PATTERN, value)
            for value in values):
        errors.append("%s refines must be a list of canonical identities" % owner)
    owner_identity = item.get("owner")
    if owner_identity is not None and (
            not isinstance(owner_identity, str) or
            not re.fullmatch(IDENTITY_PATTERN, owner_identity)):
        errors.append("%s owner must be a canonical identity" % owner)
    return errors


def _has_provenance_fields(item):
    return any(field in item for field in (
        "identity", "refines", "owner", "lifecycle", "evidence_kind",
        "evidence_confidence", "evidence_revision", "evidence_digest",
        "metric_provenance",
    ))


def _validate_view_contract(spec, required):
    view = spec.get("view")
    if view is None:
        return ["view contract is required for manifest-participating specs"] if required else []
    if not isinstance(view, dict):
        return ["view contract must be an object"]
    errors = []
    for field in VIEW_FIELDS:
        if field not in view:
            errors.append("view contract missing %s" % field)
    for field in ("question", "decision", "scenario", "invariant"):
        if not isinstance(view.get(field), str) or not view[field].strip():
            errors.append("view %s must be a non-empty string" % field)
    if view.get("status") not in LIFECYCLES:
        errors.append("view status must be one of: %s" % ", ".join(LIFECYCLES))
    errors += _validate_citation("view", view.get("evidence"))
    if view.get("evidence"):
        if view.get("evidence_kind") not in EVIDENCE_KINDS:
            errors.append("view evidence_kind must be one of: %s" %
                          ", ".join(EVIDENCE_KINDS))
    elif view.get("evidence_kind") is not None:
        errors.append("view evidence_kind requires evidence")
    if not isinstance(view.get("omissions"), list) or any(
            not isinstance(value, str) or not value for value in view.get("omissions", [])):
        errors.append("view omissions must be a list of strings")
    return errors


def _validate_provenance(nodes, edges, required, require_capture=False):
    errors = []
    seen = set()
    for index, item in enumerate(nodes + edges):
        if not isinstance(item, dict):
            continue
        is_node = index < len(nodes)
        owner = ("%s %s" % ("node" if is_node else "edge", item.get("id", index)))
        if required or "lifecycle" in item:
            errors += _validate_lifecycle(owner, item)
        if required or any(field in item for field in (
                "evidence_kind", "evidence_confidence", "evidence_revision", "evidence_digest")):
            errors += _validate_evidence(owner, item, required_capture=require_capture)
        errors += _validate_metric_provenance(owner, item, required=required)
        errors += _validate_identity(owner, item, required=required)
        identity = item.get("identity")
        if required and is_node and isinstance(identity, str) and identity in seen:
            errors.append("duplicate canonical identity: %s" % identity)
        if is_node and isinstance(identity, str):
            seen.add(identity)
        if not is_node and required and (
                not isinstance(identity, str) or not identity):
            errors.append("%s needs a canonical relationship identity" % owner)
    return errors



def _validate_edges(spec, nodes, edges):
    errors = []
    connected = set()
    ids = {
        node.get("id") for node in nodes
        if isinstance(node, dict) and isinstance(node.get("id"), str)
    }
    is_erd = spec.get("type") == "erd"
    for index, edge in enumerate(edges):
        if not isinstance(edge, dict):
            errors.append("edge %d must be an object, got %s" % (index, type(edge).__name__))
            continue
        source, target = edge.get("from"), edge.get("to")
        for end in (source, target):
            if not isinstance(end, str) or end not in ids:
                errors.append("edge references unknown node %r" % end)
        if "label" in edge and not isinstance(edge["label"], str):
            errors.append("edge %s -> %s label must be a string" % (source, target))
        errors += _validate_citation("edge %s -> %s" % (source, target), edge.get("evidence"))
        if not is_erd and not edge.get("label"):
            errors.append("edge %s -> %s has no label; every relationship must state "
                          "its protocol or event" % (source, target))
        cardinality = edge.get("cardinality")
        if is_erd and (not isinstance(cardinality, str) or cardinality not in CARDINALITIES):
            errors.append("edge %s -> %s needs a cardinality; known values: %s"
                          % (source, target, ", ".join(CARDINALITIES)))
        if not is_erd and cardinality:
            errors.append("edge %s -> %s has a cardinality but the diagram is not an erd"
                          % (source, target))
        style = edge.get("style", "sync")
        if not isinstance(style, str) or style not in EDGE_STYLES:
            errors.append("edge %s -> %s has unknown style %r; known styles: %s"
                          % (source, target, style, ", ".join(sorted(EDGE_STYLES))))
        errors += _validate_metric("edge %s -> %s" % (source, target), edge.get("metric"))
        connected.update(end for end in (source, target)
                        if isinstance(end, str) and end in ids)
    for node in nodes:
        node_id = node.get("id") if isinstance(node, dict) else None
        if isinstance(node_id, str) and node_id not in connected:
            errors.append("node %s is not connected to anything; delete it or connect it"
                          % node_id)
    return errors

def _validate_type_rules(diagram_type, nodes):
    kinds = {
        node.get("kind") for node in nodes
        if isinstance(node, dict) and isinstance(node.get("kind"), str)
    }
    if diagram_type == "sequence" and "participant" not in kinds:
        return ["sequence diagrams need nodes of kind 'participant'"]
    if diagram_type == "state" and "start" not in kinds:
        return ["state diagrams need exactly one node of kind 'start'"]
    if diagram_type == "component":
        forbidden = kinds.intersection({"person", "system", "system-ext", "container"})
        errors = []
        if "component" not in kinds:
            errors.append("component diagrams need at least one node of kind 'component'")
        if forbidden:
            errors.append("component diagrams cannot mix whole-system kinds: %s"
                          % ", ".join(sorted(forbidden)))
        return errors
    if diagram_type == "erd" and "entity" not in kinds:
        return ["erd diagrams need at least one node of kind 'entity'"]
    return []


def main(argv=None):
    parser = argparse.ArgumentParser(description="Validate a diagram spec.")
    parser.add_argument("spec", help="path to the spec JSON file")
    args = parser.parse_args(argv)

    try:
        with open(args.spec, encoding="utf-8") as handle:
            spec = json.load(handle)
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        sys.stderr.write("cannot read spec: %s\n" % error)
        return 1
    errors = validate(spec)
    for error in errors:
        sys.stderr.write("%s\n" % error)
    if errors:
        sys.stderr.write("\n%d problem(s); nothing rendered.\n" % len(errors))
        return 1
    warnings = collect_warnings(spec)
    for warning in warnings:
        sys.stderr.write("warning: %s\n" % warning)
    sys.stderr.write("spec OK (%d warning(s))\n" % len(warnings) if warnings else "spec OK\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
