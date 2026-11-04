# Marketing Measurement Contract Reference

## 1. Scope & Purpose

This document specifies the exact offline calculation rules, denominator definitions, maturity boundaries, and reporting contracts for `marketing-measurement` (T02). It operationalizes requirements from PRD REQ-MKT-003, REQ-MKT-016, REQ-MKT-018 (AC-05 through AC-12, AC-28, AC-33, AC-34) and SRS-001 through SRS-006.

## 2. Cohort Definitions and Eligibility

- **Eligible Starters**: Distinct participants declared with `role: "external"` and `consent: "granted"`, having at least one `starter` report occurring within the campaign acquisition window $[T_{\text{acq\_start}}, T_{\text{acq\_end}})$, with $T_{\text{occurred}} \le T_{\text{cutoff}}$ and $T_{\text{reported}} \le T_{\text{as\_of}}$.
- **Excluded Participants**: Declared participants with `role !== "external"` or `consent !== "granted"`. Excluded rows do not contribute to any adoption counts or metrics.
- **Effective Occurrence Cutoff**:
  $$\text{effective\_cutoff} = \min(T_{\text{as\_of}}, T_{\text{cohort.coverage\_end}})$$
  Reports with $T_{\text{reported}} > T_{\text{as\_of}}$ or $T_{\text{occurred}} > \text{effective\_cutoff}$ do not contribute.

## 3. Activation & Maturity

- **Qualifying Activation**:
  - Participant must be an eligible external starter.
  - Earliest starter report must not follow the activation report.
  - Report has `kind: "activation"`, non-null `task_ref` pointing to an available source, and occurs in $[T_{\text{acq\_start}}, T_{\text{acq\_end}})$.
  - Earliest qualifying activation instant is $a$.
- **Maturity**:
  $$T_{\text{maturity}} = a + 14 \times 86400 \text{ seconds}$$
  - Mature iff $\text{effective\_cutoff} \ge T_{\text{maturity}}$.
  - Immature iff $\text{effective\_cutoff} < T_{\text{maturity}}$.
  - `activated = mature_activated + immature_activated`.

## 4. Repeat Use & Nonreturn Partition

Among mature activated participants:
- **Qualifying Repeat**:
  - Report has `kind: "repeat"`, non-null `task_ref`.
  - Window: $a < T_{\text{occurred}} \le a + 14\text{ days}$.
  - UTC calendar date of $T_{\text{occurred}}$ differs from UTC calendar date of $a$.
  - Occurs before or at $\text{effective\_cutoff}$, reported before or at $T_{\text{as\_of}}$.
- **Full-Window No-Return**:
  - Report has `kind: "no_return"` with $T_{\text{occurred}} \ge T_{\text{maturity}}$, $T_{\text{occurred}} \le \text{effective\_cutoff}$, and $T_{\text{reported}} \le T_{\text{as\_of}}$.
  - A no-return dated before maturity is insufficient.
- **Partition Invariant**:
  $$\text{mature\_activated} = \text{mature\_confirmed\_repeat} + \text{mature\_confirmed\_no\_return} + \text{mature\_unknown}$$
- **Contradiction**:
  A participant with both a qualifying repeat and an explicit full-window no-return causes input rejection (`CONTRADICTORY_REPORTS`).

## 5. Metric Formulas & Precisions

All ratios use exact BigInt rational division with half-away-from-zero rounding to 6 decimal places:
- **Activation Rate**:
  $$\text{activation\_rate} = \frac{\text{activated}}{\text{eligible\_starters}}$$
  Zero eligible starters yields status `unavailable` with reason `zero_starter_denominator`.
- **Repeat Rate**:
  $$\text{repeat\_rate} = \frac{\text{mature\_confirmed\_repeat}}{\text{mature\_activated}}$$
  Zero mature activated yields status `unavailable` with reason `zero_mature_denominator`.
- **Cash Efficiency**:
  $$\text{cash\_per\_activation} = \frac{\text{cash\_total}}{\text{activated}}$$
  $$\text{cash\_per\_repeat} = \frac{\text{cash\_total}}{\text{mature\_confirmed\_repeat}}$$
  Zero denominator yields status `unavailable` with reason `zero_repeat_denominator`.
- **Capacity Efficiency**:
  $$\text{hours\_per\_repeat} = \frac{\text{hours\_total}}{\text{mature\_confirmed\_repeat}}$$
  Capacity hours are parsed as exact decimals at a fixed four-fractional-digit scale ($10^{-4}$ hours). An amount of `0.0001` contributes `0.000100`, never a truncated zero.
- **ROI Precedence**:
  - Missing or incomplete cost mapping $\to$ status `unavailable`, reason `unknown_cost`.
  - Known cost equal to 0 $\to$ status `undefined`, reason `zero_cost`.
  - Known positive cost with missing observed benefits $\to$ status `unavailable`, reason `unknown_benefit`.
- **Baseline**:
  Initial package reports status `unavailable` with reason `baseline_unknown`.

## 6. Schema and Binding Enforcement

- The shipped `assets/measurement-input.schema.json` is applied, not merely parsed: closed
  objects, required fields, types, enums, patterns, unique items, and UTC calendar timestamps
  are evaluated before any temporal arithmetic or ratio computation.
- The emitted envelope is re-validated against `assets/scorecard.schema.json`; a
  non-conforming envelope fails closed as `INTERNAL_ERROR` (exit 4).
- Source, task, cohort, and cost-mapping references bind an exact current ledger
  `id:revision` with `kind: "SRC"`, `data.status: "available"`, and a
  `data.locator.sha256` equal to the supplied and verified source hash. A revision that
  exists only in `record_history` is history, never current. Lookup is never by ID alone.
- Metric bindings bind an exact current `MET` revision whose `query` resolves to a current
  `SRC` revision and whose `query_revision` equals that `SRC` record's
  `data.origin.revision`.
- Installed preflight requires the reporting schema assets plus the product-evidence and
  product-investment scripts **and** schema assets in either the standard agent root
  (`skills/...`) or the flattened package root (`<root>/marketing-measurement`). There is no
  monorepo-parent fallback.

## 7. Privacy & Public Diagnostics

- Diagnostic messages never echo private participant keys, report IDs, task text, or private file system paths.
- Unrecognized properties report error with path `"/"` and fixed message.
- Public projection replaces internal source paths with designated public aliases and lowercase SHA-256 digests.
- Identity and provenance are projected only from a fully validated input whose ledger, investment, and source hashes were actually verified. Invalid input emits `campaign_id: null`, `input_revision: null`, an empty `provenance`, and the fixed `public_identity_unavailable` limitation; no declared-but-unverified hash is ever published.
