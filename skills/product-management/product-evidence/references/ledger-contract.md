# Product Evidence Ledger Contract (JSON v1)

## 1. Overview and Operational Purpose

The canonical product evidence ledger lives at `docs/product/<slug>/evidence.json`. It provides a deterministic, machine-checkable data structure for recording initiative evidence, claims, opportunities, hypotheses, experiments, investments, decisions, metrics, and retrospective reviews.

> [!IMPORTANT]
> **Limitations and Boundary Disclaimers**:
> 1. `source_truth_not_verified`: The validator inspects ledger consistency and file hashes, but cannot authenticate external real-world factual claims or source veracity.
> 2. `human_authorization_not_authenticated`: Attribution in JSON records is documentation, not cryptographic identity or host-level permission.
> 3. `historical_payloads_not_authenticated`: Retained prior snapshots in history arrays are verified for internal consistency, but cannot certify that historical bytes were not edited in past commits.

## 2. Root Fields and Envelope

| Field | Type | Description |
| --- | --- | --- |
| `schema_version` | integer | Fixed literal `1`. Unsupported versions reject with `UNSUPPORTED_VERSION` and exit code 2. |
| `slug` | string | Initiative slug matching `^[a-z0-9]+(?:-[a-z0-9]+)*$`, max length 40. |
| `product_id` | string | Independent product identifier, same grammar, max length 64. |
| `revision` | string | Ledger document revision matching `^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$`. |
| `synthetic` | boolean | True for test/training examples. Disallows action gates (`SYNTHETIC_EVIDENCE`). |
| `updated_at` | string | UTC instant `YYYY-MM-DDTHH:mm:ssZ`. Cannot be in the future relative to `asOf`. |
| `strategy_authority` | string \| null | Authority ID (`^AUTH-[0-9]{3,}$`) or null. When non-null, `strategy_gap` must be null. |
| `strategy_gap` | string \| null | Non-empty string when `strategy_authority` is null; null otherwise. |
| `authorities` | array | Current Authority objects. Unique IDs, unique `(id, revision)` pairs across history. |
| `authority_history` | array | Retained prior Authority snapshots. Every archived ID must exist in current authorities. |
| `records` | array | Current Record objects across the 9 kinds. Unique IDs, unique `(id, revision)` pairs. |
| `record_history` | array | Retained prior Record snapshots. Every archived ID must exist in current records. |
| `bridges` | array | Delivery Bridge objects mapping records to declared authority IDs. |
| `product_state` | object | State machine snapshot and transition history. |
| `extensions` | object | Optional vendor namespaced properties (`vendor.name`). If present, must be an object (not null). |

## 3. Nine Record Kinds and Discriminators

Every record requires: `id`, `kind`, `revision`, `owner`, `scope`, `depends_on`, `freshness`, and kind-specific `data`.

1. **SRC (Source)**:
   - `locator`: `{kind: "local", path, sha256}` or `{kind: "external", uri, snapshot_sha256}`.
   - `origin`: `{publisher, origin_id, classification, revision, observed_at, scope}`. `scope` is a full Scope object (`{segment, geography, window}`).
   - `privacy`: `{classification: "public"|"internal"|"restricted", redaction: "none"|"redacted"|"pointer_only", access: "available"|"protected"|"unavailable"}`.
   - `license`: `{identifier, usage: "citation_only"|"reuse_permitted"|"unresolved", restrictions: string[]}`.
   - `status`: `"available" | "unavailable" | "withdrawn"`.
   - `limitations`: string array.
2. **CLM (Claim)**:
   - `statement`, `classification` (`confirmed|inference|assumption|unknown`), `sources` (SRC Ref array), `counterevidence` (SRC/CLM Ref array), `rationale`, `uncertainty`, `status` (`supported|unresolved|refuted|disputed`), `critical` (boolean).
   - `sources` must be a subset of `depends_on`. Confirmed requires >= 1 source; inference requires >= 1 source and rationale; supported cannot be unknown or assumption.
3. **OPP (Opportunity)**:
   - `problem`, `customer_job`, `claims` (CLM Ref array, in `depends_on`), `substitutes` (non-empty string array), `alternatives` (non-empty string array), `status` (`candidate|selected|deferred|rejected`), `rationale`.
4. **HYP (Hypothesis)**:
   - `opportunity` (OPP Ref, in `depends_on`), `prediction`, `mechanism`, `claims` (CLM Ref array, in `depends_on`), `primary_metric` (MET Ref or null), `disconfirmation`, `status` (`proposed|testing|supported|refuted|inconclusive`).
5. **EXP (Experiment)**:
   - `hypothesis` (HYP Ref, in `depends_on`), `method`, `eligibility`, `sample_plan`, `primary_metric` (MET Ref), `guardrails` (MET Ref array), `rules: {success, failure, inconclusive}`, `bounds: {starts_at, ends_at, budget_cap, currency, exposure_cap, stop_rules}`, `authorization` (DEC Ref or null), `status` (`proposed|authorized|running|completed|stopped`), `result` (`{classification, sources: SRC Ref[], limitations}` or null).
6. **INV (Investment)**:
   - `alternatives` (non-empty `{name, rationale}` array), `claims` (CLM Ref array, in `depends_on`), `financial_input` (`{path, sha256}` or null), `financial_result` (`{path, sha256}` or null), `nonmonetary` (string array), `status` (`proposal|reviewed|deferred|rejected`), `accounting_rationale`.
7. **DEC (Decision)**:
   - `purpose` (`learning|experiment|investment|specification|uat|release|retirement|value_review`), `status` (`proposed|recorded|superseded|revoked`), `outcome` (`propose|authorize|reject|defer|risk_accept|scale|iterate|stop|inconclusive`), `consumes` (Ref array excluding SRC/DEC), `critical_claims` (CLM Ref array), `authority_id` (AUTH or null), `authority_revision`, `strategy_binding` (`{authority_id, revision}` or null), `artifact_bindings` (`{path, sha256}` array), `decided_at` (UTC instant or null), `rationale`, `uncertainties`, `revisit_triggers`, `supersedes` (DEC Ref or null).
   - Once recorded, the complete DEC row is immutable. Replacement requires a new DEC ID.
8. **MET (Metric)**:
   - `definition`, `unit`, `denominator`, `query` (SRC Ref or null), `query_revision` (string or null), `baseline` (`{value, source: SRC Ref, window}` or null), `baseline_exception` (DEC Ref or null), `comparison_window`, `eligibility`, `target`, `guardrail`, `measurement_owner`, `review_trigger`, `status` (`planned|instrumented|observed|unavailable`).
   - Observed/instrumented require query and query_revision matching the exact source-origin revision; query_revision is a nonblank opaque publisher token, not the internal record revision grammar.
9. **REV (Value Review)**:
   - `decision` (DEC investment Ref), `hypotheses` (HYP Ref array), `metrics` (MET Ref array), `observations` (SRC Ref array), `actual_costs` (SRC Ref array), `attribution` (`{classification: "descriptive"|"causal_supported"|"unknown", rationale, confounders}`), `recommendation` (`scale|iterate|stop|inconclusive`), `limitations`, `reviewed_at`.

## 3.1 Shared Constraints and Decision Outcomes

- Every object is closed: unknown properties are errors except bounded JSON values under namespaced `extensions`. Required arrays and strings are not silently defaulted. Ref arrays, ID arrays, and enumerated string sets are unique.
- A `Ref` is exactly `{id, revision}` and resolves only against one exact current or retained historical pair. References never bind to the newest row implicitly. Required `depends_on` entries must repeat the exact pair used in the corresponding payload field.
- Scope is `{segment, geography, window:{start,end}}`; windows are valid UTC instants with `start < end`. All record and authority scopes are compared as complete values. Future timestamps are invalid; `SRC.origin.observed_at <= data.retrieved_at`.
- Strings must be non-empty after trimming. Integer caps are non-negative safe integers. EXP `budget_cap` is a decimal string in major currency units with at most four fractional digits; its exact minor-unit value must fit `Number.MAX_SAFE_INTEGER`. `currency` is null exactly when budget is null. Null caps are allowed in a plan, never for an experiment authorized to run or completed.
- Recorded, superseded, and revoked DEC rows require valid `decided_at` and non-empty artifact bindings; only the proposed lifecycle may have a null `decided_at`. `authority_id` and `authority_revision` are a structural nullable pair. An action proof that needs authority requires a current available authority with the exact pair, domain, and scope. Purpose/outcome combinations are constrained: `authorize` is permitted only for learning, experiment, investment, specification, UAT, release, and retirement; `risk_accept` only for investment or release; `scale|iterate|stop|inconclusive` only for value review.
- `status:"proposed"` is not authority and does not have to use only `outcome:"propose"`; it must not encode an action outcome (`authorize`, `scale`, `stop`, or `risk_accept`). A proposal has `decided_at:null`. Experiment authorization is a current scoped recorded learning/experiment DEC with outcome `authorize` consuming the exact EXP plan. Finite dates, budget/currency, exposure, instrumented primary/guardrail metrics, and stop rules are required before host execution eligibility.
- MET `query` and `query_revision` are either both null or both present. When present, the nonblank opaque query revision must equal `SRC.data.origin.revision` at the exact referenced snapshot. A baseline source window must end no later than the metric comparison window starts. Plans may omit both baseline and exception; a release proof requires exactly one.
- REV `decision` must be an investment DEC. `scale` and `causal_supported` need observed metrics, source observations, and actual-cost evidence; they do not certify causality or return on investment.

## 3.2 State, Authority, and Gate Requirements

- State history is an ordered transition log with strictly increasing timestamps no later than `asOf`, continuous `from`/previous `to`, and allowed transitions: `unvalidated→validating|not_applicable`; `validating→validated_for_scope|invalidated|inconclusive`; `validated_for_scope→validating|invalidated|inconclusive`; `invalidated|inconclusive→validating|not_applicable`; `not_applicable→unvalidated`. Without history, only `unvalidated` and `not_applicable` are valid. Governed transitions bind a recorded scoped DEC of the appropriate purpose; entering `validating` requires `authorize`, and entering `validated_for_scope` requires investment `authorize`, never `risk_accept`. Every current State HYP pair must be exact and current; plan-projection compatibility applies only to plan-role traversal, not State proof. A stale State pair's warning is coalesced only when the selected State DEC's evaluated proof reports that exact pair as a failing binding.
- `commit` selects only the exact current, scoped, non-retired investment decision in product state. `authorize` requires `validated_for_scope` and positive support: reviewed INV, selected OPP, each selected supported HYP linked to an exact completed supported EXP, plus current authority/artifacts and a business BRD-objective bridge. A `risk_accept` requires explicit uncertainty and rationale, cannot claim `validated_for_scope`, and does not require positive validation evidence solely to accept risk.
- `experiment` requires a current scoped recorded `authorize` decision consuming an exact or lifecycle-compatible retained EXP plan. If the current EXP revision advanced compatibly, the gate still checks its current scope, status, selected authorization, finite bounds, queried primary/guardrail metrics, and stop rules. Any material plan change invalidates the old authorization. Without a matching authorization it returns `proposal_only` and `AUTHORIZATION_REQUIRED`, never execution consent.
- `release` requires one unambiguous current scoped release `authorize` decision, current measurement/query support, critical claims, a current requirements-domain bridge declaring REQ/AC IDs, a recorded scoped UAT `authorize` dependency, and a current available authorization-domain authority. A baseline exception waives only the exact MET baseline source. Every reached helper must be a non-retired release `risk_accept` DEC with explicit non-empty uncertainty, rationale, an exact current consumed MET pair, and current query/source/guardrail/freshness/scope/authority/artifact proof. Lifecycle-compatible plan pairs do not waive exception currentness; query and guardrails remain required.
- Gate success means `eligible_for_host_check`, not permission to deploy, spend, contact users, or perform any other action. Humans and the host must authorize separately.

## 3.3 Trusted Root and Local Reads

- `authorityRoot` must be an existing absolute canonical directory, neither the filesystem root nor the user's home. Library `ledgerPath` must be absolute, contained, and an existing regular file. CLI ledger arguments may be relative; the CLI resolves them to an existing regular file under the same canonical root.
- Local authority, SRC, DEC artifact, and INV financial paths are POSIX-relative to that root, lexically contained, and read only when their current record is eligible. Protected, unavailable, withdrawn, pointer-only, and historical rows are opaque: validation performs no `lstat`, `stat`, open, or read for them. A missing selected DEC/INV artifact (`ENOENT`) is a scoped `EVIDENCE_UNAVAILABLE` proof gap; permission and other real read faults remain global `IO_ERROR`.
- Eligible files must be bounded regular files; symlinks and path escapes are rejected. Reads use no-follow descriptor checks and enforce file-size, distinct-file, and mutation bounds. External HTTPS/URN references are validated as identifiers only; the validator performs no network request. Dependency, influence, and supersession depth across the complete current-plus-history union is capped at 64; overflow returns global `LIMIT_EXCEEDED`, `valid:false`, CLI exit 2.

## 4. Public Library and CLI Output Envelope

The validator exports:
```javascript
export async function validateProductEvidence(value, { authorityRoot, ledgerPath, asOf, gate = "structural" })
```
It returns exclusively the public schema:
```json
{
  "schema_version": 1,
  "tool": "product-evidence-validator",
  "valid": true,
  "gate": "structural",
  "readiness": "not_assessed",
  "effective_product_state": "unvalidated",
  "affected_decisions": [],
  "issues": [],
  "limitations": [
    "source_truth_not_verified",
    "human_authorization_not_authenticated",
    "historical_payloads_not_authenticated"
  ]
}
```

### Exit Code Precedence

| Exit Code | Classification | Triggering Conditions |
| --- | --- | --- |
| **4** | `INTERNAL_ERROR` | Unexpected programmer or system execution fault. |
| **2** | Invocation / Limits / IO | `INVALID_ARGUMENT`, `INVALID_JSON`, `UNSUPPORTED_VERSION`, `IO_ERROR`, `UNSAFE_PATH`, `INPUT_CHANGED`, `LIMIT_EXCEEDED`. |
| **1** | Structural Error | Malformed schema, type errors, duplicate IDs/pairs, cycle, invalid transitions, bridge declaration mismatch, current hash mismatch (`valid: false`). |
| **3** | Action Gate Gaps | `SYNTHETIC_EVIDENCE`, `AUTHORIZATION_REQUIRED`, `DECISION_SELECTION_REQUIRED`, or proof issues with severity `gap` (`readiness: "blocked"` or `"proposal_only"`). |
| **0** | Success / Eligible | Structural gate valid (`readiness: "not_assessed"`) or Action gate eligible (`readiness: "eligible_for_host_check"`). |

Precedence is strictly enforced: `4 > 2 > 1 > 3 > 0`.

## 5. Storage Caps and Safety Bounds

- Single file size: `<= 1 MiB` (`1,048,576` bytes).
- Authorities total: `<= 100` (current + historical).
- Records total: `<= 2000` (current + historical).
- Reference occurrences total: `<= 10,000`.
- State transitions: `<= 128`.
- Distinct read files: `<= 256`.
- Graph traversal depth: `<= 64`.
