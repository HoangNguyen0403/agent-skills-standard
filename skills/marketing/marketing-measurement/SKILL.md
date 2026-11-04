---
name: marketing-measurement
description: 'Audits and computes offline marketing measurement scorecards, cohort activation, repeat rates, cash efficiency, and capacity metrics without fabricated ROI. Use when evaluating campaign outcomes, computing cohort retention ratios, or generating marketing scorecards. (triggers: `marketing scorecard`, `campaign measurement`, `cohort activation rate`)'
guardrail: true
metadata:
  triggers:
    files: []
    keywords:
      - 'marketing scorecard'
      - 'campaign measurement'
      - 'cohort activation rate'
      - 'cohort repeat rate'
---

# Marketing Measurement Standard

## **Priority: P0 (CRITICAL)**

Evaluate marketing campaign outcomes using deterministic offline accounting, exact 14-day cohort maturity windows, explicit consent filtering, and immutable source-bound contracts. Never confuse correlation with causal ROI or convert labor capacity into cash benefits.

## Core Rules

1. **Explicit Eligibility & Consent**:
   - Only participants with `role: "external"` and `consent: "granted"` enter adoption calculations.
   - Non-consented, withdrawn, bot, maintainer, and evaluator records must be excluded and tracked under `excluded_participants`.
2. **Half-Open Windows & Occurrence Cutoff**:
   - Campaign acquisition and cost windows are strictly half-open $[T_{\text{start}}, T_{\text{end}})$.
   - Effective occurrence cutoff is $\min(T_{\text{as\_of}}, T_{\text{coverage\_end}})$. Reports with $T_{\text{reported}} > T_{\text{as\_of}}$ or $T_{\text{occurred}} > \text{effective\_cutoff}$ do not contribute.
3. **Activation & Exact 14-Day Maturity**:
   - Starters must not follow activations. Earliest qualifying activation is $a$.
   - Maturity is reached exactly at $a + 14 \times 86400 \text{ s}$. Immature activations ($T_{\text{cutoff}} < T_{\text{maturity}}$) are excluded from mature repeat denominators.
   - Qualifying repeat requires a distinct UTC calendar date from $a$ and $a < T_{\text{occurred}} \le a + 14\text{ days}$.
4. **Three-Way Mature Partition**:
   - Partition mature activated participants into: confirmed repeat, full-window no-return ($T_{\text{occurred}} \ge T_{\text{maturity}}$), and unknown.
   - Contradictory qualifying repeat plus full-window no-return rejects the snapshot; never resolve via newest-wins.
5. **Cash vs Capacity Separation**:
   - Treat cash costs and developer hours as distinct non-convertible metrics. Never book capacity savings as cash revenue or margin.
   - Preserve capacity hours at exact four-decimal precision: `0.0001` hours renders `0.000100`, never `0.000000`.
   - Known zero cash cost with positive denominator yields `0.000000` cash efficiency while preserving visible capacity hours.
6. **Zero Denominator & ROI Precedence**:
   - Zero denominator yields status `unavailable` with explicit reason (`zero_starter_denominator`, `zero_mature_denominator`, `zero_repeat_denominator`), never `0.000000` or `NaN`.
   - Missing baseline is `unavailable` with reason `baseline_unknown`.
   - ROI precedence: unknown cost $\to$ zero cost (`undefined`, `zero_cost`) $\to$ unknown benefit (`unavailable`, `unknown_benefit`).
7. **Privacy & Public Redaction**:
   - Never echo private participant keys, report IDs, task code text, or host file paths in public JSON, Markdown, or error diagnostics.
   - Map provenance to designated public aliases and lowercase SHA-256 digests.
   - Project identity and provenance only after full schema validation and hash verification; invalid input emits null identity, empty provenance, and `public_identity_unavailable`.
8. **Exact Source Binding**:
   - Every task, cohort, cost-mapping, and metric reference binds an exact current ledger `id:revision` with an available `SRC` locator SHA equal to the verified source bytes. Never resolve by ID alone or accept a historical revision as current.
   - Apply the shipped JSON Schema documents to input and output; parse success alone is not conformance.
   - Preflight both PM scripts and their schema assets in standard or flattened installed layouts.

## CLI Invocation

Execute the local deterministic reporting CLI:
```bash
node <agent-skill-root>/skills/marketing/marketing-measurement/scripts/report-marketing.mjs \
  <absolute-input.json> \
  --authority-root <absolute-narrow-initiative-root> \
  --as-of <UTC-instant> \
  --format json|markdown
```

## Anti-Patterns

- **No Output as Outcome**: Never report landing page visits or raw code delivery as verified adoption.
- **No Same-Day Repeat**: Never count second sessions on the same UTC calendar day as cohort repeat use.
- **No Fabricated ROI**: Never invent financial returns for unmonetized open-source adoption.
- **No Leaked Identifiers**: Never include participant keys or private file system paths in error messages or scorecards.

## References

- [Measurement Contract](references/measurement-contract.md) — Metric formulas, denominator rules, and ratio precisions.
- [Fixture Resources](references/fixture-resources.md) — Synthetic test fixtures and edge cases.
