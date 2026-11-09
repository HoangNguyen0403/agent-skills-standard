#!/usr/bin/env python3
"""Real scoped SQLite N+1 query performance fixture.

Demonstrates and verifies:
1. Intentional baseline N+1 query amplification (1 + N SELECTs).
2. Candidate bounded batch query loading (Q_base + ceil(N / B) SELECTs, i.e. 2 SELECTs).
3. Independent deterministic oracle comparisons (not baseline-only).
4. Edge cases: empty relations, empty pages, continuation pagination.
5. Controls: cross-scope tenant isolation, aggregate projection, and baseline rejection.
6. High-child-cardinality variant: proves relation-list vs aggregate projection distinction.
7. Stable fingerprint normalization: normalizes literal-bearing and placeholder SQL traces.
8. Bounded fixture validation: enforces named 50-key cap, non-negative offsets, and positive batch bounds.

SRS Trace: LLD-004, SRS-009, PRD AC-09.
"""

from __future__ import annotations

import argparse
from dataclasses import asdict, dataclass, field
import json
import math
import platform
import re
import sqlite3
import sys
from time import perf_counter
from typing import Any

# Fixture capacity bounds
PRIMARY_TENANT = "tenant-a"
SECONDARY_TENANT = "tenant-b"
PRIMARY_PARENT_COUNT = 60  # >= 50 required by LLD-004
SECONDARY_PARENT_COUNT = 20  # Overlapping IDs 1..20
BATCH_SIZE_CAP = 50  # Bounded batch cap per LLD-004
HIGH_FANOUT_PARENT_ID = 60  # Deterministic high-cardinality parent
HIGH_FANOUT_CHILD_COUNT = 250  # High child fanout for relation-list vs aggregate proof


@dataclass(frozen=True)
class QueryTrace:
    sql: str
    fingerprint: str


@dataclass(frozen=True)
class ReadMetrics:
    select_count: int
    select_fingerprints: list[str]
    parents_returned: int
    children_returned: int
    serialized_result_bytes: int
    elapsed_ms: float
    raw_queries: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class ScenarioObservation:
    scenario_id: str
    tenant_id: str
    limit: int
    offset: int
    candidate_select_count: int
    candidate_query_bound: int
    candidate_meets_bound: bool
    baseline_select_count: int
    baseline_violates_candidate_bound: bool
    oracle_match: bool
    baseline_candidate_results_equal: bool
    parents_returned: int
    children_returned: int
    serialized_result_bytes: int
    candidate_elapsed_ms: float
    baseline_elapsed_ms: float
    candidate_fingerprints: list[str]
    baseline_fingerprints: list[str]
    notes: str


def validate_fixture_parameters(
    limit: int,
    offset: int,
    batch_size: int = BATCH_SIZE_CAP,
) -> None:
    """Validate boundary parameters against fixture capacity bounds.

    Enforces:
    - offset >= 0
    - 0 <= limit <= BATCH_SIZE_CAP (50)
    - 1 <= batch_size <= BATCH_SIZE_CAP (50)

    Raises ValueError for unsupported internal configurations.
    """
    if offset < 0:
        raise ValueError(f"Offset must be non-negative, got {offset}")
    if limit < 0 or limit > BATCH_SIZE_CAP:
        raise ValueError(
            f"Limit must be between 0 and {BATCH_SIZE_CAP} (fixture cap), got {limit}"
        )
    if batch_size <= 0 or batch_size > BATCH_SIZE_CAP:
        raise ValueError(
            f"Batch size must be between 1 and {BATCH_SIZE_CAP} (fixture cap), got {batch_size}"
        )


def normalize_fingerprint(sql: str) -> str:
    """Normalize raw SQL statement to a stable query fingerprint.

    Handles both parameter-placeholder traces (with '?') and literal-bearing
    SQLite traces (where parameters are expanded to string or numeric literals).

    Policy:
    1. Collapse all consecutive whitespace characters to a single space.
    2. Replace all quoted string literals ('...') with '?'.
    3. Collapse any IN (...) list of expressions/literals/placeholders into 'IN (?)'.
    4. Normalize numeric literals after operators (=, <, >, <=, >=, !=, <>) to '?'.
    5. Normalize numeric literals after LIMIT or OFFSET keywords to '?'.
    """
    norm = re.sub(r"\s+", " ", sql).strip()
    # 2. Normalize quoted string literals: 'text' -> ?
    norm = re.sub(r"'[^']*'", "?", norm)
    # 3. Normalize IN (...) lists: collapse any list of items inside IN (...) to IN (?)
    norm = re.sub(r"\bIN\s*\([^)]*\)", "IN (?)", norm, flags=re.IGNORECASE)
    # 4. Normalize numeric literals after comparison/assignment operators
    norm = re.sub(r"([=<>!]+)\s*\d+", r"\1 ?", norm)
    # 5. Normalize numeric literals after LIMIT or OFFSET
    norm = re.sub(r"\bLIMIT\s+\d+", "LIMIT ?", norm, flags=re.IGNORECASE)
    norm = re.sub(r"\bOFFSET\s+\d+", "OFFSET ?", norm, flags=re.IGNORECASE)
    return norm


def create_database() -> sqlite3.Connection:
    """Initialize an in-memory SQLite database with foreign keys enabled."""
    db = sqlite3.connect(":memory:")
    db.execute("PRAGMA foreign_keys = ON;")
    db.executescript(
        """
        CREATE TABLE parents (
            tenant_id TEXT NOT NULL,
            id INTEGER NOT NULL,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY (tenant_id, id)
        );

        CREATE TABLE children (
            tenant_id TEXT NOT NULL,
            id INTEGER NOT NULL,
            parent_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            payload TEXT NOT NULL,
            PRIMARY KEY (tenant_id, id),
            FOREIGN KEY (tenant_id, parent_id) REFERENCES parents (tenant_id, id) ON DELETE CASCADE
        );

        CREATE INDEX idx_children_lookup ON children (tenant_id, parent_id, id);
        """
    )
    return db


def seed_dataset(db: sqlite3.Connection) -> None:
    """Seed deterministic parent and child records for primary and secondary tenants.

    Child distribution per parent:
      Primary tenant:
        - Parent 60: deterministic high fan-out (250 children) to prove relation-list vs aggregate distinction.
        - Parents 1..59: id % 4 (produces 0, 1, 2, 3 children deterministically).
      Secondary tenant:
        - Parents 1..20: (id + 1) % 4 (produces 2, 3, 0, 1 children with overlapping parent IDs).
    """
    # Primary tenant
    for pid in range(1, PRIMARY_PARENT_COUNT + 1):
        name = f"parent-a-{pid:03d}"
        created_at = f"2026-01-01T00:{pid % 60:02d}:00Z"
        db.execute(
            "INSERT INTO parents (tenant_id, id, name, created_at) VALUES (?, ?, ?, ?)",
            (PRIMARY_TENANT, pid, name, created_at),
        )
        if pid == HIGH_FANOUT_PARENT_ID:
            child_count = HIGH_FANOUT_CHILD_COUNT
        else:
            child_count = pid % 4

        for c_idx in range(child_count):
            cid = pid * 1000 + c_idx + 1
            title = f"child-a-{pid:03d}-{c_idx + 1:03d}"
            payload = f"payload-a-{pid:03d}-{c_idx + 1:03d}"
            db.execute(
                "INSERT INTO children (tenant_id, id, parent_id, title, payload) VALUES (?, ?, ?, ?, ?)",
                (PRIMARY_TENANT, cid, pid, title, payload),
            )

    # Secondary tenant with overlapping IDs 1..20
    for pid in range(1, SECONDARY_PARENT_COUNT + 1):
        name = f"parent-b-{pid:03d}"
        created_at = f"2026-02-01T00:{pid % 60:02d}:00Z"
        db.execute(
            "INSERT INTO parents (tenant_id, id, name, created_at) VALUES (?, ?, ?, ?)",
            (SECONDARY_TENANT, pid, name, created_at),
        )
        child_count = (pid + 1) % 4
        for c_idx in range(child_count):
            cid = pid * 1000 + c_idx + 1
            title = f"child-b-{pid:03d}-{c_idx + 1:03d}"
            payload = f"payload-b-{pid:03d}-{c_idx + 1:03d}"
            db.execute(
                "INSERT INTO children (tenant_id, id, parent_id, title, payload) VALUES (?, ?, ?, ?, ?)",
                (SECONDARY_TENANT, cid, pid, title, payload),
            )

    db.commit()


def independent_oracle_parents(
    tenant_id: str,
    limit: int,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """Generate expected parent and child records without touching SQLite or baseline logic."""
    if tenant_id == PRIMARY_TENANT:
        total = PRIMARY_PARENT_COUNT
        prefix = "a"
        def child_count_fn(pid: int) -> int:
            if pid == HIGH_FANOUT_PARENT_ID:
                return HIGH_FANOUT_CHILD_COUNT
            return pid % 4
    elif tenant_id == SECONDARY_TENANT:
        total = SECONDARY_PARENT_COUNT
        prefix = "b"
        def child_count_fn(pid: int) -> int:
            return (pid + 1) % 4
    else:
        return []

    results: list[dict[str, Any]] = []
    end_idx = min(total, offset + limit)
    for pid in range(offset + 1, end_idx + 1):
        c_count = child_count_fn(pid)
        children = [
            {
                "id": pid * 1000 + c_idx + 1,
                "parent_id": pid,
                "title": f"child-{prefix}-{pid:03d}-{c_idx + 1:03d}",
                "payload": f"payload-{prefix}-{pid:03d}-{c_idx + 1:03d}",
            }
            for c_idx in range(c_count)
        ]
        results.append({
            "id": pid,
            "name": f"parent-{prefix}-{pid:03d}",
            "created_at": f"2026-0{'1' if prefix == 'a' else '2'}-01T00:{pid % 60:02d}:00Z",
            "children": children,
        })
    return results


def independent_oracle_aggregates(
    tenant_id: str,
    limit: int,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """Generate expected aggregate projection (child counts) without touching SQLite."""
    parents = independent_oracle_parents(tenant_id, limit, offset)
    return [
        {
            "id": p["id"],
            "name": p["name"],
            "child_count": len(p["children"]),
        }
        for p in parents
    ]


def load_baseline(
    db: sqlite3.Connection,
    tenant_id: str,
    limit: int,
    offset: int = 0,
) -> tuple[list[dict[str, Any]], ReadMetrics]:
    """Execute faulty baseline 1+N loading pattern (intentionally non-batched)."""
    validate_fixture_parameters(limit, offset, BATCH_SIZE_CAP)

    emitted: list[str] = []

    def trace(sql: str) -> None:
        trimmed = sql.strip()
        if trimmed.upper().startswith("SELECT"):
            emitted.append(trimmed)

    db.set_trace_callback(trace)
    start = perf_counter()
    try:
        parent_rows = db.execute(
            "SELECT id, name, created_at FROM parents WHERE tenant_id = ? ORDER BY id LIMIT ? OFFSET ?",
            (tenant_id, limit, offset),
        ).fetchall()

        results: list[dict[str, Any]] = []
        for pid, name, created_at in parent_rows:
            child_rows = db.execute(
                "SELECT id, parent_id, title, payload FROM children WHERE tenant_id = ? AND parent_id = ? ORDER BY id",
                (tenant_id, pid),
            ).fetchall()
            children = [
                {"id": cid, "parent_id": c_pid, "title": title, "payload": payload}
                for cid, c_pid, title, payload in child_rows
            ]
            results.append({
                "id": pid,
                "name": name,
                "created_at": created_at,
                "children": children,
            })
    finally:
        db.set_trace_callback(None)

    elapsed_ms = (perf_counter() - start) * 1000.0
    fingerprints = sorted(list({normalize_fingerprint(q) for q in emitted}))
    serialized_bytes = len(json.dumps(results, sort_keys=True).encode("utf-8"))
    child_count = sum(len(p["children"]) for p in results)

    metrics = ReadMetrics(
        select_count=len(emitted),
        select_fingerprints=fingerprints,
        parents_returned=len(results),
        children_returned=child_count,
        serialized_result_bytes=serialized_bytes,
        elapsed_ms=round(elapsed_ms, 3),
        raw_queries=emitted,
    )
    return results, metrics


def load_candidate(
    db: sqlite3.Connection,
    tenant_id: str,
    limit: int,
    offset: int = 0,
    batch_size: int = BATCH_SIZE_CAP,
) -> tuple[list[dict[str, Any]], ReadMetrics]:
    """Execute candidate bounded loading pattern (paged parents + bounded IN batch)."""
    validate_fixture_parameters(limit, offset, batch_size)

    emitted: list[str] = []

    def trace(sql: str) -> None:
        trimmed = sql.strip()
        if trimmed.upper().startswith("SELECT"):
            emitted.append(trimmed)

    db.set_trace_callback(trace)
    start = perf_counter()
    try:
        parent_rows = db.execute(
            "SELECT id, name, created_at FROM parents WHERE tenant_id = ? ORDER BY id LIMIT ? OFFSET ?",
            (tenant_id, limit, offset),
        ).fetchall()

        parents = [
            {"id": pid, "name": name, "created_at": created_at, "children": []}
            for pid, name, created_at in parent_rows
        ]

        # Only query children if parents exist
        if parents:
            parent_ids = [p["id"] for p in parents]
            children_by_parent: dict[int, list[dict[str, Any]]] = {pid: [] for pid in parent_ids}

            for idx in range(0, len(parent_ids), batch_size):
                chunk = parent_ids[idx : idx + batch_size]
                placeholders = ",".join("?" for _ in chunk)
                query = (
                    f"SELECT id, parent_id, title, payload "
                    f"FROM children "
                    f"WHERE tenant_id = ? AND parent_id IN ({placeholders}) "
                    f"ORDER BY parent_id, id"
                )
                child_rows = db.execute(query, [tenant_id, *chunk]).fetchall()
                for cid, c_pid, title, payload in child_rows:
                    children_by_parent[c_pid].append({
                        "id": cid,
                        "parent_id": c_pid,
                        "title": title,
                        "payload": payload,
                    })

            for p in parents:
                p["children"] = children_by_parent[p["id"]]

        results = parents
    finally:
        db.set_trace_callback(None)

    elapsed_ms = (perf_counter() - start) * 1000.0
    fingerprints = sorted(list({normalize_fingerprint(q) for q in emitted}))
    serialized_bytes = len(json.dumps(results, sort_keys=True).encode("utf-8"))
    child_count = sum(len(p["children"]) for p in results)

    metrics = ReadMetrics(
        select_count=len(emitted),
        select_fingerprints=fingerprints,
        parents_returned=len(results),
        children_returned=child_count,
        serialized_result_bytes=serialized_bytes,
        elapsed_ms=round(elapsed_ms, 3),
        raw_queries=emitted,
    )
    return results, metrics


def load_aggregate_control(
    db: sqlite3.Connection,
    tenant_id: str,
    limit: int,
    offset: int = 0,
) -> tuple[list[dict[str, Any]], ReadMetrics]:
    """Execute aggregate projection control (1 SELECT with GROUP BY, no child entity loading)."""
    validate_fixture_parameters(limit, offset, BATCH_SIZE_CAP)

    emitted: list[str] = []

    def trace(sql: str) -> None:
        trimmed = sql.strip()
        if trimmed.upper().startswith("SELECT"):
            emitted.append(trimmed)

    db.set_trace_callback(trace)
    start = perf_counter()
    try:
        rows = db.execute(
            """
            SELECT p.id, p.name, COUNT(c.id) AS child_count
            FROM parents p
            LEFT JOIN children c ON c.tenant_id = p.tenant_id AND c.parent_id = p.id
            WHERE p.tenant_id = ?
            GROUP BY p.id, p.name
            ORDER BY p.id
            LIMIT ? OFFSET ?
            """,
            (tenant_id, limit, offset),
        ).fetchall()
        results = [{"id": r[0], "name": r[1], "child_count": r[2]} for r in rows]
    finally:
        db.set_trace_callback(None)

    elapsed_ms = (perf_counter() - start) * 1000.0
    fingerprints = sorted(list({normalize_fingerprint(q) for q in emitted}))
    serialized_bytes = len(json.dumps(results, sort_keys=True).encode("utf-8"))

    metrics = ReadMetrics(
        select_count=len(emitted),
        select_fingerprints=fingerprints,
        parents_returned=len(results),
        children_returned=0,
        serialized_result_bytes=serialized_bytes,
        elapsed_ms=round(elapsed_ms, 3),
        raw_queries=emitted,
    )
    return results, metrics


def compute_expected_query_bound(parent_count: int, batch_size: int = BATCH_SIZE_CAP) -> int:
    """Compute the declared query bound: Q_base + ceil(N / B) for N > 0, else 1."""
    if parent_count == 0:
        return 1
    return 1 + math.ceil(parent_count / batch_size)


def run_scenario(
    db: sqlite3.Connection,
    scenario_id: str,
    tenant_id: str,
    limit: int,
    offset: int = 0,
    batch_size: int = BATCH_SIZE_CAP,
    notes: str = "",
) -> tuple[ScenarioObservation, list[str]]:
    """Execute one comparison scenario and evaluate invariants."""
    failures: list[str] = []

    # Validate configuration parameters at the scenario boundary
    try:
        validate_fixture_parameters(limit, offset, batch_size)
    except ValueError as err:
        failures.append(f"{scenario_id}: unsupported configuration: {err}")
        obs = ScenarioObservation(
            scenario_id=scenario_id,
            tenant_id=tenant_id,
            limit=limit,
            offset=offset,
            candidate_select_count=0,
            candidate_query_bound=0,
            candidate_meets_bound=False,
            baseline_select_count=0,
            baseline_violates_candidate_bound=False,
            oracle_match=False,
            baseline_candidate_results_equal=False,
            parents_returned=0,
            children_returned=0,
            serialized_result_bytes=0,
            candidate_elapsed_ms=0.0,
            baseline_elapsed_ms=0.0,
            candidate_fingerprints=[],
            baseline_fingerprints=[],
            notes=f"Failed configuration validation: {err}",
        )
        return obs, failures

    # 1. Independent oracle
    expected_data = independent_oracle_parents(tenant_id, limit, offset)

    # 2. Baseline
    baseline_data, baseline_metrics = load_baseline(db, tenant_id, limit, offset)

    # 3. Candidate
    candidate_data, candidate_metrics = load_candidate(db, tenant_id, limit, offset, batch_size=batch_size)

    # 4. Invariant checks
    oracle_match = (candidate_data == expected_data)
    if not oracle_match:
        failures.append(f"{scenario_id}: candidate output does not match independent oracle")

    results_equal = (candidate_data == baseline_data)
    if not results_equal:
        failures.append(f"{scenario_id}: candidate output does not match baseline output")

    expected_bound = compute_expected_query_bound(candidate_metrics.parents_returned, batch_size=batch_size)
    candidate_meets_bound = (candidate_metrics.select_count <= expected_bound)
    if not candidate_meets_bound:
        failures.append(
            f"{scenario_id}: candidate SELECT count {candidate_metrics.select_count} exceeds bound {expected_bound}"
        )

    # Baseline rejection check: for N=10 and N=50, baseline must fail candidate bound
    baseline_violates_bound = (baseline_metrics.select_count > expected_bound)
    if limit in (10, 50) and offset == 0 and not baseline_violates_bound:
        failures.append(
            f"{scenario_id}: baseline with N={limit} unexpectedly satisfied candidate query bound"
        )

    obs = ScenarioObservation(
        scenario_id=scenario_id,
        tenant_id=tenant_id,
        limit=limit,
        offset=offset,
        candidate_select_count=candidate_metrics.select_count,
        candidate_query_bound=expected_bound,
        candidate_meets_bound=candidate_meets_bound,
        baseline_select_count=baseline_metrics.select_count,
        baseline_violates_candidate_bound=baseline_violates_bound,
        oracle_match=oracle_match,
        baseline_candidate_results_equal=results_equal,
        parents_returned=candidate_metrics.parents_returned,
        children_returned=candidate_metrics.children_returned,
        serialized_result_bytes=candidate_metrics.serialized_result_bytes,
        candidate_elapsed_ms=candidate_metrics.elapsed_ms,
        baseline_elapsed_ms=baseline_metrics.elapsed_ms,
        candidate_fingerprints=candidate_metrics.select_fingerprints,
        baseline_fingerprints=baseline_metrics.select_fingerprints,
        notes=notes,
    )
    return obs, failures


def run_all_scenarios() -> dict[str, Any]:
    """Run all approved scenarios, controls, and invariant verifications."""
    db = create_database()
    seed_dataset(db)

    observations: list[dict[str, Any]] = []
    all_failures: list[str] = []

    # Scenarios N=1, N=10, N=50 and controls
    scenarios = [
        ("N1", PRIMARY_TENANT, 1, 0, BATCH_SIZE_CAP, "Single-parent boundary: baseline 2 SELECTs, candidate 2 SELECTs (non-discriminating count)"),
        ("N10", PRIMARY_TENANT, 10, 0, BATCH_SIZE_CAP, "Ten parents: baseline 11 SELECTs vs candidate 2 SELECTs"),
        ("N50", PRIMARY_TENANT, 50, 0, BATCH_SIZE_CAP, "Full page (50 parents): baseline 51 SELECTs vs candidate 2 SELECTs"),
        ("Pagination_Page1", PRIMARY_TENANT, 10, 0, BATCH_SIZE_CAP, "Continuation pagination page 1 (parents 1..10)"),
        ("Pagination_Page2", PRIMARY_TENANT, 10, 10, BATCH_SIZE_CAP, "Continuation pagination page 2 (parents 11..20)"),
        ("Exhausted_Page", PRIMARY_TENANT, 10, 1000, BATCH_SIZE_CAP, "Exhausted continuation page (limit 10, offset 1000): 1 SELECT, 0 child queries, empty results"),
        ("Zero_Limit_Page", PRIMARY_TENANT, 0, 0, BATCH_SIZE_CAP, "Zero-limit boundary: 1 SELECT for parents, 0 child queries, empty results"),
        ("Cross_Scope_TenantB", SECONDARY_TENANT, 10, 0, BATCH_SIZE_CAP, "Tenant B with overlapping IDs 1..10: verifies scope isolation"),
        ("High_Fanout_Parent_Relation", PRIMARY_TENANT, 1, 59, BATCH_SIZE_CAP, "High-fanout parent 60 relation list: loads 250 child rows (large bytes/materialization)"),
    ]

    obs_map: dict[str, ScenarioObservation] = {}
    for sc_id, tenant, limit, offset, b_size, notes in scenarios:
        obs, failures = run_scenario(db, sc_id, tenant, limit, offset, batch_size=b_size, notes=notes)
        observations.append(asdict(obs))
        obs_map[sc_id] = obs
        all_failures.extend(failures)

    # Cross-scenario invariant: continuation pagination integrity
    p1 = obs_map["Pagination_Page1"]
    p2 = obs_map["Pagination_Page2"]
    if p1.parents_returned != 10 or p2.parents_returned != 10:
        all_failures.append("Continuation pagination: expected 10 rows per page")

    # Cross-scenario invariant: exhausted continuation page (positive limit past the last row)
    exhausted = obs_map["Exhausted_Page"]
    if (
        exhausted.candidate_select_count != 1
        or exhausted.parents_returned != 0
        or exhausted.children_returned != 0
        or not exhausted.oracle_match
    ):
        all_failures.append(
            "Exhausted page: expected 1 SELECT with 0 parents and 0 children, "
            f"observed {exhausted.candidate_select_count} SELECTs, "
            f"{exhausted.parents_returned} parents, {exhausted.children_returned} children"
        )

    # Cross-scenario invariant: zero-limit boundary
    zero_limit = obs_map["Zero_Limit_Page"]
    if (
        zero_limit.candidate_select_count != 1
        or zero_limit.parents_returned != 0
        or zero_limit.children_returned != 0
    ):
        all_failures.append(
            "Zero-limit page: expected 1 SELECT with 0 parents and 0 children, "
            f"observed {zero_limit.candidate_select_count} SELECTs, "
            f"{zero_limit.parents_returned} parents, {zero_limit.children_returned} children"
        )

    # Aggregate projection control for standard page (limit 10)
    agg_expected = independent_oracle_aggregates(PRIMARY_TENANT, 10, 0)
    agg_data, agg_metrics = load_aggregate_control(db, PRIMARY_TENANT, 10, 0)
    if agg_data != agg_expected:
        all_failures.append("Aggregate control: output does not match independent oracle")
    if agg_metrics.select_count != 1:
        all_failures.append(f"Aggregate control: expected 1 SELECT, observed {agg_metrics.select_count}")

    observations.append({
        "scenario_id": "Aggregate_Projection_Control",
        "tenant_id": PRIMARY_TENANT,
        "limit": 10,
        "offset": 0,
        "candidate_select_count": agg_metrics.select_count,
        "candidate_query_bound": 1,
        "candidate_meets_bound": agg_metrics.select_count == 1,
        "baseline_select_count": None,
        "baseline_violates_candidate_bound": None,
        "oracle_match": agg_data == agg_expected,
        "baseline_candidate_results_equal": True,
        "parents_returned": agg_metrics.parents_returned,
        "children_returned": 0,
        "serialized_result_bytes": agg_metrics.serialized_result_bytes,
        "candidate_elapsed_ms": agg_metrics.elapsed_ms,
        "baseline_elapsed_ms": 0.0,
        "candidate_fingerprints": agg_metrics.select_fingerprints,
        "baseline_fingerprints": [],
        "notes": "Aggregate projection loads child counts in 1 SELECT without entity fanout",
    })

    # High-fanout aggregate comparison (Parent 60, offset 59, limit 1)
    hf_agg_expected = independent_oracle_aggregates(PRIMARY_TENANT, 1, 59)
    hf_agg_data, hf_agg_metrics = load_aggregate_control(db, PRIMARY_TENANT, 1, 59)
    if hf_agg_data != hf_agg_expected:
        all_failures.append("High fanout aggregate: output does not match independent oracle")
    if hf_agg_metrics.select_count != 1:
        all_failures.append(f"High fanout aggregate: expected 1 SELECT, observed {hf_agg_metrics.select_count}")
    if hf_agg_data[0]["child_count"] != HIGH_FANOUT_CHILD_COUNT:
        all_failures.append(
            f"High fanout aggregate: expected child_count {HIGH_FANOUT_CHILD_COUNT}, got {hf_agg_data[0]['child_count']}"
        )

    observations.append({
        "scenario_id": "High_Fanout_Parent_Aggregate",
        "tenant_id": PRIMARY_TENANT,
        "limit": 1,
        "offset": 59,
        "candidate_select_count": hf_agg_metrics.select_count,
        "candidate_query_bound": 1,
        "candidate_meets_bound": hf_agg_metrics.select_count == 1,
        "baseline_select_count": None,
        "baseline_violates_candidate_bound": None,
        "oracle_match": hf_agg_data == hf_agg_expected,
        "baseline_candidate_results_equal": True,
        "parents_returned": hf_agg_metrics.parents_returned,
        "children_returned": 0,
        "serialized_result_bytes": hf_agg_metrics.serialized_result_bytes,
        "candidate_elapsed_ms": hf_agg_metrics.elapsed_ms,
        "baseline_elapsed_ms": 0.0,
        "candidate_fingerprints": hf_agg_metrics.select_fingerprints,
        "baseline_fingerprints": [],
        "notes": f"High-fanout aggregate loads child_count ({HIGH_FANOUT_CHILD_COUNT}) in 1 SELECT, 0 child entities materialized",
    })

    # High-fanout contrast assertion: relation list returned rows/bytes vs aggregate projection
    hf_rel = obs_map["High_Fanout_Parent_Relation"]
    if hf_rel.children_returned != HIGH_FANOUT_CHILD_COUNT:
        all_failures.append(
            f"High fanout relation: expected {HIGH_FANOUT_CHILD_COUNT} children, got {hf_rel.children_returned}"
        )
    if hf_rel.serialized_result_bytes <= hf_agg_metrics.serialized_result_bytes:
        all_failures.append(
            "High fanout contrast: relation list serialized bytes must exceed aggregate serialized bytes"
        )

    # Control: fingerprint normalization over real SQLite traces (literal expansion)
    _, trace_a = load_baseline(db, PRIMARY_TENANT, 10, 0)
    _, trace_b = load_baseline(db, SECONDARY_TENANT, 10, 0)
    if trace_a.select_count != 11 or len(trace_a.select_fingerprints) != 2:
        all_failures.append(
            "Fingerprint normalization: expected 11 baseline SELECTs collapsing to 2 fingerprints, "
            f"observed {trace_a.select_count} SELECTs and {len(trace_a.select_fingerprints)} fingerprints"
        )
    if trace_a.select_fingerprints != trace_b.select_fingerprints:
        all_failures.append(
            "Fingerprint normalization: tenant literal traces did not normalize to identical fingerprints"
        )

    # Control: fixture parameter bounds enforcement
    invalid_parameters = (
        (BATCH_SIZE_CAP + 1, 0, BATCH_SIZE_CAP),
        (10, -1, BATCH_SIZE_CAP),
        (10, 0, 0),
        (10, 0, BATCH_SIZE_CAP + 1),
    )
    rejected = 0
    for limit, offset, batch_size in invalid_parameters:
        try:
            validate_fixture_parameters(limit, offset, batch_size)
        except ValueError:
            rejected += 1
    if rejected != len(invalid_parameters):
        all_failures.append(
            f"Fixture bounds: expected {len(invalid_parameters)} rejections, observed {rejected}"
        )

    db.close()

    status = "pass" if not all_failures else "fail"
    receipt = {
        "status": status,
        "fixture": "nplus1_smoke.py",
        "standard": "database-query-performance",
        "srs_trace": ["LLD-004", "SRS-009"],
        "prd_trace": ["AC-09"],
        "environment": {
            "sqlite_version": sqlite3.sqlite_version,
            "python_version": sys.version.split()[0],
            "platform": platform.platform(),
        },
        "controls_verified": [
            "independent_oracle_verification",
            "baseline_query_amplification_rejection",
            "bounded_batch_candidate_conformance",
            "empty_parent_page_single_query",
            "continuation_pagination_disjoint_ordering",
            "cross_scope_tenant_isolation",
            "empty_child_relation_handling",
            "aggregate_projection_single_query_control",
            "high_child_cardinality_aggregate_distinction",
            "stable_literal_trace_fingerprint_normalization",
            "fixture_parameter_bounds_enforcement",
        ],
        "observations": observations,
        "failed_invariants": all_failures,
    }
    return receipt


def main(argv: list[str] | None = None) -> int:
    """CLI entrypoint returning 0 on full verification pass, 1 on failure."""
    parser = argparse.ArgumentParser(
        description="Execute scoped SQLite N+1 query performance verification."
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit compact unindented JSON receipt",
    )
    args = parser.parse_args(argv)

    receipt = run_all_scenarios()
    indent = None if args.json else 2
    print(json.dumps(receipt, indent=indent))

    if receipt["status"] != "pass":
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
