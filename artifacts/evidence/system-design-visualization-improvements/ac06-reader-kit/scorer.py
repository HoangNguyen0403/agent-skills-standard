#!/usr/bin/env python3
"""Score an AC-06 two-session reader comparison.

Design being scored: one reader reads each scenario once per session, in one
arm per session, with the second session at least 48 hours after the first.
Each session has its own sheet, which the operator collects at the end of that
session, so the reader never holds their session-1 answers when session 2 runs.
Interpretation time per scenario-arm is the sum of the four per-question times;
an arm's time figure is the median of its six scenario-arm totals.

Correctness verdicts are not written by the operator who holds the arm map.
`--export-adjudication` emits a shuffled, arm-blind answer export (opaque row
tokens, no session, timestamps, seconds or arm); an adjudicator with no access
to scoring-key/arm-map.json fills the `verdict` field of every row; scoring
joins those verdicts back by token and refuses anything that does not cover
every applicable row exactly once.

Exit codes:
    0  PASS      all three targets met (or an export completed)
    1  FAIL      at least one target missed
    2  malformed or incomplete sheet, session/file mismatch, a washout gap
       under 48 hours or a reversed order, missing or invalid metadata, or
       verdicts that do not cover every applicable row exactly once
    3  PENDING   data is complete but the run is not comparable (the reader is
       the implementation author, or a session starts outside the 30-day
       window)

Usage:
    # 1. export a blind adjudication packet
    python3 scorer.py --sheet1 response-sheet-session1.csv \\
        --sheet2 response-sheet-session2.csv \\
        --key scoring-key/answers.json --arm-map scoring-key/arm-map.json \\
        --export-adjudication adjudication/
    # 2. after the adjudicator returns adjudication/adjudication-input.json
    python3 scorer.py --sheet1 response-sheet-session1.csv \\
        --sheet2 response-sheet-session2.csv \\
        --key scoring-key/answers.json --arm-map scoring-key/arm-map.json \\
        --adjudication-map adjudication/adjudication-map.json \\
        --verdicts adjudication/adjudication-input.json \\
        --metadata run-metadata.json --json report.json
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import re
import statistics
import sys
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from pathlib import Path

BASE_COLUMNS = (
    "session",
    "session_started_utc",
    "reader",
    "scenario",
    "question_id",
    "answer",
    "seconds",
    "applicable",
    "recognised_prior",
    "notes",
)
VERDICTS = ("correct", "partial", "incorrect")
SESSIONS = ("1", "2")
ROLES = ("baseline", "candidate")
MIN_GAP = 48 * 3600.0
WINDOW_DAYS = 30
PER_SCENARIO_QUESTIONS = 4
REQUIRED_METADATA = (
    "reader_id",
    "is_implementation_author",
    "date",
    "screen",
    "zoom",
    "theme",
    "implementation_start",
    "adjudicator_id",
)
DEFAULT_ADJUDICATION_SEED = "ac06-adjudication-2026-11-06"
WHOLE_SECONDS = re.compile(r"\d+")


class SheetError(ValueError):
    """The sheet or its supporting files cannot be scored."""


@dataclass(frozen=True)
class Row:
    session: str
    session_started: datetime
    reader: str
    scenario: str
    arm: str
    role: str
    question_id: str
    answer: str
    seconds: int
    applicable: bool
    recognised: bool
    verdict: str = ""


@dataclass
class ArmResult:
    role: str
    applicable: int = 0
    correct: int = 0
    partial: int = 0
    incorrect: int = 0
    non_applicable: int = 0
    question_seconds: list[int] = field(default_factory=list)
    scenario_totals: list[int] = field(default_factory=list)
    per_scenario: dict[str, dict[str, object]] = field(default_factory=dict)

    @property
    def correct_pct(self) -> float | None:
        if not self.applicable:
            return None
        return 100.0 * self.correct / self.applicable

    @property
    def median_seconds(self) -> float | None:
        """Median of the six scenario-arm interpretation-time totals."""
        return statistics.median(self.scenario_totals) if self.scenario_totals else None


def load_json(path: Path) -> dict:
    try:
        payload = json.loads(path.read_text(encoding="utf-8-sig"))
    except FileNotFoundError as exc:
        raise SheetError(f"missing file: {path}") from exc
    except json.JSONDecodeError as exc:
        raise SheetError(f"{path} is not valid JSON: {exc}") from exc
    if not isinstance(payload, dict):
        raise SheetError(f"{path} must contain a JSON object, got {type(payload).__name__}")
    return payload


def load_sheet(path: Path, session: str) -> list[dict[str, str]]:
    try:
        with path.open(newline="", encoding="utf-8-sig") as handle:
            reader = csv.reader(handle)
            try:
                header = tuple(cell.strip() for cell in next(reader))
            except StopIteration as exc:
                raise SheetError(f"{path} is empty") from exc
            if header != BASE_COLUMNS:
                missing = [c for c in BASE_COLUMNS if c not in header]
                extra = [c for c in header if c not in BASE_COLUMNS]
                raise SheetError(
                    f"{path} header mismatch: missing={missing} unexpected={extra}; "
                    f"expected {list(BASE_COLUMNS)}"
                )
            rows: list[dict[str, str]] = []
            for lineno, cells in enumerate(reader, start=2):
                if not cells:
                    raise SheetError(f"{path} row {lineno}: blank line")
                if len(cells) != len(header):
                    raise SheetError(
                        f"{path} row {lineno}: expected {len(header)} fields, found {len(cells)}; "
                        "quote any answer that contains a comma"
                    )
                row = {name: cell.strip() for name, cell in zip(header, cells)}
                if row["session"] != session:
                    raise SheetError(
                        f"{path} row {lineno}: session {row['session']!r} in the session-{session} sheet"
                    )
                rows.append(row)
            return rows
    except FileNotFoundError as exc:
        raise SheetError(f"missing sheet: {path}") from exc


def parse_utc(value: str, where: str) -> datetime:
    if not value:
        raise SheetError(f"{where}: session_started_utc is empty")
    try:
        moment = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise SheetError(
            f"{where}: session_started_utc must be ISO 8601, got {value!r}"
        ) from exc
    if moment.tzinfo is None:
        raise SheetError(
            f"{where}: session_started_utc must carry a timezone (e.g. 2026-11-07T09:15:00Z), got {value!r}"
        )
    return moment.astimezone(timezone.utc)


def parse_seconds(value: str, where: str) -> int:
    if not value:
        raise SheetError(f"{where}: seconds is empty")
    if not WHOLE_SECONDS.fullmatch(value):
        raise SheetError(f"{where}: seconds must be a positive whole number, got {value!r}")
    seconds = int(value)
    if seconds <= 0 or not math.isfinite(seconds):
        raise SheetError(f"{where}: seconds must be a positive whole number, got {value!r}")
    return seconds


def check_arm_map(arm_map: dict, key_scenarios: set[str]) -> dict[str, dict]:
    mapping = arm_map.get("scenarios", {})
    if not isinstance(mapping, dict) or set(mapping) != key_scenarios:
        raise SheetError(
            "arm map and scoring key disagree on scenarios: "
            f"key-only={sorted(key_scenarios - set(mapping))} "
            f"map-only={sorted(set(mapping) - key_scenarios)}"
        )
    sessions = arm_map.get("sessions", {})
    if set(sessions) != set(SESSIONS):
        raise SheetError("arm map must define session orders for sessions '1' and '2'")
    for number, order in sessions.items():
        if sorted(order) != sorted(key_scenarios):
            raise SheetError(f"arm map session {number} order does not list every scenario exactly once")

    for scenario, entry in mapping.items():
        arms = entry.get("arms", {})
        if set(arms) != {"A", "B"}:
            raise SheetError(f"arm map for {scenario} must map arms A and B")
        if arms["A"] not in ROLES or arms["B"] not in ROLES or arms["A"] == arms["B"]:
            raise SheetError(f"arm map for {scenario} must map A and B to different roles")
        for session in SESSIONS:
            slot = entry.get(f"session{session}", {})
            arm, role = slot.get("arm"), slot.get("role")
            if arm not in ("A", "B") or role not in ROLES:
                raise SheetError(f"arm map for {scenario} session {session} must name an arm and a role")
            if arms[arm] != role:
                raise SheetError(f"arm map for {scenario} session {session} contradicts its arm roles")
        if entry["session1"]["arm"] == entry["session2"]["arm"]:
            raise SheetError(f"arm map for {scenario} shows the same arm in both sessions")

    for session in SESSIONS:
        roles = [mapping[s][f"session{session}"]["role"] for s in mapping]
        if roles.count("baseline") * 2 != len(roles):
            raise SheetError(
                f"arm map is unbalanced in session {session}: "
                f"{roles.count('baseline')} baseline, {roles.count('candidate')} candidate"
            )
    return mapping


def validate(key: dict, arm_map: dict, raw_rows: list[dict[str, str]]) -> list[Row]:
    if not raw_rows:
        raise SheetError("sheets have headers but no data rows")

    scenarios = key.get("scenarios", {})
    mapping = check_arm_map(arm_map, set(scenarios))

    rows: list[Row] = []
    seen: set[tuple[str, str, str]] = set()
    session_stamps: dict[str, datetime] = {}
    for lineno, raw in enumerate(raw_rows, start=2):
        where = f"{raw['session']}-sheet row {lineno}"
        session = raw["session"]
        stamp = parse_utc(raw["session_started_utc"], where)
        first = session_stamps.setdefault(session, stamp)
        if first != stamp:
            raise SheetError(
                f"{where}: session {session} carries two different start times "
                f"({first.isoformat()} and {stamp.isoformat()})"
            )

        scenario = raw["scenario"]
        if scenario not in scenarios:
            raise SheetError(f"{where}: unknown scenario {scenario!r}")
        question_id = raw["question_id"]
        expected = scenarios[scenario]["questions"].get(question_id)
        if expected is None:
            raise SheetError(f"{where}: unknown question {question_id!r} for {scenario}")
        if not raw["reader"]:
            raise SheetError(f"{where}: reader is empty")

        arm = mapping[scenario][f"session{session}"]["arm"]
        role = mapping[scenario][f"session{session}"]["role"]

        identity = (session, scenario, question_id)
        if identity in seen:
            raise SheetError(f"{where}: duplicate row for session {session}, {scenario}, {question_id}")
        seen.add(identity)

        flag = raw["applicable"].lower()
        if flag not in ("true", "false"):
            raise SheetError(f"{where}: applicable must be true or false, got {raw['applicable']!r}")
        applicable = flag == "true"
        if applicable != bool(expected["applicable"]):
            raise SheetError(
                f"{where}: applicable={flag} contradicts the frozen key "
                f"({expected['applicable']}); applicability is not a post-hoc choice"
            )

        recognised_flag = raw["recognised_prior"].lower()
        if recognised_flag not in ("y", "n"):
            raise SheetError(
                f"{where}: recognised_prior must be y or n, got {raw['recognised_prior']!r}"
            )

        if applicable:
            if not raw["answer"]:
                raise SheetError(f"{where}: applicable row has an empty answer")
            seconds = parse_seconds(raw["seconds"], where)
        else:
            seconds = 0

        rows.append(
            Row(
                session=session,
                session_started=stamp,
                reader=raw["reader"],
                scenario=scenario,
                arm=arm,
                role=role,
                question_id=question_id,
                answer=raw["answer"],
                seconds=seconds,
                applicable=applicable,
                recognised=recognised_flag == "y",
            )
        )

    if set(session_stamps) != set(SESSIONS):
        raise SheetError(
            f"both sessions must be present; found {sorted(session_stamps)} instead of ['1', '2']"
        )
    gap_seconds = (session_stamps["2"] - session_stamps["1"]).total_seconds()
    if gap_seconds < 0:
        raise SheetError(
            "session 2 starts before session 1; the sheets or their start times are swapped"
        )
    if gap_seconds < MIN_GAP:
        raise SheetError(
            f"sessions are {gap_seconds / 3600.0:.1f} h apart; the washout requires session 2 at least "
            f"{MIN_GAP / 3600.0:.0f} h after session 1"
        )

    readers = {row.reader for row in rows}
    if len(readers) != 1:
        raise SheetError(f"exactly one reader must fill both sessions, found {sorted(readers)}")

    for scenario, entry in scenarios.items():
        expected_questions = set(entry["questions"])
        if len(expected_questions) != PER_SCENARIO_QUESTIONS:
            raise SheetError(f"{scenario} must hold exactly {PER_SCENARIO_QUESTIONS} questions in the key")
        for session in SESSIONS:
            got = {r.question_id for r in rows if r.scenario == scenario and r.session == session}
            missing = sorted(expected_questions - got)
            if missing:
                raise SheetError(
                    f"missing session data: {scenario} session {session} is missing {missing}"
                )
    return rows


def token_for(seed: str, row: Row) -> str:
    material = f"{seed}:{row.session}:{row.scenario}:{row.question_id}"
    return hashlib.sha256(material.encode("utf-8")).hexdigest()[:16]


def export_for_adjudication(rows: list[Row], out_dir: Path, seed: str = DEFAULT_ADJUDICATION_SEED) -> dict:
    """Write the blind adjudication input and the operator-only token map."""
    applicable = [row for row in rows if row.applicable]
    if not applicable:
        raise SheetError("no applicable rows to export for adjudication")
    ordered = sorted(
        applicable,
        key=lambda row: hashlib.sha256(f"{seed}:order:{token_for(seed, row)}".encode("utf-8")).hexdigest(),
    )
    export_rows = []
    map_rows = []
    for row in ordered:
        token = token_for(seed, row)
        export_rows.append(
            {
                "token": token,
                "scenario": row.scenario,
                "question_id": row.question_id,
                "answer": row.answer,
                "verdict": "",
            }
        )
        map_rows.append(
            {
                "token": token,
                "session": row.session,
                "scenario": row.scenario,
                "question_id": row.question_id,
            }
        )
    payload = {
        "instruction": (
            "Fill 'verdict' for every row with exactly one of correct, partial or incorrect, "
            "using only the frozen answer key. Do not change token, scenario, question_id or answer."
        ),
        "verdict_scale": {"correct": "meets every required item, hits no reject item",
                          "partial": "most required content, at least one required item missing",
                          "incorrect": "contradicts the key, misses a required item, or hits a reject item"},
        "seed": seed,
        "rows": export_rows,
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    input_path = out_dir / "adjudication-input.json"
    map_path = out_dir / "adjudication-map.json"
    input_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    map_path.write_text(
        json.dumps({"version": "1.0", "seed": seed, "rows": map_rows}, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return {"input": str(input_path), "map": str(map_path), "rows": len(export_rows)}


def attach_verdicts(rows: list[Row], map_path: Path, verdicts_path: Path) -> list[Row]:
    """Join adjudicator verdicts back by opaque token and prove complete coverage."""
    token_map = load_json(map_path)
    verdicts = load_json(verdicts_path)

    expected = {(r.session, r.scenario, r.question_id): r for r in rows if r.applicable}
    by_token: dict[str, tuple[str, str, str]] = {}
    for entry in token_map.get("rows", []):
        if not isinstance(entry, dict):
            raise SheetError("adjudication map rows must be objects")
        token = entry.get("token")
        identity = (str(entry.get("session")), entry.get("scenario"), entry.get("question_id"))
        if not token:
            raise SheetError("adjudication map row has no token")
        if token in by_token:
            raise SheetError(f"adjudication map repeats token {token!r}")
        if identity not in expected:
            raise SheetError(f"adjudication map row {token!r} does not match these sheets: {identity}")
        if identity in by_token.values():
            raise SheetError(f"adjudication map lists {identity} more than once")
        by_token[token] = identity
    uncovered = set(expected) - set(by_token.values())
    if uncovered:
        raise SheetError(f"adjudication map is missing rows: {sorted(uncovered)[:5]}")

    assigned: dict[tuple[str, str, str], str] = {}
    for entry in verdicts.get("rows", []):
        if not isinstance(entry, dict):
            raise SheetError("adjudication verdict rows must be objects")
        token = entry.get("token")
        if token not in by_token:
            raise SheetError(f"verdict for unknown token {token!r}")
        identity = by_token[token]
        row = expected[identity]
        if entry.get("scenario") != row.scenario or entry.get("question_id") != row.question_id:
            raise SheetError(f"verdict row {token!r} has a scenario/question that no longer matches the sheet")
        if entry.get("answer") != row.answer:
            raise SheetError(f"verdict row {token!r} has an answer that no longer matches the sheet")
        verdict = str(entry.get("verdict", "")).strip().lower()
        if verdict not in VERDICTS:
            raise SheetError(f"verdict row {token!r} must be one of {VERDICTS}, got {entry.get('verdict')!r}")
        if identity in assigned:
            raise SheetError(f"row {identity} has more than one verdict")
        assigned[identity] = verdict
    missing = set(expected) - set(assigned)
    if missing:
        raise SheetError(
            "verdicts do not cover every applicable row exactly once; missing "
            f"{len(missing)} row(s), e.g. {sorted(missing)[:5]}"
        )
    return [
        replace(row, verdict=assigned[(row.session, row.scenario, row.question_id)])
        if row.applicable
        else row
        for row in rows
    ]


def run_is_comparable(metadata_path: Path | None, rows: list[Row]) -> tuple[bool, str]:
    if metadata_path is None:
        raise SheetError("no --metadata file: reader identity, configuration and window are unrecorded")
    metadata = load_json(metadata_path)
    missing = [name for name in REQUIRED_METADATA if name not in metadata or metadata[name] in ("", None)]
    if missing:
        raise SheetError(f"metadata is missing required field(s): {missing}")
    if metadata.get("zoom") != "100%":
        raise SheetError(f"metadata zoom must be '100%', got {metadata.get('zoom')!r}")
    if metadata.get("theme") != "light":
        raise SheetError(f"metadata theme must be 'light', got {metadata.get('theme')!r}")
    try:
        datetime.fromisoformat(str(metadata["date"]))
    except ValueError as exc:
        raise SheetError(f"metadata date is not ISO 8601: {metadata['date']!r}") from exc
    if metadata["is_implementation_author"] is not False:
        return False, "reader is declared as the implementation author; AC-06 requires an independent reader"

    sheet_reader = rows[0].reader
    if str(metadata["reader_id"]) != sheet_reader:
        raise SheetError(
            f"metadata reader_id {metadata['reader_id']!r} does not match the sheet reader {sheet_reader!r}"
        )
    if str(metadata["adjudicator_id"]) == sheet_reader:
        return False, "the reader adjudicated their own answers; verdicts must come from someone else"

    started = parse_utc(str(metadata["implementation_start"]), "metadata.implementation_start")
    session_starts = {
        session: min(r.session_started for r in rows if r.session == session) for session in SESSIONS
    }
    before = [s for s, moment in session_starts.items() if moment < started]
    if before:
        raise SheetError(
            f"session(s) {sorted(before)} started before implementation_start "
            f"({metadata['implementation_start']}); the run predates the implementation"
        )
    overrun = [
        (session, (moment - started).total_seconds() / 86400.0)
        for session, moment in session_starts.items()
        if (moment - started).total_seconds() > WINDOW_DAYS * 86400
    ]
    if overrun:
        detail = ", ".join(f"session {s} at {d:.1f} days" for s, d in sorted(overrun))
        return (
            False,
            f"{detail} after implementation_start; AC-06 requires both sessions within {WINDOW_DAYS} days",
        )
    return True, "reader identity, configuration and timebox declared"


def summarise(rows: list[Row], role: str) -> ArmResult:
    result = ArmResult(role=role)
    for scenario in sorted({r.scenario for r in rows}):
        scoped = [r for r in rows if r.scenario == scenario and r.role == role and r.applicable]
        if not scoped:
            continue
        correct = sum(1 for r in scoped if r.verdict == "correct")
        total_seconds = sum(r.seconds for r in scoped)
        result.per_scenario[scenario] = {
            "arm": scoped[0].arm,
            "session": scoped[0].session,
            "applicable": len(scoped),
            "correct": correct,
            "correct_pct": 100.0 * correct / len(scoped),
            "interpretation_seconds": total_seconds,
        }
        result.applicable += len(scoped)
        result.correct += correct
        result.partial += sum(1 for r in scoped if r.verdict == "partial")
        result.incorrect += sum(1 for r in scoped if r.verdict == "incorrect")
        result.question_seconds.extend(r.seconds for r in scoped)
        result.scenario_totals.append(total_seconds)
        result.non_applicable += sum(
            1 for r in rows if r.scenario == scenario and r.role == role and not r.applicable
        )
    return result


def verdicts_by_question(rows: list[Row], role: str) -> dict[tuple[str, str], str]:
    return {
        (row.scenario, row.question_id): row.verdict
        for row in rows
        if row.role == role and row.applicable
    }


def regressions(rows: list[Row]) -> list[dict[str, str]]:
    base = verdicts_by_question(rows, "baseline")
    cand = verdicts_by_question(rows, "candidate")
    return [
        {
            "scenario": scenario,
            "question_id": question_id,
            "baseline": base[(scenario, question_id)],
            "candidate": cand[(scenario, question_id)],
        }
        for (scenario, question_id) in sorted(base)
        if base[(scenario, question_id)] == "correct" and cand[(scenario, question_id)] != "correct"
    ]


def evaluate(rows: list[Row], key: dict, comparable: bool, reason: str) -> dict:
    targets = key["targets"]
    baseline = summarise(rows, "baseline")
    candidate = summarise(rows, "candidate")
    regressed = regressions(rows)

    base_median = baseline.median_seconds
    cand_median = candidate.median_seconds
    if base_median is None or cand_median is None or base_median <= 0:
        raise SheetError("no applicable baseline/candidate timings to compare")

    time_reduction = 100.0 * (base_median - cand_median) / base_median
    correct_pct = candidate.correct_pct
    if correct_pct is None:
        raise SheetError("candidate arm has no applicable answers")

    checks = {
        "correct_pct": {
            "value": round(correct_pct, 2),
            "target": targets["min_correct_pct_applicable"],
            "met": correct_pct >= targets["min_correct_pct_applicable"],
            "detail": f"{candidate.correct}/{candidate.applicable} applicable answers correct",
        },
        "time_reduction_pct": {
            "value": round(time_reduction, 2),
            "target": targets["min_time_reduction_pct"],
            "met": time_reduction >= targets["min_time_reduction_pct"],
            "detail": (
                f"median interpretation time per scenario-arm: candidate {cand_median:.0f}s "
                f"vs baseline {base_median:.0f}s"
            ),
        },
        "no_regression": {
            "value": len(regressed),
            "target": 0,
            "met": not regressed,
            "detail": "questions correct in the baseline arm but not in the candidate arm",
        },
    }

    if not comparable:
        status = "PENDING"
    elif all(check["met"] for check in checks.values()):
        status = "PASS"
    else:
        status = "FAIL"

    def arm_payload(result: ArmResult) -> dict:
        return {
            "applicable": result.applicable,
            "correct": result.correct,
            "partial": result.partial,
            "incorrect": result.incorrect,
            "correct_pct": None if result.correct_pct is None else round(result.correct_pct, 2),
            "median_seconds": result.median_seconds,
            "median_question_seconds": (
                statistics.median(result.question_seconds) if result.question_seconds else None
            ),
            "scenario_totals_seconds": result.scenario_totals,
            "per_scenario": result.per_scenario,
        }

    recognised = [
        {"session": row.session, "scenario": row.scenario, "question_id": row.question_id}
        for row in rows
        if row.recognised
    ]
    starts = {session: min(r.session_started for r in rows if r.session == session) for session in SESSIONS}

    return {
        "status": status,
        "status_reason": reason,
        "checks": checks,
        "regressions": regressed,
        "recognised_prior_rows": recognised,
        "session_gap_hours": round((starts["2"] - starts["1"]).total_seconds() / 3600.0, 2),
        "arms": {"baseline": arm_payload(baseline), "candidate": arm_payload(candidate)},
        "denominators": {
            "applicable_answers_per_arm": candidate.applicable,
            "non_applicable_answers_per_arm": candidate.non_applicable,
        },
    }


def render(report: dict) -> str:
    lines = [f"AC-06 reader comparison: {report['status']}"]
    lines.append(f"  reason: {report['status_reason']}")
    lines.append(f"  session gap: {report['session_gap_hours']:.1f} h")
    lines.append("")
    lines.append("  arm        applicable  correct  partial  incorrect  correct%  median s")
    for role, arm in report["arms"].items():
        pct = "n/a" if arm["correct_pct"] is None else f"{arm['correct_pct']:.1f}"
        med = "n/a" if arm["median_seconds"] is None else f"{arm['median_seconds']:.0f}"
        lines.append(
            f"  {role:<10} {arm['applicable']:>10} {arm['correct']:>8} {arm['partial']:>8} "
            f"{arm['incorrect']:>10} {pct:>9} {med:>9}"
        )
    lines.append("")
    lines.append(
        f"  denominator: {report['denominators']['applicable_answers_per_arm']} applicable answers per arm; "
        f"{report['denominators']['non_applicable_answers_per_arm']} non-applicable questions recorded per arm"
    )
    lines.append("  median s = median of the six per-scenario interpretation-time totals (sum of four per-question times)")
    lines.append("")
    for name, check in report["checks"].items():
        mark = "MET" if check["met"] else "MISSED"
        lines.append(f"  {name:<20} {mark:<7} value={check['value']} target={check['target']} ({check['detail']})")
    if report["regressions"]:
        lines.append("")
        lines.append("  regressions:")
        for item in report["regressions"]:
            lines.append(
                f"    {item['scenario']} {item['question_id']}: baseline={item['baseline']} candidate={item['candidate']}"
            )
    if report["recognised_prior_rows"]:
        lines.append("")
        lines.append("  recognition reported by the reader (washout note, not a scoring input):")
        for item in report["recognised_prior_rows"]:
            lines.append(f"    session {item['session']} {item['scenario']} {item['question_id']}")
    lines.append("")
    lines.append("  per scenario (total interpretation seconds; candidate / baseline)")
    for scenario in report["arms"]["candidate"]["per_scenario"]:
        c = report["arms"]["candidate"]["per_scenario"][scenario]
        b = report["arms"]["baseline"]["per_scenario"][scenario]
        lines.append(
            f"    {scenario:<22} candidate {c['interpretation_seconds']:>4}s "
            f"{c['correct']}/{c['applicable']} correct   baseline {b['interpretation_seconds']:>4}s "
            f"{b['correct']}/{b['applicable']} correct"
        )
    return "\n".join(lines)


def load_rows(args: argparse.Namespace) -> tuple[dict, dict, list[Row]]:
    key = load_json(args.key)
    arm_map = load_json(args.arm_map)
    raw_rows = load_sheet(args.sheet1, "1") + load_sheet(args.sheet2, "2")
    return key, arm_map, validate(key, arm_map, raw_rows)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Score an AC-06 two-session reader comparison.")
    parser.add_argument("--sheet1", type=Path, required=True, help="session-1 response sheet CSV")
    parser.add_argument("--sheet2", type=Path, required=True, help="session-2 response sheet CSV")
    parser.add_argument("--key", type=Path, default=Path("scoring-key/answers.json"))
    parser.add_argument("--arm-map", type=Path, default=Path("scoring-key/arm-map.json"))
    parser.add_argument("--metadata", type=Path, help="run metadata JSON with reader, configuration and window")
    parser.add_argument("--export-adjudication", type=Path, help="write a blind adjudication packet to this directory")
    parser.add_argument("--adjudication-map", type=Path, help="operator-only token map from the export")
    parser.add_argument("--verdicts", type=Path, help="adjudicator-returned verdict file")
    parser.add_argument("--json", type=Path, help="write the full report as JSON here")
    args = parser.parse_args(argv)

    try:
        key, _arm_map, rows = load_rows(args)
        if args.export_adjudication is not None:
            summary = export_for_adjudication(rows, args.export_adjudication)
            print(
                f"adjudication packet written: {summary['rows']} rows -> {summary['input']} "
                f"(operator-only map: {summary['map']})"
            )
            return 0
        if args.verdicts is None or args.adjudication_map is None:
            raise SheetError(
                "scoring needs --verdicts and --adjudication-map; run --export-adjudication first"
            )
        rows = attach_verdicts(rows, args.adjudication_map, args.verdicts)
        comparable, reason = run_is_comparable(args.metadata, rows)
        report = evaluate(rows, key, comparable, reason)
    except SheetError as exc:
        print(f"sheet error: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:  # noqa: BLE001 - any unexpected failure is a data error, never FAIL
        print(f"sheet error: unexpected {type(exc).__name__}: {exc}", file=sys.stderr)
        return 2

    try:
        print(render(report))
        if args.json:
            args.json.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    except OSError as exc:
        print(f"sheet error: cannot write output: {exc}", file=sys.stderr)
        return 2
    return {"PASS": 0, "FAIL": 1, "PENDING": 3}[report["status"]]


if __name__ == "__main__":
    sys.exit(main())
