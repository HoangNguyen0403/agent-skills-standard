---
name: plan-feature
description: "Plan a feature from BRD-lite brief or clear intent into PRD (What), decisions, implementation plan, and task slices."
metadata:
  internal: true
  triggers:
    keywords:
    - plan feature
    - workflow
---
# Plan Feature Skill

> [!IMPORTANT]
> Plan a feature from BRD-lite brief or clear intent into PRD (What), decisions, implementation plan, and task slices.

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.

## Instructions

When the user asks to perform this workflow, execute the following steps:


# Feature Planning Workflow (PRD / What)

Goal: Produce a PM-owned decision-complete PRD, delivery plan, and IT Department handoff before code starts.

## Steps
1. Load context:
   - Load baseline PRD, task-linked evidence, and canonical ledger (`docs/product/<slug>/evidence.json`) with stable slug; when intent is unclear, ask which matching ticket/brief is authoritative; link strategy, OPP, DEC, assumption, and MET refs without duplicating records or minting product IDs as requirement IDs.
   - Load `product-management/product-requirements` and on-demand `references/requirements-modeling.md`; report truthfully if unavailable. For BRD-lite, also load `product-management/product-business-requirements`.
   - Load ticket text, existing specs, repository patterns, `common-operator-profile`, `common-decision-discipline`, `quality-engineering-business-analysis`, and matched framework skills.
   - Carry forward `operator_profile`, `lane`, `snc_tier`, `delivery_mode`, approval, BRD objective IDs, SMART metric, scope fence, assumptions, evidence ledger, glossary, risks, and delivery context; equivalent approved evidence suffices without separate BRD/PRD/SRS filenames, and reused approved context skips rediscovery. When a PRD relies on captured stakeholder meaning, load `product-management/product-business-requirements/references/analysis-planning-and-elicitation.md`; `requirements-modeling.md` remains the sole owner of conflict, quality-versus-need, and transition semantics.
2. Select delivery mode:
   - `brief`: approved low-risk, nonsensitive work carrying outcome, scope fence, owner, observable criteria, approval reference, and verification lane. `standard`: focused PRD; `extended`: add risk-triggered contracts, migration, capacity, failure analysis, or governance detail.
   - Missing mode is a routing decision from approved evidence and risk, never automatic brief permission. A sensitive change is always `extended` with its technical design and human gate.
3. Interview:
   - Draft provisional direction from current context before asking; ask only for business logic, scope, constraints, and acceptance criteria that cannot be inferred.
   - Ask max 3 blocking decisions at a time with recommended default and 2-3 options; treat non-critical unknowns as explicit assumptions.
   - Confirm owner, priority, and status per requirement; confirm success metrics, guardrails, and the exact approval sought.
   - Stop when requirements are actionable. Brief approval confers NO budget, exposure, pilot, or rollout consent.
4. Draft PRD in decision order:
   - Save to `docs/prd/prd-[slug].md` when file writes are allowed; in `brief` mode keep the approved ticket/session record instead. Put the decision brief first: changes, recommendation, impact if wrong, evidence and limitations, unresolved decision with owner and affected slice, approval sought, independently ready slices.
   - Then outcome/guardrails, scope/non-goals, one canonical REQ table and one AC table (owner, priority, single verification lane), open decisions, references.
   - Define each AC once; reference it elsewhere. Omit an inapplicable extension instead of writing "none"; when an extension applies, its omission is an owned blocker.
   - Substantial scope adds the capability inventory; ambiguity adds flows/decision tables. No mandatory story paraphrases or second verification matrix.
5. Create implementation plan:
   - Map each slice to requirement/AC references, owner role, repo/module, expected artifact, and verification lane; estimate it (t-shirt + confidence); keep unresolved architecture for `design-solution`.
6. Route:
   - Continue when assumptions are non-critical; return BLOCKED for missing owner, untestable AC, approval, or release constraint. Empirical hypothesis testing needed -> `validate-product` (when selected/installed; else record capability gap and route to `implementation-readiness`); architecture/contracts unclear -> `design-solution`; approved plan with trace and testable ACs -> `implementation-readiness`.
## Runtime Contract
- Use after BRD-lite or when clear feature intent exists but the PRD does not. Brief approval does not grant deployment, spend, or runtime exposure authority. Required inputs: BRD-lite or equivalent intent, plus enough context to name users, goals, and constraints. Return BLOCKED only for missing owner, untestable AC, approval, or release constraint.
## Handoff Payload
- `slug`, `operator_profile`, `lane`, `snc_tier`, `delivery_mode`, `approval`, PRD or approved ticket path/revision, source IDs, decisions, RACI, rollout notes, task slices, delivery estimate, verification plan, run record path, next workflow.
## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.
## Output Template
```md
# Feature Plan: [Name]
## Decision Brief
- Changes since approved revision: [what changed]
- Recommendation: [decision]
- Impact if wrong: [consequence]
- Evidence and limitations: [confirmed(<source>); unverified]
- Unresolved decision: [decision] — owner: [owner] — affected slice: [slice]
- Approval sought: [exact approval and authority]
- Independently ready slices: [slices]
## Outcome And Guardrails
- Outcome: [observable outcome]; guardrails: [what must not regress]
## Scope And Non-Goals
- Scope fence: [approved boundary]
- In scope: [capabilities]
- Non-goals: [exclusions]
## Requirements And Acceptance Criteria
| Req ID | Requirement | Owner | Priority | Status |
| --- | --- | --- | --- | --- |
| REQ-001 | [what must exist] | [owner] | P0/P1/P2 | [status] |

| AC ID | Req ID | Given | When | Then | Owner | Verification lane |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | [context] | [action] | [observable result] | [owner] | [lane] |

## Open Consequential Decisions
| Decision | Owner | Affected slice | Required input |
| --- | --- | --- | --- |

## Status And Receipt
- `feature_status`: [status]
- Run record: `artifacts/runs/[slug]/[run-id].json` (schema-valid is not an approval)
## References
- [approved ticket/source, revision, evidence]
## Implementation Plan, Task Slices And Verification Plan
## Next Workflow
- [design-solution | implementation-readiness]
```
## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: plan-feature, feature_status: requirements_ready, started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: design-solution, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}
## Cost Report
Call `get_session_cost(workflow="plan-feature")` before final handoff.

