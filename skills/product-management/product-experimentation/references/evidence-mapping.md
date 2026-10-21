# Experimentation Evidence Mapping

## Priority: P1 (HIGH)

This document defines the normative mapping between product experimentation activities and canonical ledger records in `docs/product/<slug>/evidence.json` under t01-v2 (§2.3).

---

## 1. Normative Record Payloads

Every ledger root uses the frozen t01-v2 envelope, including `schema_version`, initiative identity/revision, `synthetic`, `updated_at`, strategy authority/gap, current `authorities`, `authority_history`, current `records`, `record_history`, `bridges`, and `product_state`. Each record has `id`, `kind`, `revision`, `owner`, `scope: {segment, geography, window:{start,end}}`, `depends_on`, `freshness: {status,rationale,reviewed_at,expires_at,review_triggers}`, optional `extensions`, and exactly one typed `data` payload. There is no top-level `status` or `updated_at` on a record. Scope endpoints are UTC instants. Exact revision pairs resolve across current/history arrays; archived rows are full immutable snapshots, never invented partial deltas.
### `HYP` (Hypothesis)
- `opportunity`: OPP Ref `{ id: string, revision: string }`.
- `prediction`: Nonempty string stating expected observable outcome.
- `mechanism`: Nonempty string explaining causal mechanism.
- `claims`: Array of CLM refs `[{ id: string, revision: string }]`.
- `primary_metric`: MET Ref `{ id: string, revision: string }` or `null`.
- `disconfirmation`: Nonempty string defining unambiguous disconfirmation criteria.
- `status`: `"proposed" | "testing" | "supported" | "refuted" | "inconclusive"`.

### `EXP` (Experiment Specification)
- `hypothesis`: HYP Ref `{ id: string, revision: string }`.
- `method`: Nonempty string (e.g., `"a_b_test" | "prototype_user_test" | "painted_door"`).
- `eligibility`: Nonempty string defining user qualification criteria.
- `sample_plan`: Nonempty string describing randomization or cohort selection.
- `primary_metric`: MET Ref `{ id: string, revision: string }`.
- `guardrails`: Array of MET refs `[{ id: string, revision: string }]`.
- `rules`: Object `{ success: string, failure: string, inconclusive: string }`.
- `bounds`: Object:
  - `starts_at`: UTC ISO timestamp string.
  - `ends_at`: UTC ISO timestamp string (`starts_at < ends_at`).
  - `budget_cap`: Unsigned decimal string or `null`.
  - `currency`: 3 uppercase ASCII letters or `null` (null iff budget_cap is null).
  - `exposure_cap`: Finite safe integer ($\ge 0$) or `null`.
  - `stop_rules`: Nonempty array of explicit stop trigger strings.
- `authorization`: DEC Ref `{ id: string, revision: string }` or `null`.
- `status`: `"proposed" | "authorized" | "running" | "completed" | "stopped"`.
- `result`: Object `{ classification: "supported" | "refuted" | "inconclusive", sources: [{ id: string, revision: string }], limitations: string[] }` or `null`. (Proposed experiments must have `result: null`; completed must have classification and $\ge 1$ SRC ref).

### `MET` (Metric Measurement)
- `definition`: Nonempty string.
- `unit`: Nonempty string.
- `denominator`: Nonempty string.
- `query`: SRC Ref `{ id: string, revision: string }` or `null`.
- `query_revision`: String or `null` (must equal query origin revision).
 - `baseline`: Object `{ value: string, source: Ref, window: { start: UTC instant, end: UTC instant } }` or `null`.
 - `baseline_exception`: DEC Ref or `null`.
 - `comparison_window`: Object `{ start: UTC instant, end: UTC instant }`.
- `eligibility`: Nonempty string.
- `target`: Nonempty string.
- `guardrail`: Nonempty string.
- `measurement_owner`: Nonempty string.
- `review_trigger`: Nonempty string.
- `status`: `"planned" | "instrumented" | "observed" | "unavailable"`.

### `DEC` (Decision Record)
- `purpose`: `"learning" | "experiment" | "investment" | "specification" | "uat" | "release" | "retirement" | "value_review"`.
- `status`: `"proposed" | "recorded" | "superseded" | "revoked"`.
- `outcome`: `"propose" | "authorize" | "reject" | "defer" | "risk_accept" | "scale" | "iterate" | "stop" | "inconclusive"`. (Note: `"pivot"` is NOT an outcome; pivot rationale is expressed with outcome `"iterate"` or `"propose"`).
DEC purpose/outcome enums are closed cross-field combinations, not independent choices: `authorize` is limited to learning/experiment/investment/specification/uat/release/retirement; `scale`, `iterate`, `stop`, and `inconclusive` are limited to `value_review`; `risk_accept` is limited to investment/release. In particular, `purpose: "experiment", outcome: "stop"` is forbidden. A value-review stop requires its recorded strategy/authority/artifact proof; without that proof, keep the recommendation proposed and name the gap.
- `consumes`: Array of Refs excluding SRC and DEC.
- `critical_claims`: Array of CLM refs.
- `authority_id`: String (`AUTH-...`) or `null`.
- `authority_revision`: String or `null`.
- `strategy_binding`: Object `{ authority_id: string, revision: string }` or `null`.
- `artifact_bindings`: Array of `{ path: string, sha256: string }`.
- `decided_at`: UTC ISO timestamp string or `null`.
- `rationale`: Nonempty string.
- `uncertainties`: Array of strings.
- `revisit_triggers`: Nonempty array of strings.
- `supersedes`: DEC Ref `{ id: string, revision: string }` or `null`.

---

## 2. Immutable Ledger Invariants and Lifecycle Evolution

1. **History and exact identity**:
   - Current rows have one row per stable ID; archived rows retain complete previous same-ID revisions. Exact `(id, revision)` pairs are unique across current/history and never retarget to current.
   - Recorded DEC rows are immutable and remain current. A successor is a new DEC ID referencing `supersedes: {id, revision}`; never edit or move the recorded row to history.
2. **Frozen plan versus results**:
   - Bind the authorization to a separately retained, SHA-256-bound plan artifact. Do not bind a hash of a ledger document that evolves with results.
   - Compare exact frozen EXP/HYP/MET plan projections, including `depends_on`; material plan changes require a new EXP revision and a newly recorded authorization DEC with a new ID.
   - Record observations as current observed MET and SRC rows, including each primary and guardrail query/baseline support. Completed EXP results reference every supporting SRC. Link the result and metrics into the advisory INV via its exact references and dependencies.
   - Historical plan and authorization remain visible and unchanged. A ledger decision never authorizes host traffic, spend, or production mutation.

## 3. Synthetic lifecycle example

`synthetic-plan-v2.md` is the separately retained fictional, non-actionable plan bound by unchanged DEC-003; `synthetic-plan-v1.md` and DEC-001 remain unchanged in recorded lineage. The accompanying `synthetic-lifecycle.json` retains the complete former EXP-001/r1 and the distinct EXP-001/plan1 snapshot while keeping EXP-001/r2 current and linked to DEC-004 and current AUTH-002, whose receipt-v2 binds the new authorization artifact. AUTH-001 remains current for the unchanged historical DEC-001/DEC-003 references; those former approvals are retained history, not re-approved. The INV proposal continues to link the exact completed EXP, primary/guardrail MET snapshots, and their result SRC records. This fictional example does not assert real human consent, authorization, source truth, or experiment execution. All source values and results are fabricated; do not reuse them as product evidence.

---

