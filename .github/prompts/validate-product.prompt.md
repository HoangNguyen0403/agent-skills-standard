---
description: "Validate critical product assumptions and hypotheses through bounded experiment design, precommitted thresholds, and host authorization gates."
---

# Validate Product Workflow

Goal: Validate prioritized product hypotheses through bounded experiments and precommitted thresholds, routing validated, invalidated, or inconclusive outcomes honestly.

## Steps

1. Preflight and intake:
   - Preflight: verify `product-management/product-evidence`, `product-management/product-investment`, `product-management/product-experimentation`; conditional `product-management/product-metrics` only when designing executable measurement. Scripts: `scripts/validate-product-evidence.mjs` (ordinary `<root>/product-management/product-evidence`, Kiro `<root>/product-management-product-evidence`), `scripts/evaluate-investment.mjs` (ordinary `<root>/product-management/product-investment`, Kiro `<root>/product-management-product-investment`). Validator invocation: `node <validator> <ledger.json> --authority-root <canonical-root> --as-of <UTC> --gate experiment` (and `commit` before delivery handoff). Calculator invocation: `node <calculator> <scenario.json>`. Exit: `0` = coherent (structural, readiness not_assessed) or gate eligible for host check only; never authorization; `3` = proposal_only/gap; `1/2/4` = error (never validated). Emit exact gap strings (`<pkg> not installed; opt in at a reviewed ref and sync`, `product-management/product-evidence excluded; opt in at a reviewed ref and sync`, `validate-product-evidence.mjs missing; repair package`, `evaluate-investment.mjs missing; repair package`, `Node >=20 unavailable; calculation not performed`) with safe next action; preserve delivery `feature_status`. See `product-evidence` Verification Workflow.
   - Intake: `slug`, scope, critical `HYP` records, and strategy/learning authority. Qualitative investment is valid; financial script absence doesn't block qualitative analysis.
2. Design bounded experiment:
   - Define falsifiable `EXP`: method, target cohort eligibility, sample plan, primary decision metric (`MET`), guardrails (`MET`), and precommitted rules (`rules: { success, failure, inconclusive }`). Never move goalposts after observing data.
   - Predeclare finite bounds: `starts_at`, `ends_at`, `budget_cap` (unsigned decimal string; null cap forbids execution / proposal-only), `currency`, `exposure_cap` (safe integer), and `stop_rules` (host-enforced).
3. Check authorization and run boundary:
   - Verify experiment authorization: proposal in ledger is NOT host approval. Real live user exposure, spend, or feature activation requires authenticated host/operator control; without it, mark `proposal_only` (`AUTHORIZATION_REQUIRED`). Never fabricate authorization or execute spend.
   - Material changes to predictions, queries, guardrails, or budget require a new immutable authorized DEC revision, never mutating an existing recorded decision.
4. Evaluate results and route:
   - Completed experiments require observed `SRC` results and limitations. Inspect negative, confounded, and unseasoned evidence.
   - Route outcomes: proposal-only -> recommended next workflow is `null` with `decision_needed` requesting host authorization; invalidated -> route to `discover-product` (pivot) or `retro-learn`, or `null` for defer/no-build (never unconditional implementation); inconclusive -> `validate-product` (bounded follow-up) or `null` (defer); supported -> route to `plan-feature` or `implementation-readiness` ONLY after recorded, current, scoped investment `authorize` decision with commit-gate eligibility (`eligible_for_host_check`, which still requires host check).

## Runtime Contract

- Use when critical product hypotheses or assumptions must be tested before committing delivery capacity.
- Required inputs: initiative `slug`, scoped critical `HYP`, primary `MET`, finite bounds, and learning authorization; carry forward parent `operator_profile` (infer per `common-operator-profile` if unstated, never ask).
- Return BLOCKED only when experiment bounds/stop rules are uncontainable or required host authorization is denied. Missing test execution or runtime packages yields proposal-only output with `missing_evidence`, not BLOCKED.

## Handoff Payload

- `slug`, `operator_profile`, scope, critical `HYP`, bounded `EXP`, primary/guardrail `MET` refs, validation results/limitations, proposed/recorded `DEC`, outcome-keyed next workflow.
- Outcome report: carry current delivery `feature_status` and parent `requirement_trace` (`brd_objectives`, `requirements`, `acceptance_criteria`, `srs`) from parent handoff unchanged (use `requirements_ready` only if this run produced an approved requirements-ready handoff for an unstarted initiative); for a new initiative without parent trace, seed `brd_objectives` only (never place product IDs in requirement IDs). Never set `blocked` for product-evidence gaps alone — record in `missing_evidence`/`decision_needed`.

## Blocking Questions

- Ask max 3 only when an unresolved choice alters experiment exposure, safety thresholds, or data authorization. Never re-ask settled facts.

## Output Template

```md
# Product Validation Plan: [Name]
## Target Hypotheses & Scope
## Experiment Method & Bounds
## Metrics & Guardrails
## Authorization & Host Controls
## Results & Evidence Analysis
## Decision Recommendation & Next Steps
## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: validate-product, feature_status: requirements_ready, started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: plan-feature, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}
## Next Workflow
plan-feature | implementation-readiness | discover-product | retro-learn | validate-product
## Cost Report
Call `get_session_cost(workflow="validate-product")` before final handoff.
```
