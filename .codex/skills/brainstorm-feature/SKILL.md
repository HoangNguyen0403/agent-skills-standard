---
name: brainstorm-feature
description: "SDLC intake that turns a rough idea into an approved BRD-lite brief (Why lane) or delivery contract (Direction lane) at docs/brd/brd-[slug].md, sized by SNC tier."
metadata:
  internal: true
  triggers:
    keywords:
    - brainstorm feature
    - workflow
---
# Brainstorm Feature Skill

> [!IMPORTANT]
> SDLC intake that turns a rough idea into an approved BRD-lite brief (Why lane) or delivery contract (Direction lane) at docs/brd/brd-[slug].md, sized by SNC tier.

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.

## Instructions

When the user asks to perform this workflow, execute the following steps:


# Brainstorm Feature Workflow (BRD-lite Why / Direction Contract)

Goal: Turn rough intent into an approved, evidence-backed brief sized to the task, then hand off to planning without reopening settled decisions.

## Steps

1. Frame:
   - Load `common-decision-discipline`, `common-operator-profile`, `common-task-complexity-routing`; load `product-management/product-business-requirements` for Why lane.
   - Infer `operator_profile` (never ask). Score SNC: `tier=low` -> Quick (contract in chat, no file), `tier=medium` -> Standard, `tier=high` -> Deep. Tier only rises.
   - Lane: `business` -> Why (solution-free BRD-lite); `technical` or unclear technical direction -> Direction (delivery contract); `hybrid` -> both, compact.
   - Substantial feature discovery warrants a compact verb-object capability inventory; keep Why solution-free.
   - Bug symptom without root cause -> stop and route to `dev-fix`. Multi-subsystem idea -> list slices, brainstorm first only.
2. Ground:
   - Read smallest useful set of code, tests, docs, and existing `docs/brd|prd|srs` for slug before feasibility/AS-IS claims. Reused approved exact-revision/equivalent context skips rediscovery; missing filename never resets settled work.
   - If canonical product evidence ledger (`docs/product/<slug>/evidence.json`) exists, link exact strategy, OPP, DEC, critical assumption, and MET IDs in evidence; never duplicate editable records or mint product IDs as requirement IDs.
   - Tag each claim in Evidence ledger: `confirmed(<path>)`, `assumed`, or `unknown`.
   - Draft provisional brief; write back "You said / I assumed" unless outcome, constraints, non-goals, and ACs already stated.
3. Decide:
   - Ask only decisions changing result, safety boundary, or public contract: max 3 per round with recommended default and 2-3 options; never re-ask settled facts.
   - Why lane options: build, buy, defer, do nothing, substitute. Direction lane: 0-3 technical option cards, only when real choice exists. Carry negative evidence and legitimate no-build/defer options honestly.
   - Recommend smallest option meeting contract; if critical assumption unresolved, one cheapest to abandon.
   - For `operator_profile=business`, draft owner, SMART metric, and scope fence as one confirm-with-default round.
4. Approve and hand off:
   - Self-review: placeholders, contradictions, scope, ambiguity.
   - Interactive: end with "Reply ok or corrections"; ok sets `approval: approved(<operator>, <YYYY-MM-DD>)` for this brief only. Brief approval alone confers NO budget, exposure, pilot, or rollout consent.
   - Autonomous or channel mode with no confirmation channel: `approval: assumed-autonomous`; continue.
   - Standard/Deep: save to `docs/brd/brd-[slug].md` when writes allowed; mint slug once. Quick: carry contract and `approval` in Handoff Payload.
   - Route to `plan-feature`; when critical value hypotheses require bounded empirical testing, route to `validate-product` (when selected/installed; otherwise record exact capability gap, e.g. `product-management/product-experimentation not installed; opt in at a reviewed ref and sync`, keep hypothesis as unvalidated assumption, and route to `plan-feature`).

## Runtime Contract

- Use for rough feature, ops, process, or technical-direction ideas before a PRD exists for the slug. Brief approval does not grant deployment, spend, or runtime exposure authority.
- Required inputs: rough intent; missing owner, metric, or scope fence get drafted defaults, not a block.
- Return BLOCKED only when the operator rejects drafted defaults for owner, value, or scope.

## Handoff Payload

- `slug`, `operator_profile`, `lane`, `snc_tier`, `approval`, contract (outcome, constraints, non-goals, acceptance criteria), SMART metric (Why lane), recommended/rejected options, evidence ledger (with canonical product ledger refs when present), assumptions (flagged `assumed`), open questions, PM handoff checklist.
- Outcome report with `feature_status=requirements_ready | blocked`, requirement trace seed, completed/missing evidence, decision needed, and recommended next workflow.
## Blocking Questions

- Ask max 3 at a time with a recommended default and 2-3 options.

## Output Template

```md
# Brief: [Name]
lane: why | direction | both; snc_tier: low | medium | high; approval: pending | approved(<who>, <YYYY-MM-DD>) | assumed-autonomous
## Contract
Outcome; Constraints; Non-Goals; Acceptance Criteria
## Why
Business objective; SMART metric; users; problem; AS-IS to TO-BE; sponsor and validation owner
## Options And Recommendation
## Evidence
| Claim | Status |
## Standard And Deep Sections
Stakeholders; cost-benefit; delivery context; glossary; PM handoff checklist
## Approval
## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: brainstorm-feature, feature_status: requirements_ready, started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: plan-feature, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}
## Open Questions
## Next Workflow
plan-feature
## Cost Report
Call `get_session_cost(workflow="brainstorm-feature")` before final handoff.
```

