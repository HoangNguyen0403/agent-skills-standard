#!/usr/bin/env python3
"""Focused unit and behavioral tests for the SQLite N+1 query smoke fixture.

Verifies:
- Deterministic synthetic dataset, foreign-key enforcement, and high-fanout parent.
- Independent oracle accuracy including high-cardinality variants.
- Baseline 1+N amplification vs candidate bounded 2-SELECT query execution.
- Empty parent pages and empty child relations.
- Continuation pagination and cross-scope tenant isolation.
- Aggregate projection single-query control and high-fanout entity materialization distinction.
- Stable query fingerprint normalization across literal-bearing and placeholder SQL traces.
- Fixture boundary parameter validation (named 50-key cap, non-negative offsets, positive batch bounds).
- Invariant violation detection (counterexample sensitivity).
- Full runner report output and exit codes.

SRS Trace: LLD-004, SRS-009, PRD AC-09.
"""

from __future__ import annotations

import io
import json
import sqlite3
import sys
import unittest
from unittest.mock import patch

from nplus1_smoke import (
    BATCH_SIZE_CAP,
    HIGH_FANOUT_CHILD_COUNT,
    HIGH_FANOUT_PARENT_ID,
    PRIMARY_PARENT_COUNT,
    PRIMARY_TENANT,
    SECONDARY_PARENT_COUNT,
    SECONDARY_TENANT,
    compute_expected_query_bound,
    create_database,
    independent_oracle_aggregates,
    independent_oracle_parents,
    load_aggregate_control,
    load_baseline,
    load_candidate,
    main,
    normalize_fingerprint,
    run_all_scenarios,
    run_scenario,
    seed_dataset,
    validate_fixture_parameters,
)


class TestNPlusOneSmokeFixture(unittest.TestCase):
    def setUp(self) -> None:
        self.db = create_database()
        seed_dataset(self.db)

    def tearDown(self) -> None:
        self.db.close()

    def test_schema_and_dataset_invariants(self) -> None:
        """Verify schema constraints, minimum parent counts, varied child counts, and high fan-out."""
        # 1. Primary tenant has at least 50 parents (LLD-004 requirement)
        p_row = self.db.execute(
            "SELECT COUNT(*) FROM parents WHERE tenant_id = ?", (PRIMARY_TENANT,)
        ).fetchone()
        self.assertGreaterEqual(p_row[0], 50)
        self.assertEqual(p_row[0], PRIMARY_PARENT_COUNT)

        # 2. Secondary tenant has overlapping parent IDs 1..20
        sec_rows = self.db.execute(
            "SELECT id FROM parents WHERE tenant_id = ? ORDER BY id", (SECONDARY_TENANT,)
        ).fetchall()
        self.assertEqual(len(sec_rows), SECONDARY_PARENT_COUNT)
        sec_ids = [r[0] for r in sec_rows]
        self.assertEqual(sec_ids, list(range(1, SECONDARY_PARENT_COUNT + 1)))

        # 3. Child relations contain 0, 1, and multiple children deterministically
        child_counts = set()
        for pid in range(1, 5):
            c_row = self.db.execute(
                "SELECT COUNT(*) FROM children WHERE tenant_id = ? AND parent_id = ?",
                (PRIMARY_TENANT, pid),
            ).fetchone()
            child_counts.add(c_row[0])
        self.assertIn(0, child_counts, "Parent with 0 children must exist")
        self.assertIn(1, child_counts, "Parent with 1 child must exist")
        self.assertIn(2, child_counts, "Parent with multiple children must exist")

        # 4. Deterministic high fan-out parent exists (SRS line 203)
        hf_row = self.db.execute(
            "SELECT COUNT(*) FROM children WHERE tenant_id = ? AND parent_id = ?",
            (PRIMARY_TENANT, HIGH_FANOUT_PARENT_ID),
        ).fetchone()
        self.assertEqual(hf_row[0], HIGH_FANOUT_CHILD_COUNT)

        # 5. Foreign key enforcement is active
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO children (tenant_id, id, parent_id, title, payload) VALUES (?, ?, ?, ?, ?)",
                (PRIMARY_TENANT, 99999, 9999, "orphan", "payload"),
            )

    def test_independent_oracle_integrity(self) -> None:
        """Verify independent oracle output without database execution."""
        oracle_10 = independent_oracle_parents(PRIMARY_TENANT, limit=10, offset=0)
        self.assertEqual(len(oracle_10), 10)
        self.assertEqual(oracle_10[0]["id"], 1)
        self.assertEqual(oracle_10[0]["name"], "parent-a-001")
        self.assertEqual(len(oracle_10[0]["children"]), 1)  # 1 % 4 == 1
        self.assertEqual(len(oracle_10[3]["children"]), 0)  # 4 % 4 == 0 (empty child relation)

        # High-fanout parent oracle
        oracle_hf = independent_oracle_parents(PRIMARY_TENANT, limit=1, offset=59)
        self.assertEqual(len(oracle_hf), 1)
        self.assertEqual(oracle_hf[0]["id"], HIGH_FANOUT_PARENT_ID)
        self.assertEqual(len(oracle_hf[0]["children"]), HIGH_FANOUT_CHILD_COUNT)

        # Aggregate oracle
        agg_oracle = independent_oracle_aggregates(PRIMARY_TENANT, limit=10, offset=0)
        self.assertEqual(len(agg_oracle), 10)
        self.assertEqual(agg_oracle[0]["child_count"], 1)
        self.assertEqual(agg_oracle[3]["child_count"], 0)

        agg_hf_oracle = independent_oracle_aggregates(PRIMARY_TENANT, limit=1, offset=59)
        self.assertEqual(agg_hf_oracle[0]["child_count"], HIGH_FANOUT_CHILD_COUNT)

    def test_query_count_amplification_and_bounds(self) -> None:
        """Verify N=1, 10, 50 query counts: baseline 1+N vs candidate 2 SELECTs."""
        # N=1: baseline 1+1=2, candidate 2 (non-discriminating count)
        base_1, m_base_1 = load_baseline(self.db, PRIMARY_TENANT, limit=1, offset=0)
        cand_1, m_cand_1 = load_candidate(self.db, PRIMARY_TENANT, limit=1, offset=0)
        self.assertEqual(m_base_1.select_count, 2)
        self.assertEqual(m_cand_1.select_count, 2)
        self.assertEqual(base_1, cand_1)

        # N=10: baseline 1+10=11, candidate 2
        base_10, m_base_10 = load_baseline(self.db, PRIMARY_TENANT, limit=10, offset=0)
        cand_10, m_cand_10 = load_candidate(self.db, PRIMARY_TENANT, limit=10, offset=0)
        self.assertEqual(m_base_10.select_count, 11)
        self.assertEqual(m_cand_10.select_count, 2)
        self.assertEqual(base_10, cand_10)
        self.assertGreater(m_base_10.select_count, compute_expected_query_bound(10))

        # N=50: baseline 1+50=51, candidate 2
        base_50, m_base_50 = load_baseline(self.db, PRIMARY_TENANT, limit=50, offset=0)
        cand_50, m_cand_50 = load_candidate(self.db, PRIMARY_TENANT, limit=50, offset=0)
        self.assertEqual(m_base_50.select_count, 51)
        self.assertEqual(m_cand_50.select_count, 2)
        self.assertEqual(base_50, cand_50)
        self.assertGreater(m_base_50.select_count, compute_expected_query_bound(50))

    def test_exhausted_and_zero_limit_page_behavior(self) -> None:
        """Verify exhausted positive-limit and zero-limit pages execute exactly 1 SELECT with 0 child queries."""
        # 1. Exhausted continuation page: positive limit past the last parent
        cand_exhausted, m_cand_exhausted = load_candidate(self.db, PRIMARY_TENANT, limit=10, offset=1000)
        self.assertEqual(m_cand_exhausted.select_count, 1)
        self.assertEqual(m_cand_exhausted.parents_returned, 0)
        self.assertEqual(m_cand_exhausted.children_returned, 0)
        self.assertEqual(cand_exhausted, [])

        base_exhausted, m_base_exhausted = load_baseline(self.db, PRIMARY_TENANT, limit=10, offset=1000)
        self.assertEqual(m_base_exhausted.select_count, 1)
        self.assertEqual(base_exhausted, [])

        # 2. Zero-limit boundary
        cand_zero, m_cand_zero = load_candidate(self.db, PRIMARY_TENANT, limit=0, offset=0)
        self.assertEqual(m_cand_zero.select_count, 1)
        self.assertEqual(m_cand_zero.parents_returned, 0)
        self.assertEqual(m_cand_zero.children_returned, 0)
        self.assertEqual(cand_zero, [])

    def test_continuation_pagination_integrity(self) -> None:
        """Verify pagination produces sequential disjoint pages without missing or duplicated rows."""
        p1, m1 = load_candidate(self.db, PRIMARY_TENANT, limit=10, offset=0)
        p2, m2 = load_candidate(self.db, PRIMARY_TENANT, limit=10, offset=10)

        self.assertEqual(len(p1), 10)
        self.assertEqual(len(p2), 10)
        p1_ids = [p["id"] for p in p1]
        p2_ids = [p["id"] for p in p2]

        self.assertEqual(p1_ids, list(range(1, 11)))
        self.assertEqual(p2_ids, list(range(11, 21)))
        self.assertTrue(set(p1_ids).isdisjoint(set(p2_ids)))
        self.assertEqual(m1.select_count, 2)
        self.assertEqual(m2.select_count, 2)

    def test_cross_scope_tenant_isolation(self) -> None:
        """Verify queries in tenant-b return only tenant-b data despite overlapping parent IDs."""
        cand_b, m_b = load_candidate(self.db, SECONDARY_TENANT, limit=10, offset=0)
        self.assertEqual(len(cand_b), 10)
        for p in cand_b:
            self.assertTrue(p["name"].startswith("parent-b-"))
            for c in p["children"]:
                self.assertTrue(c["title"].startswith("child-b-"))
                self.assertTrue(c["payload"].startswith("payload-b-"))

        # Verify against independent tenant-b oracle
        oracle_b = independent_oracle_parents(SECONDARY_TENANT, limit=10, offset=0)
        self.assertEqual(cand_b, oracle_b)

    def test_aggregate_projection_control(self) -> None:
        """Verify aggregate projection issues exactly 1 query and avoids loading child entities."""
        agg_data, agg_metrics = load_aggregate_control(self.db, PRIMARY_TENANT, limit=10, offset=0)
        self.assertEqual(agg_metrics.select_count, 1)
        self.assertEqual(agg_metrics.children_returned, 0)
        oracle_agg = independent_oracle_aggregates(PRIMARY_TENANT, limit=10, offset=0)
        self.assertEqual(agg_data, oracle_agg)

    def test_high_fanout_cardinality_and_aggregate_distinction(self) -> None:
        """Verify relation-list loading vs aggregate projection on high child fan-out (SRS line 203).

        Proves that when only aggregate information is required:
        - Candidate relation list materializes 250 child dicts and serializes them in full.
        - Aggregate projection returns child_count in 1 SELECT without materializing child entities.
        """
        # 1. Full relation list for high-fanout parent 60
        rel_data, rel_metrics = load_candidate(self.db, PRIMARY_TENANT, limit=1, offset=59)
        self.assertEqual(len(rel_data), 1)
        self.assertEqual(rel_metrics.parents_returned, 1)
        self.assertEqual(rel_metrics.children_returned, HIGH_FANOUT_CHILD_COUNT)
        self.assertEqual(len(rel_data[0]["children"]), HIGH_FANOUT_CHILD_COUNT)
        self.assertEqual(
            rel_metrics.serialized_result_bytes,
            len(json.dumps(rel_data, sort_keys=True).encode("utf-8")),
        )

        # 2. Aggregate projection for high-fanout parent 60
        agg_data, agg_metrics = load_aggregate_control(self.db, PRIMARY_TENANT, limit=1, offset=59)
        self.assertEqual(len(agg_data), 1)
        self.assertEqual(agg_metrics.parents_returned, 1)
        self.assertEqual(agg_metrics.children_returned, 0)  # 0 child entities materialized
        self.assertEqual(agg_metrics.select_count, 1)  # Exactly 1 SELECT
        self.assertEqual(agg_data[0]["child_count"], HIGH_FANOUT_CHILD_COUNT)
        self.assertEqual(
            agg_metrics.serialized_result_bytes,
            len(json.dumps(agg_data, sort_keys=True).encode("utf-8")),
        )

        # 3. Direct comparison: materialized relation list serializes larger than the aggregate projection
        self.assertGreater(
            rel_metrics.serialized_result_bytes,
            agg_metrics.serialized_result_bytes,
        )

    def test_fingerprint_normalization_literal_traces(self) -> None:
        """Verify fingerprint normalizer collapses literals across IDs, tenants, and IN-lists."""
        # 1. String literal normalization across tenants
        q_tenant_a = "SELECT id FROM parents WHERE tenant_id = 'tenant-a' ORDER BY id"
        q_tenant_b = "SELECT id FROM parents WHERE tenant_id = 'tenant-b' ORDER BY id"
        self.assertEqual(normalize_fingerprint(q_tenant_a), normalize_fingerprint(q_tenant_b))
        self.assertEqual(normalize_fingerprint(q_tenant_a), "SELECT id FROM parents WHERE tenant_id = ? ORDER BY id")

        # 2. Numeric literal normalization across distinct IDs
        q_id_1 = "SELECT id FROM children WHERE parent_id = 1 ORDER BY id"
        q_id_42 = "SELECT id FROM children WHERE parent_id = 42 ORDER BY id"
        self.assertEqual(normalize_fingerprint(q_id_1), normalize_fingerprint(q_id_42))
        self.assertEqual(normalize_fingerprint(q_id_1), "SELECT id FROM children WHERE parent_id = ? ORDER BY id")

        # 3. IN list normalization across varying sizes and literals
        q_in_literals = "SELECT id FROM children WHERE parent_id IN (1, 2, 3, 4, 5)"
        q_in_params = "SELECT id FROM children WHERE parent_id IN (?, ?, ?)"
        q_in_other = "SELECT id FROM children WHERE parent_id IN (10, 20)"
        self.assertEqual(normalize_fingerprint(q_in_literals), "SELECT id FROM children WHERE parent_id IN (?)")
        self.assertEqual(normalize_fingerprint(q_in_params), "SELECT id FROM children WHERE parent_id IN (?)")
        self.assertEqual(normalize_fingerprint(q_in_other), "SELECT id FROM children WHERE parent_id IN (?)")

        # 4. Real SQLite trace execution: baseline with 10 parents emits 11 queries, exactly 2 stable fingerprints
        _, base_metrics = load_baseline(self.db, PRIMARY_TENANT, limit=10, offset=0)
        self.assertEqual(base_metrics.select_count, 11)  # Retains true query count
        self.assertEqual(len(base_metrics.select_fingerprints), 2)  # Stable fingerprints: parents query + child query

        # 5. Real SQLite trace execution: candidate with 10 parents emits 2 queries, exactly 2 stable fingerprints
        _, cand_metrics = load_candidate(self.db, PRIMARY_TENANT, limit=10, offset=0)
        self.assertEqual(cand_metrics.select_count, 2)
        self.assertEqual(len(cand_metrics.select_fingerprints), 2)

        # 6. Literal-expanded traces from two tenants differ in raw SQL yet normalize to identical fingerprints
        _, traces_a = load_baseline(self.db, PRIMARY_TENANT, limit=10, offset=0)
        _, traces_b = load_baseline(self.db, SECONDARY_TENANT, limit=10, offset=0)
        self.assertNotEqual(traces_a.raw_queries, traces_b.raw_queries)
        self.assertEqual(traces_a.select_count, traces_b.select_count)
        self.assertEqual(traces_a.select_fingerprints, traces_b.select_fingerprints)

    def test_fixture_boundary_parameter_validation(self) -> None:
        """Verify enforcement of named 50-key cap, non-negative offsets, and positive batch sizes."""
        # 1. Direct validation helper
        with self.assertRaises(ValueError):
            validate_fixture_parameters(limit=60, offset=0)  # Exceeds 50 cap
        with self.assertRaises(ValueError):
            validate_fixture_parameters(limit=-1, offset=0)  # Negative limit
        with self.assertRaises(ValueError):
            validate_fixture_parameters(limit=10, offset=-5)  # Negative offset
        with self.assertRaises(ValueError):
            validate_fixture_parameters(limit=10, offset=0, batch_size=0)  # 0 batch_size
        with self.assertRaises(ValueError):
            validate_fixture_parameters(limit=10, offset=0, batch_size=60)  # Exceeds 50 cap
        with self.assertRaises(ValueError):
            validate_fixture_parameters(limit=10, offset=0, batch_size=-1)  # Negative batch_size

        # 2. Candidate loader enforces validation
        with self.assertRaises(ValueError):
            load_candidate(self.db, PRIMARY_TENANT, limit=51, offset=0)
        with self.assertRaises(ValueError):
            load_candidate(self.db, PRIMARY_TENANT, limit=10, offset=-1)
        with self.assertRaises(ValueError):
            load_candidate(self.db, PRIMARY_TENANT, limit=10, offset=0, batch_size=60)

        # 3. Baseline loader enforces validation
        with self.assertRaises(ValueError):
            load_baseline(self.db, PRIMARY_TENANT, limit=51, offset=0)

        # 4. run_scenario handles unsupported configuration by reporting failed invariant rather than crashing
        obs, failures = run_scenario(
            self.db,
            "Test_Invalid_Batch",
            PRIMARY_TENANT,
            limit=10,
            offset=0,
            batch_size=60,
        )
        self.assertFalse(obs.candidate_meets_bound)
        self.assertGreater(len(failures), 0)
        self.assertIn("unsupported configuration", failures[0])

    def test_counterexample_detects_invariant_violation(self) -> None:
        """Verify that run_scenario reports failures when results or query bounds are violated."""
        with patch("nplus1_smoke.load_candidate") as mock_cand:
            from nplus1_smoke import ReadMetrics
            mock_cand.return_value = (
                [{"id": 999, "name": "corrupt", "created_at": "none", "children": []}],
                ReadMetrics(
                    select_count=5,
                    select_fingerprints=["SELECT corrupt"],
                    parents_returned=1,
                    children_returned=0,
                    serialized_result_bytes=50,
                    elapsed_ms=1.0,
                ),
            )
            obs, failures = run_scenario(self.db, "Test_Broken", PRIMARY_TENANT, limit=10, offset=0)
            self.assertFalse(obs.oracle_match)
            self.assertFalse(obs.candidate_meets_bound)
            self.assertGreater(len(failures), 0)

    def test_full_runner_and_cli_exit_zero(self) -> None:
        """Verify that the full runner passes all invariants and main() returns 0."""
        report = run_all_scenarios()
        self.assertEqual(report["status"], "pass")
        self.assertEqual(report["failed_invariants"], [])
        # 9 base scenarios (incl. exhausted and zero-limit pages) + 2 aggregate controls
        self.assertEqual(len(report["observations"]), 11)

        exhausted = next(
            o for o in report["observations"] if o["scenario_id"] == "Exhausted_Page"
        )
        self.assertEqual(exhausted["limit"], 10)
        self.assertEqual(exhausted["offset"], 1000)
        self.assertEqual(exhausted["candidate_select_count"], 1)
        self.assertEqual(exhausted["parents_returned"], 0)
        self.assertEqual(exhausted["children_returned"], 0)

        # Test CLI main invocation
        with patch("sys.stdout", new_callable=io.StringIO) as mock_stdout:
            exit_code = main(["--json"])
            self.assertEqual(exit_code, 0)
            output = mock_stdout.getvalue()
            parsed = json.loads(output)
            self.assertEqual(parsed["status"], "pass")


if __name__ == "__main__":
    unittest.main()
