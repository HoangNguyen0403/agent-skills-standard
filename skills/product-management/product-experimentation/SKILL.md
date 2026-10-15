---
name: product-experimentation
guardrail: true
description: 'Design and validate bounded product experiments with falsifiable hypotheses, precommitted thresholds, guardrail metrics, ethical eligibility, and stop rules; use for product hypothesis validation / product experiment design. (triggers: `product hypothesis validation`, `product experiment design`)'
metadata:
  triggers:
    files: []
    keywords:
      - product hypothesis validation
      - product experiment design
---

# Product Experimentation

## **Priority: P0 (CRITICAL)**

Design and validate product experiments with strict falsifiability, precommitted decision thresholds, guardrail monitoring, and bounded exposure, ensuring honest routing of negative and inconclusive findings.

## 1. Capability Preflight

Verify installed evidence capabilities before designing or reviewing experiments:
- Resolve `product-evidence` from `<agent-skill-root>/product-management/product-evidence/SKILL.md` (ordinary install), `<agent-skill-root>/product-management-product-evidence/SKILL.md` (flattened Kiro install), or MCP `get_skill("product-management", "product-evidence")`. Distinguish an explicitly excluded pack from a missing pack; if host configuration cannot establish which, report unknown.
- Separately check installed `scripts/validate-product-evidence.mjs`, its package-local `assets/product-evidence.schema.json`, and Node >=20. Missing script/schema/runtime blocks validation, not safe proposal drafting. MCP body access is not proof that local executable resources are installed.
- Missing AUTH/DEC, consent, eligible data, or measurement query/baseline is an authority/data gap, not a runtime failure. Keep the experiment proposed and state the missing input; never simulate validation, install dependencies, or fabricate authorization.

## 2. Core Protocol

1. **Falsifiable Hypotheses (`HYP`)**:
   - Formulate clear predictions, causal mechanisms, target cohorts, and explicit disconfirmation criteria matching normative ledger schema.
2. **Precommitted Success & Failure Thresholds**:
   - Establish explicit numeric rules (`rules: { success, failure, inconclusive }`) *before* running.
   - Modifying thresholds or moving goalposts after observing interim data is strictly prohibited.
3. **Primary Metric & Guardrails**:
   - Designate exactly one primary decision metric (`MET` ref `{id, revision}`).
   - Define guardrails (`guardrails: [{id, revision}]`). An uncontained guardrail breach halts the experiment immediately.
4. **Finite Exposure, Budget, and Duration**:
   - Declare strict bounds: `bounds: { starts_at, ends_at, budget_cap, currency, exposure_cap, stop_rules }`.
   - `exposure_cap` must be a finite safe integer ($\ge 0$); `budget_cap` must be an unsigned decimal string.
5. **Ethical Eligibility & Stop Rules**:
   - Enforce user consent, non-maleficence, and privacy rules.
   - Pre-commit automated stop rules for severe regressions or ethical breaches.
6. **Authorization & Lifecycle Boundaries**:
   - **Ledger Eligibility vs Host Authorization**: An authorized `EXP` record in the ledger confirms eligibility, NOT live permission to expose users, spend funds, or mutate production flags. Actual production changes require current authenticated host/operator control.
   - Approver names in JSON metadata never substitute for verified ledger authority (`AUTH`).
   - Separately retain the frozen experiment plan. Result progression adds `MET`/`SRC` evidence and completed `EXP.result: { classification, sources, limitations }`.
   - Any material change to predictions, telemetry queries, guardrails, budget, or exposure requires a new authorized experiment revision.
7. **Honest Decision Routing (`DEC`)**:
   - **Supported**: Propose investment review (`purpose: "investment"`, `outcome: "propose"`). Does not auto-authorize build.
   - **Refuted**: Recommend stopping further work, bounded iteration, or proposal as supported by evidence. For a `purpose: "experiment"` DEC use only lawful outcomes such as `"propose"`, `"defer"`, or `"reject"`; `"stop"` is valid only for `purpose: "value_review"` when its required strategy, authority, and artifact evidence exists. Otherwise record a proposal and the missing proof; never fabricate a recorded value-review decision.
   - **Inconclusive**: Defer or bounded further learning (`outcome: "defer"`). Never treat inconclusive results as validation.
   - Immutable recorded DECs stay current until superseded by a new recorded DEC ID referencing `supersedes: {id, revision}`.

## 3. Anti-Patterns & Red Flags

- **No Moving Thresholds**: Never lower success bars after seeing weak results.
- **No Unconditional Full Build**: Never claim positive prototype testing authorizes full implementation without budget approval.
- **No Ignoring Guardrails**: Never celebrate conversion increases if churn or error guardrails are breached.
- **No Fabricated Authorization**: Never treat JSON strings or ledger eligibility as live host authorization.
- **No In-Place Decision Mutation**: Never edit an already recorded decision in place.

## 4. References

- [Experimentation Protocol](references/experimentation-protocol.md) — Precommitment, thresholds, and routing matrix.
- [Evidence Mapping](references/evidence-mapping.md) — Normative schema mapping for `HYP`, `EXP`, `MET`, and `DEC`.
- [Ethical & Stop Rules](references/ethical-and-stop-rules.md) — Consent, vulnerable cohorts, and host-gated stop execution.
- [Manual Semantic Rubric](references/semantic-rubrics.md) — Case-specific decision/artifact criteria; literal eval assertions are not semantic verdicts.
- [Citations and Sources](references/citations-and-sources.md) — Immutable citations, conceptual sources, and authorship.
