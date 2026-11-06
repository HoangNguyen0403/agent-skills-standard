#!/usr/bin/env python3
"""Render-level semantic parity check for the AC-06 reader kit.

For every scenario, compare the two arms' draw.io sources cell by cell: the set
of cell ids and the set of normalised cell values (node labels, group labels
and edge labels after HTML parsing and whitespace collapsing).

Labels are parsed with `html.parser.HTMLParser` rather than a tag regex, so a
literal `<` inside a label (for example the S3 metric `p99 < 15ms`) is kept as
text instead of being treated as the start of a tag. Entities are decoded
repeatedly because the two arms escape the same text differently.

This is a renderer-output parity check, not a reader result. It cannot prove
that the two arms are visually identical, only that the diagram semantics the
exporter was given are the same. Any difference is listed in full, never
summarised away.

Exit codes:
    0  every scenario is identical across arms
    1  at least one scenario differs (differences are listed)
    2  inputs are missing or unreadable

Usage:
    python3 arm_parity_check.py [--drawio-dir images/drawio] [--out parity-report.json]
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

SPACE = re.compile(r"\s+")
CELL = re.compile(r"<mxCell ([^>]*?)>")
OBJECT = re.compile(r'<object id="([^"]+)" label="(.*?)"', re.DOTALL)
ATTR = re.compile(r'([A-Za-z_][\w.-]*)="(.*?)"', re.DOTALL)


class _Text(HTMLParser):
    """Collect visible text; `<br>` becomes a space, tags disappear."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() == "br":
            self.parts.append(" ")

    def text(self) -> str:
        return " ".join(self.parts)


def normalise(raw: str) -> str:
    """Decode entities, drop markup, collapse whitespace, keep literal '<' text.

    Entities are decoded *before* parsing: the two arms escape the same label
    differently (one writes `<br>`, the other `&lt;br&gt;`; one writes a raw
    `<`, the other `&amp;lt;`), and decoding first makes those forms converge.
    A decoded `<` that does not start a tag, such as `p99 < 15ms`, survives as
    text because the HTML parser only treats a name-like token as a tag.
    """
    text = raw
    for _ in range(4):
        decoded = html.unescape(text)
        if decoded == text:
            break
        text = decoded
    collector = _Text()
    collector.feed(text)
    collector.close()
    return SPACE.sub(" ", collector.text()).strip()


def cells(path: Path) -> dict[str, str]:
    """Map every cell id to its normalised label."""
    source = path.read_text(encoding="utf-8")
    out: dict[str, str] = {}
    for match in CELL.finditer(source):
        attributes = dict(ATTR.findall(match.group(1)))
        identifier = attributes.get("id")
        if identifier is None:
            continue
        out[identifier] = normalise(attributes.get("value", ""))
    for match in OBJECT.finditer(source):
        out[f"{match.group(1)}:label"] = normalise(match.group(2))
    return out


def compare(baseline: dict[str, str], candidate: dict[str, str]) -> list[dict[str, str]]:
    differences: list[dict[str, str]] = []
    for identifier in sorted(set(baseline) | set(candidate)):
        left = baseline.get(identifier)
        right = candidate.get(identifier)
        if left != right:
            differences.append(
                {
                    "cell_id": identifier,
                    "baseline": "" if left is None else left,
                    "candidate": "" if right is None else right,
                }
            )
    return differences


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Compare AC-06 arm semantics from .drawio sources.")
    parser.add_argument("--drawio-dir", type=Path, default=Path("images/drawio"))
    parser.add_argument("--out", type=Path, default=Path("parity-report.json"))
    args = parser.parse_args(argv)

    if not args.drawio_dir.is_dir():
        print(f"parity error: missing directory {args.drawio_dir}", file=sys.stderr)
        return 2

    scenarios = sorted({p.name.rsplit("-", 1)[0] for p in args.drawio_dir.glob("*.drawio")})
    if not scenarios:
        print(f"parity error: no .drawio files in {args.drawio_dir}", file=sys.stderr)
        return 2

    report: dict[str, object] = {
        "check": "render-level semantic parity of the two arms' .drawio cell ids and normalised labels",
        "scope_limit": (
            "Not a reader result and not a pixel comparison: it proves the exported cell values/ids match, "
            "not that the two PNGs look identical."
        ),
        "normalisation": (
            "html.parser with entity decoding (repeated), tags removed, <br> as space, whitespace collapsed; "
            "a literal '<' inside a label survives as text"
        ),
        "scenarios": {},
    }
    differing = 0
    for scenario in scenarios:
        baseline_path = args.drawio_dir / f"{scenario}-baseline.drawio"
        candidate_path = args.drawio_dir / f"{scenario}-candidate.drawio"
        missing = [p.name for p in (baseline_path, candidate_path) if not p.is_file()]
        if missing:
            print(f"parity error: missing arm sources {missing}", file=sys.stderr)
            return 2
        baseline = cells(baseline_path)
        candidate = cells(candidate_path)
        differences = compare(baseline, candidate)
        if differences:
            differing += 1
        report["scenarios"][scenario] = {
            "baseline_cells": len(baseline),
            "candidate_cells": len(candidate),
            "ids_identical": set(baseline) == set(candidate),
            "values_identical": not differences,
            "differences": differences,
        }

    report["summary"] = {
        "scenarios": len(scenarios),
        "identical": len(scenarios) - differing,
        "differing": differing,
        "all_identical": differing == 0,
    }
    args.out.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"arm parity: {len(scenarios) - differing}/{len(scenarios)} scenarios identical")
    for scenario, entry in report["scenarios"].items():
        state = "identical" if entry["values_identical"] else f"{len(entry['differences'])} difference(s)"
        print(f"  {scenario:<22} {state}")
        for difference in entry["differences"]:
            print(f"    {difference['cell_id']}: baseline={difference['baseline']!r} candidate={difference['candidate']!r}")
    print(f"report written to {args.out}")
    return 0 if differing == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
