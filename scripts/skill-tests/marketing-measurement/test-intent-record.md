# Test Intent Record: Marketing Measurement CLI & Contracts

Initiative: `evidence-led-marketing` | Task: `T02 Offline measurement implementation`
Date: 2026-10-25 | Author: Personal - Cheap implementation owner

## Target Surface Under Test
- Script: `skills/marketing/marketing-measurement/scripts/report-marketing.mjs`
- Schemas:
  - `skills/marketing/marketing-measurement/assets/measurement-input.schema.json`
  - `skills/marketing/marketing-measurement/assets/scorecard.schema.json`
- Canonical Ledger: `docs/product/evidence-led-marketing/evidence.json`
- Synthetic Fixtures: `docs/product/evidence-led-marketing/fixtures/`

## Failure Modes & Real Consumer Faults

| ID | Fault Hypothesis | Customer / Downstream Impact | Test Case |
|---|---|---|---|
| F-001 | Private participant identifiers, raw input paths, or stack traces leak into public scorecards or error diagnostics | Violation of privacy commitments (AC-34, VER-011); exposure of sensitive local paths or participant identities to public readers. | Privacy leakage test: verify absence of participant keys, private paths, or secret properties in stdout/stderr across valid, invalid, and error runs. |
| F-002 | Immature activations (<14 days old) counted in mature repeat-rate denominator | Premature reporting of low repeat rates (AC-07, VER-002), penalizing recent cohorts before follow-up window closes. | Boundary test at Jan 1 12:00:00Z: Jan 15 11:59:59Z is immature; Jan 15 12:00:00Z is mature. |
| F-003 | Repeats on same UTC calendar date counted as qualifying repeat use | Inflates repeat rates via same-session activity rather than genuine returning adoption (SRS-002, VER-003). | UTC calendar date test: repeat on same date excluded; repeat on distinct UTC date within 14d included; repeat at a + 14d + 1s excluded. |
| F-004 | Zero denominator causes crash, NaN, Infinity, or 0.000000 rather than unavailable status | Consumer automation ingests false zeroes as real metric achievements or crashes on bad JSON (AC-06, AC-10, VER-005, VER-006). | Zero denominator test: 0 starters -> activation_rate unavailable (`zero_starter_denominator`); 0 mature activations -> repeat_rate unavailable (`zero_mature_denominator`); 0 mature repeats -> cash_per_repeat unavailable (`zero_repeat_denominator`). |
| F-005 | Missing baseline renders as 0.000000 instead of unknown | Confuses lack of baseline data with zero baseline, falsely claiming 100% improvement over zero (AC-06, VER-001). | Missing baseline test: `baseline` measure has status `unavailable` and reason `baseline_unknown`. |
| F-006 | Query-origin revision mismatch between MET and SRC accepted silently | Corrupts data provenance; metric queries unverified data revision (SRS-001, VER-001). | Binding validation test: mismatched `query_revision` produces binding rejection issue. |
| F-007 | Non-returning mature participants treated as unobserved or omitted | Underestimates cohort drop-off or conflates explicit non-return with lost-to-follow-up (SRS-003, VER-004). | Partition test: 3 mature participants (1 repeat, 1 explicit full-window no-return, 1 unknown) -> repeat_rate = 0.333333. |
| F-008 | Contradictory reports (qualifying repeat AND full-window no-return) resolved via newest-wins | Masks survey or tracking corruption with arbitrary ordering (SRS-003, VER-004). | Conflict test: contradictory report pairs reject input with fixed issue code `CONTRADICTORY_REPORTS`. |
| F-009 | Withdrawn or non-consented participants counted in adoption metrics | Regulatory and ethical breach; violates explicit consent constraints (AC-33, VER-011). | Consent test: participants with `consent: "withdrawn"` or `"absent"` are excluded and increment `excluded_participants` count. |
| F-010 | Labor hours converted to cash or blended with cash costs | Violates financial contract (AC-11, SRS-005); fabricates monetary savings from capacity hours. | Accounting boundary test: cash and capacity hours reported as separate totals and ratios; no conversion. |
| F-011 | Zero incremental cash cost with positive denominator produces unavailable or unknown rather than zero efficiency | Fails to show free cash efficiency while keeping labor hours transparent (SRS-005, VER-007). | Zero cash test: known cash 0 with 2 mature repeats -> cash_per_repeat = 0.000000, hours_per_repeat = 3.000000. |
| F-012 | Missing PM dependency fails silently or falls back to monorepo scripts | Unportable runtime behavior; breaks consumer installations where PM skills are missing (SRS-007, VER-008). | Dependency preflight test: cleanly reports capability gap with exit code 2 when PM dependency is absent. |
| F-013 | Tainted or invalid `--as-of` argument copied into error envelopes or Markdown headers | Downstream callers or public observers see private injected sentinel strings in telemetry or diagnostics. | Sanitization test: invalid as-of produces null `as_of` in envelope and no echo in Markdown banner or stdout/stderr (VER-011c). |
| F-014 | Discarding canonical investment calculator ROI and fabricating ad-hoc ratio | Inconsistent financial math across PM and marketing tools; ignores investment benefits or fails zero-cost precedence. | Canonical calculator test: direct reuse of base scenario ROI result from `evaluateInvestment` without modification (VER-007, VER-007c). |
| F-015 | Hardcoded empty-string SHA-256 for calculation executable | Invalidates code auditability and provenance; breaks verification of reporting runtime identity. | Executable hash test: `calculation.sha256` dynamically computes real SHA-256 of `report-marketing.mjs` (VER-007). |
| F-016 | Duplicate/conflict report processing applied before consent filtering | Withdrawn or non-consented participants can trigger false conflict errors or distort duplicate counts. | Exclude-before-calculation test: non-eligible participant reports discarded before deduplication or conflict checks. |
| F-017 | Unverified task_ref or source bindings accepted without checking hash or ledger | Permits tampered or unverified task artifacts to substantiate activations. | Source verification test: every `task_ref`, `cohort.source`, and `cost_mapping.source` checked against verified sources map and available ledger record. |
| F-018 | Symlink traversal through parent path components or TOCTOU changed-read | Host escape vulnerabilities; reading modified files after initial check. | Bounded containment test: segment-by-segment `inspectContainedRegularFile` and before/after descriptor stat check. |
