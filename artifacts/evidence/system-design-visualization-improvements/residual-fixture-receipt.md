# Residual fixture receipt — Task 4 (AC-09)

- Status: completed
- Task: 4 — Real scoped N+1 fixture
- Project: Personal agent-skills-standard prj_24334e6778b1395c
- Workspace: /Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/zealous-flamingo
- Base revision: 52671cf9ed6a1c376dfaaae7e621dbc51a4c8765
- Route: implementation route 2 (Personal - DeepSeek), single residual slice after original owner 0e0f6686 froze
- SRS trace: LLD-004, SRS-009; PRD trace: AC-09

## Files frozen (only these authored/edited by this slice)

- skills/database/database-query-performance/scripts/nplus1_smoke.py
- skills/database/database-query-performance/scripts/test_nplus1_smoke.py
- artifacts/runs/system-design-visualization-improvements/residual-fixture-receipt.md (this receipt)

No other implementation or docs paths touched; worker-4-receipt.md left as-is.

## Corrections against the independent review (review-52671cf9e-workspace-364fe789a8f2-0430c0779591.diff)

1. MINOR — CLI `controls_verified` claims now backed by execution.
   - `run_all_scenarios()` now executes both controls before listing them:
     - Fingerprint normalization: real SQLite trace runs for tenant-a and tenant-b baselines; asserts 11 raw SELECTs collapse to exactly 2 stable fingerprints and that the two tenants' literal-expanded traces normalize to identical fingerprint sets.
     - Fixture bounds: four invalid configurations (limit 51, offset -1, batch_size 0, batch_size 51) must each raise `ValueError`; a mismatch appends a failed invariant.
   - Consequences: a control regression now makes the CLI exit 1 instead of printing an unfounded label.
   - Label-only test assertions removed from `test_full_runner_and_cli_exit_zero`; replaced with receipt-field behavior assertions (Exhausted_Page: limit 10, offset 1000, 1 SELECT, 0 parents, 0 children).
   - Behavior proof for the same controls stays in `test_fingerprint_normalization_literal_traces` (new cross-tenant trace check asserts raw queries differ but fingerprints match) and `test_fixture_boundary_parameter_validation`.

2. MINOR — arbitrary serialization thresholds removed.
   - Deleted `> 15000`, `< 150`, and `* 100` assertions.
   - Kept/replaced with: independent oracle equality, 1-SELECT aggregate count, `children_returned == 0` for aggregate, 250-child relation cardinality, `serialized_result_bytes` equal to `len(json.dumps(results, sort_keys=True).encode("utf-8"))` for both relation and aggregate results, and a direct relation-bytes > aggregate-bytes comparison with no invented ratio.

3. Restored positive-limit exhausted page.
   - Scenario list now carries `Exhausted_Page` (PRIMARY_TENANT, limit 10, offset 1000) alongside the retained `Zero_Limit_Page` (limit 0, offset 0).
   - Cross-scenario invariants assert 1 SELECT, 0 parents, 0 children, oracle match for `Exhausted_Page`, and 1 SELECT / 0 parents / 0 children for `Zero_Limit_Page`.
   - Test renamed to `test_exhausted_and_zero_limit_page_behavior`; covers candidate and baseline for the exhausted page plus the zero-limit boundary.

## Preserved (unchanged semantics)

- High-fanout parent 60 with 250 children; relation-list vs aggregate projection distinction.
- Literal/placeholder fingerprint normalization with real SQLite trace tests.
- Fixture parameter cap validation (limit 0..50, offset >= 0, batch 1..50) at helper, loader and scenario boundaries.
- Failed-invariant receipt path (`run_scenario` reports unsupported configuration and mock counterexample instead of crashing).
- Independent oracle (no SQLite, no baseline reuse) for parents and aggregates.
- Page/scope controls: continuation pagination disjointness and tenant-b isolation with overlapping IDs 1..20.
- Baseline 1+N vs candidate bounded 2-SELECT counts for N=1/10/50.

## AC-09 impact

- Positive evidence: N=1/10/50 baseline 1+N vs candidate 2 SELECTs; empty relations (parents with 0 children); one-page non-empty relation; exhausted positive-limit page and zero-limit page at 1 SELECT; parent pagination and tenant scope preserved.
- Negative controls: baseline output is not the sole oracle; no cross-scope cache; no fabricated wire bytes (bytes are measured from the actual serialized result); no service startup, ORM or Postgres speed claims; no silent partial success (failures are reported per scenario).
- CLI `controls_verified` entries now correspond one-to-one with checks executed inside `run_all_scenarios()`.

## Verification performed by this slice (single post-freeze run)

- `cd skills/database/database-query-performance/scripts && python3 test_nplus1_smoke.py -v` → 12 tests, OK, 0.027s.
- `cd skills/database/database-query-performance/scripts && python3 nplus1_smoke.py --json` → exit 0, `status: pass`, `failed_invariants: []`, 11 observations (N1, N10, N50, Pagination_Page1, Pagination_Page2, Exhausted_Page, Zero_Limit_Page, Cross_Scope_TenantB, High_Fanout_Parent_Relation, Aggregate_Projection_Control, High_Fanout_Parent_Aggregate).
- Exhausted_Page observation: 1 SELECT, 0 parents, 0 children. Zero_Limit_Page observation: 1 SELECT, 0 parents, 0 children.

## Parent-run expectations and limits

- Expected parent command: `python3 skills/database/database-query-performance/scripts/test_nplus1_smoke.py -v` and `python3 skills/database/database-query-performance/scripts/nplus1_smoke.py --json`; expect `Ran 12 tests ... OK` and CLI exit 0 with `status: pass`.
- Advisory limits: `correction_attempts: 1` used by prior owner; authoritative verification remains with parent and independent review.
- NOT RUN (unavailable/out of scope for this slice): no build/lint/formatter run, no native or live model eval, no service startup, no Postgres/ORM benchmark, no publication, no commits.
