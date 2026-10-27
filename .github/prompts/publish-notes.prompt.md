---
description: "Draft user-facing release notes, store changelogs, and internal publish summaries."
---

# Publish Notes Workflow

Goal: Convert verified changes into accurate user-facing and internal release notes.

## Steps

1. Gather inputs:
   - Merged commits/diff, verification report, UAT signoff, deployment report, and STLC Stage 6 closure evidence (`skills/quality-engineering/quality-engineering-test-plan-authoring/references/lifecycle-and-roles.md`).
   - Product/store constraints, mobile platform/OS versions, and artifact build digest.
   - Product evidence contracts (`docs/product/<slug>/evidence.json`: measurement owner, MET baseline, instrumentation, guardrails).
   - Load `common-operator-profile`; carry inherited `operator_profile` without re-inferring.
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
   - Cross-check notes against verified shipped scope and closure evidence; remove unshipped, blocked, or deferred claims.
   - Separate delivery proof from customer ROI. Feature `feature_status=released` preserved when product value observations are pending.
   - Write run record to `artifacts/runs/[slug]/[compactISO]-publish-notes.json` when allowed.
   - Route process lessons, defect escapes, and release gaps to `retro-learn`.
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
