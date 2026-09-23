# Publish Notes

Draft user-facing release notes, store changelogs, and internal publish summaries.

**Input:** $ARGUMENTS

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.

## Instructions

Execute the following steps for **$ARGUMENTS**.


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
4. Verify and persist:
   - Cross-check notes against shipped scope.
   - Remove unshipped claims.
   - Write the run record to `artifacts/runs/[slug]/[compactISO]-publish-notes.json` when file writes are allowed.
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
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: publish-notes, feature_status: released, started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: retro-learn, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}

## Next Workflow

retro-learn

## Cost Report
Call `get_session_cost(workflow="publish-notes")` before final handoff.
```
