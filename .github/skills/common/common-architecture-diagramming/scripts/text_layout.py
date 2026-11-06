#!/usr/bin/env python3
"""Shared evidence predicates, text wrapping, and the emitted-geometry plans.

Every layout decision that the renderer draws and the checker measures is planned
exactly once here: an edge label, an entity header/rows, the diagram header, and
the label block under a circle. `render_drawio`/`render_erd` emit these plans and
`check_layout` measures the same objects, so "planned" and "drawn" cannot drift.
"""

from __future__ import annotations

import html
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

INK = "ink"
MUTED = "muted"
WARN = "warn"

UNVERIFIED_TEXT = "\u26a0 UNVERIFIED"


def has_supported_evidence(item: Optional[Dict[str, Any]]) -> bool:
    """Return True if item has verifiable evidence per SRS-001/002.

    Requires non-empty evidence path AND either:
      - documented confidence with code/document kind
      - observed confidence with runtime/deployment kind
    """
    if not item or not item.get("evidence"):
        return False
    conf = item.get("evidence_confidence")
    kind = item.get("evidence_kind")
    return (conf == "documented" and kind in ("code", "document")) or \
           (conf == "observed" and kind in ("runtime", "deployment"))


def escape_html(text: Any) -> str:
    """Escape text for XML / HTML labels so markup characters remain literal."""
    if text is None:
        return ""
    return html.escape(str(text), quote=True)


def char_px(size: int) -> float:
    """Advance width of an average character at this font size, in pixels."""
    return round(0.62 * size, 2)


def chars_for(width: int, size: int, pad: int = 0) -> int:
    """Characters that fit on one line of `width` at `size`."""
    return max(6, int((width - pad) / char_px(size)))


def _chunks(word: str, max_chars: int) -> List[str]:
    return [word[i:i + max_chars] for i in range(0, len(word), max_chars)] or [""]


def wrap_text(text: Any, max_chars: int) -> List[str]:
    """Break text into the exact lines a drawn label uses, chunking long words."""
    max_chars = max(1, int(max_chars))
    lines: List[str] = []
    for paragraph in str(text or "").split("\n"):
        words = paragraph.split()
        if not words:
            lines.append("")
            continue
        current = ""
        for word in words:
            for chunk in _chunks(word, max_chars):
                if not current:
                    current = chunk
                elif len(current) + 1 + len(chunk) <= max_chars:
                    current = "%s %s" % (current, chunk)
                else:
                    lines.append(current)
                    current = chunk
        lines.append(current)
    return lines


def wrap_lines(text: Any, max_chars: int) -> int:
    """Line count of the wrapped text; 0 when there is nothing to draw."""
    if not text:
        return 0
    return max(1, len(wrap_text(text, max_chars)))


# --------------------------------------------------------------------------- labels


@dataclass(frozen=True)
class LabelLine:
    """One drawn label line: escaped text, font size, and the tone that colours it."""
    text: str
    size: int
    tone: str = INK
    bold: bool = False


@dataclass(frozen=True)
class LabelPlan:
    """An emitted label rectangle: the lines it draws and the box it occupies."""
    lines: Tuple[LabelLine, ...] = ()
    width: int = 0
    height: int = 0

    @property
    def empty(self) -> bool:
        return not self.lines


EDGE_MAX_CHARS = 28
LABEL_MIN_W = 96
LABEL_MIN_H = 16
LABEL_PAD_X = 10
LABEL_PAD_Y = 4
LINE_PAD = 4


def _plan_label(entries: List[Tuple[str, int, str, bool]], max_chars: int) -> LabelPlan:
    """Wrap label parts into lines and size the rectangle they are drawn in."""
    lines: List[LabelLine] = []
    widest = 0.0
    for text, size, tone, bold in entries:
        for raw in wrap_text(text, max_chars):
            lines.append(LabelLine(escape_html(raw), size, tone, bold))
            widest = max(widest, len(raw) * char_px(size))
    if not lines:
        return LabelPlan()
    width = max(LABEL_MIN_W, int(round(widest + LABEL_PAD_X)))
    height = max(LABEL_MIN_H, sum(line.size + LINE_PAD for line in lines) + LABEL_PAD_Y)
    return LabelPlan(tuple(lines), width, height)


def edge_label_plan(edge: Dict[str, Any], max_chars: int = EDGE_MAX_CHARS) -> LabelPlan:
    """The label an edge draws: name, metric with provenance, and warning."""
    entries: List[Tuple[str, int, str, bool]] = []
    if edge.get("label"):
        entries.append((str(edge["label"]), 10, INK, False))
    if edge.get("metric"):
        metric = str(edge["metric"])
        if edge.get("metric_provenance"):
            metric = "%s \u00b7 %s" % (metric, edge["metric_provenance"])
        entries.append((metric, 9, MUTED, False))
    if not has_supported_evidence(edge):
        entries.append((UNVERIFIED_TEXT, 10, WARN, False))
    return _plan_label(entries, max_chars)


def edge_label_size(edge: Dict[str, Any], max_chars: int = EDGE_MAX_CHARS) -> Tuple[int, int]:
    """(width, height) of the emitted edge label rectangle."""
    plan = edge_label_plan(edge, max_chars)
    return plan.width, plan.height


def label_rect(anchor: Tuple[float, float], plan: LabelPlan) -> Tuple[float, float, int, int]:
    """The label rectangle centred on a point, exactly as the renderer places it."""
    return (anchor[0] - plan.width / 2.0, anchor[1] - plan.height / 2.0,
            plan.width, plan.height)


def rects_overlap(a: Tuple[float, float, float, float],
                  b: Tuple[float, float, float, float]) -> bool:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    return ax < bx + bw and bx < ax + aw and ay < by + bh and by < ay + ah


# ---------------------------------------------------------------------- node labels

CIRCLE_LABEL_MAX_CHARS = 18


def circle_label_plan(node: Dict[str, Any]) -> LabelPlan:
    """The label block drawn under a start/end circle, with its emitted width."""
    entries: List[Tuple[str, int, str, bool]] = []
    if node.get("label"):
        entries.append((str(node["label"]), 12, INK, True))
    if node.get("sublabel"):
        entries.append(("[%s]" % node["sublabel"], 10, INK, False))
    state = " \u00b7 ".join(filter(None, [node.get("lifecycle"), node.get("evidence_confidence")]))
    if state:
        entries.append(("[%s]" % state, 9, INK, False))
    if node.get("metric"):
        metric = str(node["metric"])
        if node.get("metric_provenance"):
            metric = "%s \u00b7 %s" % (metric, node["metric_provenance"])
        entries.append((metric, 10, INK, False))
    if not has_supported_evidence(node):
        entries.append((UNVERIFIED_TEXT, 10, WARN, False))
    return _plan_label(entries, CIRCLE_LABEL_MAX_CHARS)


def node_text_bounds(node: Optional[Dict[str, Any]], kind: Dict[str, Any]) -> int:
    """Estimate vertical text space needed for all label lines inside or under the shape."""
    if not node:
        return 0
    is_icon = bool(kind.get("label_h"))
    is_circle = kind.get("legend") in ("Start", "End")
    if is_circle:
        return circle_label_plan(node).height
    if is_icon:
        avail_w = max(40, kind.get("label_w", 130))
    else:
        avail_w = max(40, kind["w"] - 20)

    chars_12 = max(8, int(avail_w / 7.2))
    chars_10 = max(8, int(avail_w / 6.0))
    chars_9 = max(8, int(avail_w / 5.4))

    label_lines = wrap_lines(node.get("label", ""), chars_12) if node.get("label") else 0
    sublabel_lines = wrap_lines(node.get("sublabel", ""), chars_10) if node.get("sublabel") else 0

    state = " \u00b7 ".join(filter(None, [node.get("lifecycle"), node.get("evidence_confidence")]))
    state_lines = wrap_lines(state, chars_9) if state else 0

    metric = node.get("metric", "")
    if metric and node.get("metric_provenance"):
        metric = "%s \u00b7 %s" % (metric, node["metric_provenance"])
    metric_lines = wrap_lines(metric, chars_10) if metric else 0

    unverified_lines = 1 if not has_supported_evidence(node) else 0

    total_h = (label_lines * 16 +
               sublabel_lines * 14 +
               state_lines * 13 +
               metric_lines * 14 +
               unverified_lines * 14)
    return total_h


# -------------------------------------------------------------------------- entities

ENTITY_PAD_X = 12
ENTITY_LINE_H = 15
ENTITY_HEADER_PAD = 8
ENTITY_ROW_PAD = 6
ENTITY_HEADER_MIN_H = 30
ENTITY_ROW_MIN_H = 22
ENTITY_HEADER_FONT = 12   # the swimlane label draws one font size; the plan wraps at it
ENTITY_ROW_SIZE = 11
ENTITY_ROW_SPACING = 6


@dataclass(frozen=True)
class EntityRowPlan:
    """One drawn column row: its wrapped escaped text and the row height it needs."""
    text: str
    height: int


@dataclass(frozen=True)
class EntityPlan:
    """A swimlane entity: dynamic header size, header text, and row geometry."""
    width: int
    header_height: int
    header_text: str
    rows: Tuple[EntityRowPlan, ...]

    @property
    def total_height(self) -> int:
        return self.header_height + sum(row.height for row in self.rows)


def _entity_header_parts(node: Dict[str, Any]) -> List[str]:
    parts: List[str] = []
    if node.get("label"):
        parts.append(str(node["label"]))
    if node.get("sublabel"):
        parts.append("[%s]" % node["sublabel"])
    state = " \u00b7 ".join(filter(None, [node.get("lifecycle"), node.get("evidence_confidence")]))
    if state:
        parts.append("[%s]" % state)
    if node.get("metric"):
        metric = str(node["metric"])
        if node.get("metric_provenance"):
            metric = "%s \u00b7 %s" % (metric, node["metric_provenance"])
        parts.append(metric)
    if not has_supported_evidence(node):
        parts.append(UNVERIFIED_TEXT)
    return parts


def entity_header_budget(entity_w: int) -> int:
    """Characters per header line at the font the swimlane actually draws."""
    return chars_for(entity_w, ENTITY_HEADER_FONT, 2 * ENTITY_PAD_X)


def _entity_header_lines(node: Dict[str, Any], entity_w: int) -> List[str]:
    """Wrap every header part at the one font size the emitted swimlane label uses."""
    budget = entity_header_budget(entity_w)
    lines: List[str] = []
    for text in _entity_header_parts(node):
        lines.extend(wrap_text(text, budget))
    return lines


def entity_row_text(column: Dict[str, Any]) -> str:
    """One column row as drawn: PK/FK prefix, name, and type with nullability."""
    prefix = "PK " if column.get("pk") else ("FK " if column.get("fk") else "")
    suffix = " ?" if column.get("nullable", True) and not column.get("pk") else ""
    return "%s%s : %s%s" % (prefix, column.get("name", ""), column.get("type", ""), suffix)


def entity_plan(node: Dict[str, Any], entity_w: int = 200) -> EntityPlan:
    """Plan one entity: dynamic header height, wrapped header, and wrapped rows."""
    entity_w = int(entity_w)
    header_lines = _entity_header_lines(node, entity_w)
    header_height = max(ENTITY_HEADER_MIN_H,
                        len(header_lines) * ENTITY_LINE_H + ENTITY_HEADER_PAD)
    rows = []
    row_chars = chars_for(entity_w, ENTITY_ROW_SIZE, 2 * ENTITY_ROW_SPACING + 4)
    for column in node.get("columns") or []:
        wrapped = wrap_text(entity_row_text(column), row_chars)
        height = max(ENTITY_ROW_MIN_H, len(wrapped) * ENTITY_LINE_H + ENTITY_ROW_PAD)
        rows.append(EntityRowPlan("<br>".join(escape_html(line) for line in wrapped), height))
    return EntityPlan(entity_w, header_height,
                      "<br>".join(escape_html(line) for line in header_lines), tuple(rows))


# ---------------------------------------------------------------------------- header

HEADER_TITLE_Y = 24
HEADER_TITLE_SIZE = 20
HEADER_TITLE_LINE_H = 24
HEADER_TITLE_PAD = 6
HEADER_META_SIZE = 11
HEADER_META_LINE_H = 15
HEADER_META_PAD = 3
HEADER_VIEW_SIZE = 9
HEADER_VIEW_LINE_H = 14
HEADER_VIEW_PAD = 8
HEADER_RULE_GAP = 8
HEADER_BODY_GAP = 20
HEADER_MIN_BODY_Y = 170
HEADER_VIEW_FIELDS = (
    ("question", "Question"), ("decision", "Decision"),
    ("scenario", "Scenario"), ("invariant", "Invariant"),
    ("status", "Status"), ("evidence", "View evidence"),
    ("omissions", "Omissions"),
)


@dataclass(frozen=True)
class HeaderText:
    """One header block: escaped wrapped text plus the exact box it is drawn in.

    `x` is relative to the left margin; the renderer adds the margin it owns.
    """
    text: str
    x: int
    y: int
    width: int
    height: int
    size: int


@dataclass(frozen=True)
class HeaderPlan:
    """The single header allocation: title, meta, view contract, rule, and body start."""
    width: int
    title: HeaderText
    meta: HeaderText
    contract: Optional[HeaderText]
    rule_y: int
    body_y: int
    height: int


def _join_lines(lines: List[str]) -> str:
    return "<br>".join(escape_html(line) for line in lines)


def plan_header(spec: Dict[str, Any], width: int = 1000) -> HeaderPlan:
    """Plan the header exactly as drawn, for the given content width."""
    width = max(400, int(width))
    title_lines = wrap_text(spec.get("title", "") or "",
                            chars_for(width, HEADER_TITLE_SIZE))
    title_h = len(title_lines) * HEADER_TITLE_LINE_H + HEADER_TITLE_PAD
    title = HeaderText(_join_lines(title_lines), 0, HEADER_TITLE_Y, width,
                       title_h, HEADER_TITLE_SIZE)

    meta_raw = " \u00b7 ".join(filter(None, [
        spec.get("scope", ""),
        ("v%s" % spec["version"]) if spec.get("version") else "",
        spec.get("date", ""),
        spec.get("author", ""),
    ]))
    meta_lines = wrap_text(meta_raw, chars_for(width, HEADER_META_SIZE))
    meta_h = len(meta_lines) * HEADER_META_LINE_H + HEADER_META_PAD
    meta_y = HEADER_TITLE_Y + title_h
    meta = HeaderText(_join_lines(meta_lines), 0, meta_y, width, meta_h, HEADER_META_SIZE)

    y = meta_y + meta_h
    contract = None
    view = spec.get("view") or {}
    if view:
        view_lines: List[str] = []
        for key, label in HEADER_VIEW_FIELDS:
            value = view.get(key)
            if not value:
                continue
            if isinstance(value, list):
                value = ", ".join(str(item) for item in value)
            view_lines.extend(wrap_text("%s: %s" % (label, value),
                                        chars_for(width, HEADER_VIEW_SIZE)))
        contract_h = len(view_lines) * HEADER_VIEW_LINE_H + HEADER_VIEW_PAD
        contract = HeaderText(_join_lines(view_lines), 0, y, width,
                              contract_h, HEADER_VIEW_SIZE)
        y += contract_h

    rule_y = y + HEADER_RULE_GAP
    body_y = max(HEADER_MIN_BODY_Y, rule_y + HEADER_BODY_GAP)
    return HeaderPlan(width, title, meta, contract, rule_y, body_y, rule_y - HEADER_TITLE_Y)
