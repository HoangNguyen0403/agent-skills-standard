---
name: publish-notes
description: "Draft user-facing release notes, store changelogs, and internal publish summaries."
metadata:
  internal: true
  triggers:
    keywords:
    - publish notes
    - workflow
---
# Publish Notes Skill

> [!IMPORTANT]
> Draft user-facing release notes, store changelogs, and internal publish summaries.

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.

## Instructions

When the user asks to perform this workflow, execute the following steps:


# Publish Notes Workflow

Goal: Convert verified changes into accurate user-facing and internal release notes.

## Steps

1. Gather inputs:
   - Merged commits or diff, PR description, verification report, UAT signoff, and deployment report.
   - Product or store constraints.
   - When initiative uses product evidence (`docs/product/<slug>/evidence.json`), carry measurement owner, registered MET baseline OR exact scoped exception DEC, query, instrumentation, cohort, window, guardrails, and review trigger; never fabricate agent-created baselines, approvals, or causal ROI.
   - Load `common-operator-profile`; carry inherited `operator_profile` from Handoff Payload without re-inferring it.
2. Triage impact:
   - User-facing change
   - Bug fix
   - Security or privacy note
   - Operational change
   - No-user-impact internal change
3. Draft notes:
   - Use plain language and business outcomes for every tier; `operator_profile=business` gets Public Notes as the primary artifact, Internal Notes as an appendix.
   - Keep sensitive security details high-level.
   - Respect platform character limits.
4. Verify and persist:
   - Cross-check notes against shipped scope; remove unshipped claims.
   - Separate delivery proof from observed business success: shipping verified software does not prove positive customer value or ROI. Feature `feature_status=released` is retained even when product value is pending or inconclusive.
   - Write run record to `artifacts/runs/[slug]/[compactISO]-publish-notes.json` when file writes allowed.
   - Route process lessons to `retro-learn`.
## Runtime Contract
- Use after `deploy-release` or `uat-signoff` to draft user-facing and internal release communication.
- Required inputs: shipped diff/commits plus verification or deployment report to cross-check against.
- Return BLOCKED only when no verified shipped scope exists to draft notes from. Feature released status is retained when product value is pending or inconclusive.
## Handoff Payload
- `slug`, `operator_profile`, public notes, internal notes, security/privacy notes, measurement contract refs when present, verification source, next workflow.
## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.

## Output Template

```md
# Release Notes: [Version]

## Public Notes

## Internal Notes

## Security Or Privacy Notes

## Verification Source

## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: publish-notes, feature_status: released, started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: retro-learn, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}

## Next Workflow

retro-learn

## Cost Report
Call `get_session_cost(workflow="publish-notes")` before final handoff.
```

