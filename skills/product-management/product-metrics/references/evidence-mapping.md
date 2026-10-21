# Evidence Mapping: Product Metrics & Value Review

## 1. Non-Actionability & Synthetic Disclaimer

> [!IMPORTANT]
> All schema snippets, identifiers, and records below are **explicitly synthetic and proposal-only illustrations**. They do NOT represent real customer observations, verified production metrics, executive approvals, or operational authority. They cannot be executed autonomously and grant no permission to spend budget, deploy software, alter traffic, or retire production systems.

---

## 2. Ledger Schema: Measurement (`MET`) Records

A `MET` record establishes a verifiable measurement contract within `docs/product/<slug>/evidence.json`.

```json
{
  "id": "MET-001",
  "kind": "MET",
  "revision": "r1",
  "owner": "synthetic-analytics-lead@example.com",
  "scope": {
    "segment": "Synthetic SMB Cohort",
    "geography": "Test-Region",
    "window": {
      "start": "2026-11-01T00:00:00Z",
      "end": "2026-12-01T00:00:00Z"
    }
  },
  "depends_on": [
    { "id": "SRC-001", "revision": "r1" },
    { "id": "SRC-002", "revision": "r1" }
  ],
  "freshness": {
    "status": "current",
    "rationale": "Synthetic instrumentation verified in staging and baseline extracted",
    "reviewed_at": "2026-10-15T12:00:00Z",
    "expires_at": "2026-12-31T23:59:59Z",
    "review_triggers": ["schema change", "comparison window concludes"]
  },
  "data": {
    "definition": "Synthetic checkout completion duration from cart view to confirmation",
    "unit": "seconds",
    "denominator": "all eligible synthetic checkout attempts initiated within comparison window",
    "query": { "id": "SRC-001", "revision": "r1" },
    "query_revision": "v1.2.0",
    "baseline": {
      "value": "84.5",
      "source": { "id": "SRC-002", "revision": "r1" },
      "window": {
        "start": "2026-09-01T00:00:00Z",
        "end": "2026-10-01T00:00:00Z"
      }
    },
    "baseline_exception": null,
    "comparison_window": {
      "start": "2026-11-01T00:00:00Z",
      "end": "2026-12-01T00:00:00Z"
    },
    "eligibility": "Fictional authenticated test accounts in Test-Region",
    "target": "Synthetic duration <= 50.0 seconds",
    "guardrail": "Synthetic gateway error rate must not exceed 0.5%",
    "measurement_owner": "Fictional Measurement Owner",
    "review_trigger": "Comparison window completion or error rate > 0.5%",
    "status": "instrumented"
  }
}
```

### Validation Rules for `MET`

- **Identifier Grammar**: `id` matches `^MET-[0-9]{3,}$`.
- **Closed Status Enum**: `MET.data.status` admits ONLY:
  `planned | instrumented | observed | unavailable`
  *Rule*: `immature` is NOT an admissible status. Immature observation windows must be recorded as `unavailable` with maturity limitations documented in source/rationale context.
- **Query & Revision Alignment**: If `query` is non-null, `query_revision` must match the exact origin revision of the referenced `SRC`.
- **Baseline Window Ordering**: $\text{baseline.window.end} \le \text{comparison\_window.start}$.
- **Release Gate XOR Rule**: At the release action gate, `baseline XOR baseline_exception` is strictly required. `planned` status may have neither; release readiness requires exactly one.
- **Baseline Exception Helper Contract**:
  - `baseline_exception` must reference an exact, current, non-retired recorded `DEC` record:
    - `purpose == "release"`
    - `outcome == "risk_accept"`
    - Must match the consuming `MET` scope and revision.
    - Must consume the exact `MET` in `consumes` and list it in `depends_on`.
    - Must bind valid current authorization authority (`AUTH`) and readable artifact bindings.
  - Helper release DECs referenced exclusively as a MET `baseline_exception` are excluded from normal release decision selection to prevent candidate ambiguity.
  - Waives baseline ONLY on that exact MET; never waives query definition, denominator, or guardrails.

---

## 3. Ledger Schema: Product Value Review (`REV`) Records

A `REV` record captures the post-release analysis of realized outcomes and costs.

```json
{
  "id": "REV-001",
  "kind": "REV",
  "revision": "r1",
  "owner": "synthetic-product-lead@example.com",
  "scope": {
    "segment": "Synthetic SMB Cohort",
    "geography": "Test-Region",
    "window": {
      "start": "2026-11-01T00:00:00Z",
      "end": "2026-12-01T00:00:00Z"
    }
  },
  "depends_on": [
    { "id": "HYP-001", "revision": "r1" },
    { "id": "MET-001", "revision": "r1" },
    { "id": "SRC-003", "revision": "r1" },
    { "id": "SRC-004", "revision": "r1" }
  ],
  "freshness": {
    "status": "current",
    "rationale": "Synthetic post-release review completed post comparison window",
    "reviewed_at": "2026-12-05T10:00:00Z",
    "expires_at": "2027-06-01T00:00:00Z",
    "review_triggers": ["annual business review"]
  },
  "data": {
    "decision": { "id": "DEC-002", "revision": "r1" },
    "hypotheses": [{ "id": "HYP-001", "revision": "r1" }],
    "metrics": [{ "id": "MET-001", "revision": "r1" }],
    "observations": [{ "id": "SRC-003", "revision": "r1" }],
    "actual_costs": [{ "id": "SRC-004", "revision": "r1" }],
    "attribution": {
      "classification": "unknown",
      "rationale": "Illustrative trial; concurrent promotional campaign prevents causal isolation",
      "confounders": ["Synthetic holiday marketing campaign running concurrently"]
    },
    "recommendation": "inconclusive",
    "limitations": ["Evaluated only on synthetic SMB cohort; enterprise tiers untested"],
    "reviewed_at": "2026-12-05T10:00:00Z"
  }
}
```

### Validation Rules for `REV`

- **Identifier Grammar**: `id` matches `^REV-[0-9]{3,}$`.
- **Closed Schema Fields**: `REV` has NO `status` or `completed` field. Admissible states are managed strictly through:
  - `recommendation`: `scale | iterate | stop | inconclusive`
  - `attribution.classification`: `causal_supported | descriptive | unknown`
- **Historical Attribution vs. Current Authority**:
  - `data.decision` points to the historical investment `DEC`. This reference provides **historical attribution only** (can be retired or obsolete); it grants NO present authority to scale, iterate, stop, or spend.
  - A new value review decision requires formulating a distinct recorded `DEC` record (`purpose: "value_review"`), binding current strategic authority (`strategy_binding`), current authorization (`authority_id`), and readable artifact bindings.
- **DAG Provenance**: All non-DEC evidence (`hypotheses`, `metrics`, `observations`, `actual_costs`) must appear in `depends_on`.
- **Scale / Causal Criteria**: Recommending `scale` or asserting `causal_supported` requires metrics with `observed` status, non-empty `observations`, and explicit accounting of `actual_costs`.
- **Delivery Status Separation**: When a post-release value review concludes with `recommendation = "inconclusive"`, engineering delivery status remains `released`. Product discovery uncertainty does NOT unrelease delivery.

---

## 4. Graph Relations, Influence Roles, and Immutable History

Under the normative contract (`t01-v2` §2.6), the ledger maintains three separate relations:

### 1. Structural Resolution
Every pointer resolves across the disjoint union of current rows (`records`, `authorities`) and historical full snapshots (`record_history`, `authority_history`) at exact `(id, revision)` pairs.

### 2. Provenance DAG (`depends_on`)
Strictly acyclic directed graph of historical data origin.

### 3. Influence Relation & Roles
Evaluated by a visited `(pair, role)` worklist across three distinct roles:
- **`evidence` role**: Followed for MET queries, baseline sources, and REV support. Consumed pairs must be current (`OBSOLETE_BINDING` if old), freshness must be current (`STALE_EVIDENCE` or `DISPUTED_EVIDENCE` if stale/disputed), and sources accessible (`EVIDENCE_UNAVAILABLE` if unavailable).
- **`exception` role**: Followed when traversing `baseline_exception`. Evaluates the exception decision (`DEC`) and its support, but suspends the baseline requirement on the exact referenced MET. The descriptive cycle (`MET -> baseline_exception DEC -> MET`) terminates safely at the visited `(pair, role)` entry without cutting query, guardrail, or other source edges.
- **`plan` role**: Used when evaluating experiment plans, ensuring frozen plan projections compare equal without lifecycle deadlock.

### Immutable History & Affected Decisions
- **Immutable Recorded Decisions**: Recorded DECs are immutable. Amendments, revocations, or supersessions must use a new DEC ID with `supersedes: {id: old_id, revision: old_rev}`. Never mutate an existing recorded row.
- **Revisable Records**: Updating any record field requires first archiving its complete prior snapshot into `record_history` at exact `(id, revision)` before creating the new current row.
- **Scoped Invalidation**: Obsolete bindings or changed hashes flag only non-retired recorded decisions reached by influence in `affected_decisions`. Retired historical DECs are excluded from `affected_decisions`.
