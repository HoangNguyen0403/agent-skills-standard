---
description: "Review realized product value against registered measurement contracts and baseline evidence, separating delivery completion from causal ROI."
---

# Review Product Value Workflow

Goal: Evaluate post-release product value by comparing observed outcomes against registered metrics and investment assumptions without inferring causal ROI from delivery alone.

## Steps

1. Preflight and intake:
   - Preflight: verify `product-management/product-evidence`, `product-management/product-metrics`, `product-management/product-investment`; conditional `product-management/product-roadmap` only if proposing ordering changes. Scripts: `scripts/validate-product-evidence.mjs` (ordinary `<root>/product-management/product-evidence`, Kiro `<root>/product-management-product-evidence`), `scripts/evaluate-investment.mjs` (ordinary `<root>/product-management/product-investment`, Kiro `<root>/product-management-product-investment`). Validator invocation: `node <validator> <ledger.json> --authority-root <canonical-root> --as-of <UTC> --gate release` (or `structural`). Calculator invocation: `node <calculator> <scenario.json>`. Exit: `0` = coherent (structural, readiness not_assessed) or gate eligible for host check only; never authorization; `3` = proposal_only/gap; `1/2/4` = error (never validated). Emit exact gap strings (`<pkg> not installed; opt in at a reviewed ref and sync`, `product-management/product-evidence excluded; opt in at a reviewed ref and sync`, `validate-product-evidence.mjs missing; repair package`, `evaluate-investment.mjs missing; repair package`, `Node >=20 unavailable; calculation not performed`, `analytics evidence unavailable; value inconclusive`) with safe next action; preserve delivery `feature_status`. See `product-evidence` Verification Workflow.
   - Intake: `slug`, scope, original investment ref (historical attribution only, not action authority), registered `MET` contracts, and comparison window. No automated background scheduler.
2. Inspect measurement contracts and evidence:
   - Audit MET contracts (AC-009): verify `status` (`planned|instrumented|observed|unavailable`; no `immature` status enum), exact `query_revision` = query origin revision, `eligibility`/cohort, baseline XOR scoped `baseline_exception` (`purpose: "release"`, `outcome: "risk_accept"`), `measurement_owner`, and `review_trigger`. On failure, record precise `missing_evidence` gap and return `inconclusive`, never invented observations.
   - Retrieve observed `SRC` data and actual incremental costs. Check displaced work / opportunity cost rationale. Retain paired financial input/result (`financial_input`, `financial_result` / horizon) separately.
3. Assess attribution and guardrails:
   - Inspect guardrails (churn, errors, latency). If guardrail harm or regression is detected, escalate immediately to authorized incident controls (`incident-hotfix`); agents cannot autonomously roll out or revert.
   - Evaluate causal attribution: classify as `causal_supported | descriptive | unknown`. Document confounders (marketing, seasonality, pricing) and counterfactuals. `scale` and `causal_supported` require observed metrics plus sources. Never infer causal ROI from release.
4. Formulate advisory recommendation:
   - Emit `REV` record with recommendation: `scale | iterate | stop | inconclusive`. Record explicit limitations. `REV.decision` is historical attribution only; any capital, roadmap, or retirement action requires a separate recorded `value_review` / host decision.
   - Recommendations are advisory; emit host decision needed for any capital, roadmap, or retirement action.
   - Preserved delivery invariant: keep delivery `feature_status` (e.g. `released` or `verified`) unchanged even when product value is inconclusive; never set `blocked` for product-evidence gaps alone.

## Runtime Contract

- Use for post-release value review after the comparison window has elapsed.
- Required inputs: initiative `slug`, original investment `DEC` ref, registered `MET` contracts, and observed evidence; carry forward parent `operator_profile` (infer per `common-operator-profile` if unstated, never ask).
- Return BLOCKED only when requested scope has no registered measurement contract or authority. Immature data or missing analytics produces an `inconclusive` review with `missing_evidence`, not BLOCKED.

## Handoff Payload

- `slug`, `operator_profile`, scope, original investment ref, observed `MET` records, actual cost `SRC` refs, `REV` record, attribution rationale, advisory recommendation, next workflow.
- Outcome report: carry current delivery `feature_status` and parent `requirement_trace` (`brd_objectives`, `requirements`, `acceptance_criteria`, `srs`) from parent handoff unchanged; for a new initiative without parent trace, seed `brd_objectives` only (never place product IDs in requirement IDs). Never downgrade `released` to `blocked` for product-evidence gaps alone — record in `missing_evidence`/`decision_needed`.

## Blocking Questions

- Ask max 3 only when an answer resolves an unmeasured confounder, attribution boundary, or strategic trade-off. Never re-ask settled release facts.

## Output Template

```md
# Product Value Review: [Name]
## Investment Baseline & Scope
## Observed Outcomes & Cost Evidence
## Guardrail Performance & Anomalies
## Attribution & Confounder Analysis
## Realized Value vs Investment Case
## Advisory Recommendation & Decision Needed
## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: review-product-value, feature_status: released, started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: retro-learn, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}
## Next Workflow
incident-hotfix | retro-learn | plan-feature
## Cost Report
Call `get_session_cost(workflow="review-product-value")` before final handoff.
```
