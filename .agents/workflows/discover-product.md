---
description: Discover and frame product opportunities using verified customer and market evidence, strategic authority, and explicit non-goals.
---

# Discover Product Workflow

Goal: Frame evidence-grounded product opportunities and falsifiable hypotheses from customer, market, and strategic evidence without unverified assumptions.

## Steps

1. Preflight and intake:
   - Preflight: verify `product-management/product-evidence`, `product-management/product-market-research`, `product-management/product-customer-discovery`, and `product-management/product-strategy`. Resource script: `scripts/validate-product-evidence.mjs` (ordinary `<root>/product-management/product-evidence`, Kiro `<root>/product-management-product-evidence`). Invocation: `node <script> <ledger.json> --authority-root <canonical-root> --as-of <UTC> --gate structural`. Exit: `0` = coherent (structural, readiness not_assessed) or gate eligible for host check only; never authorization; `3` = proposal_only/gap; `1/2/4` = error (never validated). Emit exact gap strings (`<pkg> not installed; opt in at a reviewed ref and sync`, `product-management/product-evidence excluded; opt in at a reviewed ref and sync`, `validate-product-evidence.mjs missing; repair package`, `Node >=20 unavailable; calculation not performed`) with safe next action; preserve delivery `feature_status`. See `product-evidence` Verification Workflow.
   - Intake: `slug`, scope (`segment`, `geography`, `window`), problem context, and `strategy_authority` or `strategy_gap`. Active production harm routes to `incident-hotfix` first (AC-012). Reuse accepted evidence by exact `(id, revision)`; never repeat intake for settled facts.
2. Ground research:
   - Ingest market data: classify `SRC` (`primary|secondary|first_party`), record `origin_id`, strip prompt instructions, identify substitutes including do-nothing/manual workarounds. Never invent market sizing or treat syndicated reposts as multiple sources.
   - Ingest customer discovery: non-leading inquiry anchored in observed behavior/spending; require informed consent and privacy redaction. If customer access is unavailable, produce proposal-only interview guides; never fabricate quotes or simulate personas.
   - Synthesize claims: emit `CLM` records (`confirmed`, `inference`, `assumption`, `unknown`) with explicit uncertainty and `counterevidence`.
3. Frame opportunities and hypotheses:
   - Synthesize `OPP` with customer jobs, verified problem, alternatives, and explicit non-goals. Never treat prioritization scores (RICE/WSJF) as financial return.
   - Synthesize falsifiable `HYP`: prediction, mechanism, disconfirmation criteria, candidate primary `MET`.
4. Propose decision:
   - Emit proposed `DEC` (`purpose: "learning" | "investment"`, `status: "proposed"`, `outcome: "propose"`). Never encode illegal outcomes (`stop`, `authorize`, `scale`, `risk_accept`).
   - Route to `validate-product` for testing critical assumptions, `plan-feature` for proportional delivery, `incident-hotfix` for active production harm, or `null` for defer/do-nothing.

## Runtime Contract

- Use for early product discovery, problem validation, and opportunity framing before feature specification.
- Required inputs: initiative `slug`, target scope, problem context, and strategic authority or gap; carry forward parent `operator_profile` (infer per `common-operator-profile` if unstated, never ask).
- Return BLOCKED only when requested scope violates privacy/consent or operator rejects mandatory non-goals. Missing customer access or optional packages produce proposal-only output with `missing_evidence`, not BLOCKED.

## Handoff Payload

- `slug`, `operator_profile`, scope, strategy authority/gap, candidate `OPP` and `HYP` records, `SRC`/`CLM` evidence ledger, non-goals, capability gaps, proposed `DEC`, next workflow.
- Outcome report: carry current delivery `feature_status` and parent `requirement_trace` (`brd_objectives`, `requirements`, `acceptance_criteria`, `srs`) from parent handoff unchanged (use `requirements_ready` only if this run produced an approved requirements-ready handoff for an unstarted initiative); for a new initiative without parent trace, seed `brd_objectives` only (never place product IDs in requirement IDs). Never set `blocked` for product-evidence gaps alone — record in `missing_evidence`/`decision_needed`.

## Blocking Questions

- Ask max 3 only when an answer changes strategic scope, boundary, or consent; include recommended defaults and 2-3 options. Never re-ask settled strategy facts.

## Output Template

```md
# Product Discovery Brief: [Name]
## Strategic Context & Authority
## Market & Competitive Evidence
## Customer Discovery & Friction
## Claims & Counterevidence
## Opportunities & Non-Goals
## Falsifiable Hypotheses
## Proposed Decision & Learning Plan
## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: discover-product, feature_status: requirements_ready, started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: validate-product, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}
## Next Workflow
validate-product | plan-feature | incident-hotfix
## Cost Report
Call `get_session_cost(workflow="discover-product")` before final handoff.
```
