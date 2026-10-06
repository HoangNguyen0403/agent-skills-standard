---
name: implement-feature
description: "Implement an approved feature plan with fresh-context slices, TDD, evidence, and PR-ready output."
metadata:
  internal: true
  triggers:
    keywords:
    - implement feature
    - workflow
---
# Implement Feature Skill

> [!IMPORTANT]
> Implement an approved feature plan with fresh-context slices, TDD, evidence, and PR-ready output.

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.

## Instructions

When the user asks to perform this workflow, execute the following steps:


# Implement Feature Workflow

Goal: Build an approved feature through TDD slices and route completed work to verification.

1. Load the approved plan, ticket, or brief. For sufficiently specified low-risk maintenance, the approved in-chat/brief contract is sufficient; retain its acceptance criteria, decisions, and verification evidence in chat or the task report. Do not require new BRD/PRD/SRS or task-list documents, REQ/AC IDs, or document updates.
   - Governed delivery requires PRD/SRS trace, task-list slices, stable requirement/acceptance IDs, and decision trace. Update those artifacts when governed scope or behavior changes.
   - Downstream workers use assigned briefs without repeating intake. Carry `snc_tier`/`model_tier`; sensitive changes enforce a minimum medium risk tier (high when applicable). High-risk work adds architecture and security review before verification and requires human approval and independent review.
2. Prepare the workspace as project practice requires; confirm clean or intentionally dirty state and provision dependencies before tests. If install fails, report `verification_infra_failed` with exact command/error; never imply checks passed.
3. Implement slices with TDD: record observable contract, distinct fault, smallest layer, minimal cases, and focused command before tests; observe expected RED before implementation; make the smallest passing change, refactor without scope expansion, then run focused checks sequentially. Characterize legacy behavior only when needed; preserve unrelated code. Keep evidence with the task item. If unclear, root-cause debug before changing code.
4. Verify changed paths; run full suites during integration. Governed or sensitive work retains required human approvals and independent review; do not treat self-review or checks as approval. Record outcomes, changed contracts, and missing evidence in chat/task report for low-risk work or in governed trace artifacts.
5. Return risk tier, approved criteria, evidence location, and blockers to the orchestrator; do not spawn agents. The orchestrator dispatches `verify-work` or independent review to a disjoint owner with a complete brief.
## Runtime Contract
- Use for approved work. Low-risk maintenance requires a sufficient approved brief; governed work requires full PRD/SRS trace. Sensitive risk floors and high-risk gates remain mandatory.
- Return BLOCKED only when required brief/trace, owner, approval, or test lane is missing.
## Handoff Payload
- `slug`, `operator_profile`, `snc_tier`, `model_tier`, completed slices, tests run, changed contracts, requirement trace when governed, evidence location, blockers, missing evidence, decisions, next workflow.
## Blocking Questions
- Ask only for missing required brief/trace, owner, approval, or test lane.
## Output Template
```md
# Implementation Handoff
## Completed Slices
## Tests Run
## Changed Contracts
## Requirement Trace Updates (governed)
## Evidence
## Known Risks
## Outcome Report
schema_version: 1
run_id: "[run-id]"
slug: "[slug]"
workflow: implement-feature
feature_status: implemented
started_at: "[timestamp]"
completed_at: "[timestamp]"
requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}
completed_evidence: []
missing_evidence: []
decision_needed: []
recommended_next_workflow: verify-work
cost: {source: unavailable}
agent: {identity: "[agent-identity]", model: "[model]"}
```
## Next Workflow
verify-work
## Cost Report
- Call `get_session_cost(workflow="implement-feature")` before final handoff.

