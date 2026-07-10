---
name: publish-notes
description: "Draft user-facing release notes, store changelogs, and internal publish summaries."
metadata:
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
   - Merged commits or diff
   - PR description
   - Verification report, UAT signoff
   - Deployment report
   - Product or store constraints
   - Load `common-operator-profile`; carry the inherited `operator_profile` from the Handoff Payload without re-inferring it.
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
4. Verify:
   - Cross-check notes against shipped scope.
   - Remove unshipped claims.
   - Route process lessons to `retro-learn`.

## Runtime Contract
- Use after `deploy-release` or `uat-signoff` to draft user-facing and internal release communication.
- Required inputs: shipped diff/commits plus a verification or deployment report to cross-check against.
- Return BLOCKED only when no verified shipped scope exists to draft notes from.
## Handoff Payload
- `slug`, `operator_profile`, public notes, internal notes, security/privacy notes, verification source, next workflow.
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
feature_status: implemented
requirement_trace: BRD-OBJ-* -> REQ-* -> AC-* -> SRS-* -> evidence
completed_evidence: []; missing_evidence: []; decision_needed: []; recommended_next_workflow: retro-learn

## Next Workflow

retro-learn

## Cost Report
Call `get_session_cost(workflow="publish-notes")` before final handoff.
```

