---
name: product-metrics
description: 'Define explicit outcome measurement contracts, baseline evidence, query revisions, guardrails, and post-release product value reviews without confusing correlation with causal ROI. (triggers: `product measurement contract`, `product value review`)'
guardrail: true
metadata:
  triggers:
    files: []
    keywords:
      - product measurement contract
      - product value review
---

# Product Metrics & Value Review

## **Priority: P0 (CRITICAL)**

Establish outcome-focused measurement contracts before release and conduct rigorous post-release value reviews, separating delivery completion from causal product value and rejecting unverified ROI claims.

## 1. Capability Preflight

Resolve and verify execution prerequisites across installed layouts before validating measurement contracts or value reviews:
1. **Installed Location**: Locate `<agent-skill-root>/product-management/product-evidence/` (standard) or `<agent-skill-root>/product-management-product-evidence/` (Kiro flattened). MCP lookup is not local script proof.
2. **Component Integrity**:
   - Package missing/excluded: emit `Capability gap: product-management/product-evidence not installed or excluded; opt in at a reviewed ref and sync.`
   - Script missing: emit `Capability gap: validate-product-evidence.mjs missing from installed package; repair product-evidence installation.`
   - Runtime engine: require Node.js $\ge 20.0.0$ (`node --version`). If $< 20$, emit `Capability gap: Node.js runtime >= 20.0.0 required for local validator; current environment does not meet minimum engine requirement.`
3. **Invocation inputs**: confirm existing absolute canonical narrow authority root (reject `/`, home, parent workspace), contained regular ledger, valid UTC `--as-of`, and `--gate structural|experiment|commit|release`.
4. **Current evidence**: check authority/artifact pairs, query/revision, source access/freshness, baseline or exception helper, guardrails, and analytics availability. Missing analytics yields `inconclusive` value and preserves `released` delivery.
5. Follow [Verification Procedures](references/verification-procedures.md) for root/data checks and exact artifact/history predicates. No placeholder inputs, simulated validation, silent installs, broadened roots, query/guardrail waivers, or permission inferred from body lookups.

## 2. Core Protocol

1. **Outcome vs. Output Distinction**:
   - Measure user and business outcomes, not feature output or ticket velocity.
   - Engineering delivery status (`released`) does NOT constitute evidence of product value.
2. **Measurement Contract Specification (`MET`)**:
   - Required fields: `definition`, `unit`, `denominator`, `eligible cohort`, `comparison_window`, `target`, `guardrail`, `measurement_owner`, `review_trigger`.
   - Admissible statuses: `planned | instrumented | observed | unavailable`. Immature data must be recorded as `unavailable` with maturity rationale in permitted source context; `immature` is not a valid status enum.
   - `instrumented` and `observed` states require a non-null `query` and matching `query_revision`.
3. **Baseline XOR Baseline Exception Before Release**:
   - Release requires historical baseline evidence (`baseline: {value, source, window}`) XOR a scoped baseline exception (`baseline_exception`).
   - Baseline window ordering: $\text{baseline.window.end} \le \text{comparison\_window.start}$.
   - A `baseline_exception` must reference a current, non-retired recorded release decision (`purpose: "release"`, `outcome: "risk_accept"`). The exception consumes the exact MET, shares scope, has current authorization and artifact bindings, and waives ONLY baseline on that exact MET. It NEVER waives query definitions, NEVER waives guardrails, and NEVER fabricates approval.
   - Helper release DECs used solely as baseline exceptions are excluded from normal release decision selection.
4. **Safe Guardrail Escalation**:
   - Define counter-metrics (error rate, latency, churn). Breaches invalidate primary gains.
   - Breaches require urgent escalation/recommendation to the authorized incident/operator route (`incident-hotfix`). Execute automated rollbacks/halts ONLY if an authenticated host runtime stop control is explicitly configured within authorized bounds.
   - MET, REV, and validator outputs do NOT grant autonomous release, halt, retirement, budget, or exposure authority.
5. **Post-Release Product Value Review (`REV`)**:
   - Connect original investment `DEC` (historical attribution only, not current authority) and `HYP` to actual observations (`SRC`) and actual incremental costs (`SRC`).
   - A new value review decision requires a distinct recorded `DEC` binding current strategic authority and authorization.
   - Classify attribution as `causal_supported | descriptive | unknown`. Document counterfactuals and confounders (seasonality, marketing spend, promotions).
   - Set `recommendation` to `scale | iterate | stop | inconclusive`. REV has no status field.
   - When evidence is unseasoned or confounded, record `recommendation: "inconclusive"`, `attribution.classification: "unknown"` or `"descriptive"`, keeping delivery status `released`.
   - Diagnose solution-internal and organizational limitations separately using [Value Review Protocol](references/value-review-protocol.md#7-limitation-diagnosis); a KPI shortfall alone establishes neither cause.

## 3. Anti-Patterns & Red Flags

- **No Shipping as Success**: Never mistake feature delivery for business value realization.
- **No Correlation as Causal ROI**: Never claim revenue increases were caused by a release without controlled counterfactuals.
- **No Baseline Waiver Without Exception DEC**: Never proceed to release without baseline evidence or a recorded risk-acceptance decision.
- **No Autonomous Action**: Never allow automated systems to expand rollout, retire features, or commit capital without human governance.
- **No Invented Status Enums**: Never use `immature` as a MET status or add a status field to `REV`.

## 4. References

- [Metrics Protocol](references/metrics-protocol.md) — Outcomes, denominators, baseline rules, and guardrails.
- [Value Review Protocol](references/value-review-protocol.md) — Linking investments, causal attribution, and recommendations.
- [Evidence Mapping](references/evidence-mapping.md) — Schema mappings for `MET` and `REV` records and influence relations.
- [Examples & Recipes](references/examples.md) — Retained complete package-shaped synthetic ledgers and construction recipes.
- [Semantic Rubrics](references/semantic-rubrics.md) — Case-specific manual semantic rubrics and decision grading.
- [Artifact/History Procedures](references/verification-procedures.md) — authorized input checks, exact revision predicates, and manual grade receipts.
- [Concrete Fixture Cases](references/verification-cases.md) — exact offline mutation roots, retained pairs and expected predicates.
- [Citations and Sources](references/citations-and-sources.md) — Authorship declaration, conceptual citations, and exclusions.
