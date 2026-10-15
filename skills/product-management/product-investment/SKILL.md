---
name: product-investment
guardrail: true
description: 'Evaluate product investment options across build, buy, partner, defer, and do-nothing paths, setting incremental accounting boundaries and cash-versus-capacity rules without fabricated ROI. Use for product investment analysis / product ROI scenario. (triggers: `product investment analysis`, `product ROI scenario`)'
metadata:
  triggers:
    files: []
    keywords:
      - product investment analysis
      - product ROI scenario
---

# Product Investment Analysis

## **Priority: P0 (CRITICAL)**

Evaluate feature and product investment options with rigorous incremental accounting, cash versus capacity boundaries, and deterministic financial calculations without fabricating speculative returns.

## 1. Capability Preflight

Before numeric evaluation:
- Confirm Node >=20, the installed package's `scripts/evaluate-investment.mjs`, and `assets/investment.schema.json` separately. Invoke with `node <installed-root>/scripts/evaluate-investment.mjs <absolute-input.json>`; resolve companion assets from the package, never the monorepo root or current directory. Do not install missing resources.
- Resolve ledger capability from `<agent-skill-root>/product-management/product-evidence/SKILL.md` (ordinary install), `<agent-skill-root>/product-management-product-evidence/SKILL.md` (flattened Kiro install), or MCP `get_skill("product-management", "product-evidence")`. Distinguish explicit exclusion from missing pack; if configuration cannot establish status, say unknown.
- Missing script/schema/runtime is a resource/runtime gap; missing accounting data means unknown or qualitative-only analysis; missing budget authority permits proposal only, never commitment. If ledger capability is absent, continue standalone only when supplied inputs do not require ledger validation.
- Never simulate ledger validation, infer financial completeness, or call an analysis approved without required human authority.

## 2. Core Protocol

1. **Strategic Alternatives Evaluation**:
   - Explicitly evaluate five investment paths: **build**, **buy**, **partner**, **defer**, and **do-nothing**.
   - Model the "do nothing / defer" counterfactual as the baseline against which incremental costs and benefits are measured.
2. **Trade-offs & Opportunity Cost**:
   - Assess displaced work and opportunity costs qualitatively in the decision rationale.
   - Do NOT record opportunity costs as cash expenses unless approved by finance.
3. **Cash vs Capacity Distinction**:
   - Treat developer and operational hours saved as operational capacity (`basis: "capacity_hours"`).
   - Capacity hours are informational. Never convert saved hours into cash benefits ($B$) unless an explicit finance-verified cash reduction mechanism exists.
4. **Finance-Owned Incremental Accounting Boundary**:
   - Restrict analysis to incremental cash flows within the declared `accounting_boundary`.
   - Exclude genuinely sunk costs and non-incremental historical overhead allocations.
   - Finance determines and documents whether specific step-fixed costs or incremental shared contracts are included relative to do-nothing. The calculator cannot infer cost completeness or causality.
5. **Scenario Rigor (Base, Downside, Upside)**:
   - Formulate separate, independent assumptions for `base`, `downside`, and `upside` scenarios.
   - Do NOT average scenarios or assign arbitrary probabilities to compute an expected return.
   - An invalid scenario rejects the entire analysis; do not drop downside risks silently.
6. **Qualitative Investment Validity**:
   - Qualitative investments (compliance, platform stability, strategic enablement) are valid without fabricated numerical ROI.
   - If benefits are non-monetary, declare `nonmonetary: string[]` and leave monetary benefits unknown.
7. **Budget-Holder Authority & Revisit Triggers**:
   - Economic evaluation models potential value; it does NOT authorize capital expenditure or team allocation.
   - All investments require formal budget-holder authority binding before commitment.
   - Define unambiguous revisit triggers (cost overruns, missed milestones, macro shifts).

## 3. Anti-Patterns & Red Flags

- **No Fabricated ROI**: Never invent dollar figures for unquantifiable strategic or user-satisfaction benefits.
- **No Capacity as Cash**: Never treat saved internal labor hours as immediate cash revenue or cash savings.
- **No Sunk Cost Inclusion**: Never justify continuing an investment based on money already spent.
- **No Probability-Weighted Blending**: Never average downside and upside to mask capital loss scenarios.
- **No Double-Counting**: Never net COGS in contribution margin and simultaneously claim them as explicit costs.

## 4. References

- [Financial Contract](references/financial-contract.md) — Exact arithmetic, rounding, payback, and NPV specification.
- [Examples & Reference Oracles](references/examples.md) — Baseline, zero-cost, durable payback, and rejection fixtures.
- [Manual Semantic Rubric](references/semantic-rubrics.md) — Case-specific financial decision/artifact criteria; lexical assertions are not semantic verdicts.
- [Citations and Sources](references/citations-and-sources.md) — Authorship statement, conceptual citations, and exclusions.
