# Cyber Triage

Evidence-led blue incident triage with authorization and runtime gates.

**Input:** $ARGUMENTS

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.

## Instructions

Execute the following steps for **$ARGUMENTS**.

# Cyber Triage

## Runtime Contract
Use `cyber-incident-triage` with `cyber-authorization`, `cyber-evidence`, and `cyber-framework-mapping`. Offline synthetic analysis is allowed. Active collection, isolation, deletion, credential use, network changes, or production modification require documented scope, approved operation, accountable owner, and runtime-proven controls. Independent approval is required for containment. Markdown does not enforce permissions.

## Handoff Payload
Return an evidence record containing engagement/scope reference, skill/version/source, observation time, finding status (`confirmed`, `suspected`, `blocked`, `not-tested`, `false-positive`), evidence references, limitations, and accountable owner. Preserve originals and custody details. Keep suspected, blocked, and not-tested findings visible.
Carry `feature_status`, `completed_evidence`, `missing_evidence`, `decision_needed`, `recommended_next_workflow`, engagement owner and canonical artifact path.

## Steps
1. Capture intake and claim without treating it as fact.
2. Preserve and reference original/volatile evidence before alteration.
3. Assess hypothesis, impact, urgency, and lifecycle separately; map framework edges with explicit source and review status.
4. Recommend containment only after authorization, runtime, and independent-approval checks; otherwise mark blocked and continue safe offline analysis.
5. Produce `artifacts/security-review.md` as the canonical finding artifact when a security review is requested; include blockers, warnings, evidence gaps, runtime contract, and handoff notes.

## Blocking Questions
Before active operations: Is scope current and specific? Which required runtime controls are enforced? Who owns evidence custody and independently approves containment? Missing prerequisites block operations, not offline review.

## Next Workflow
Route completed evidence to `verify-work`; route missing requirements or design contracts to `implementation-readiness`/`design-solution`. Main records final verification in the SRS walkthrough.

## Output Template

```md
# Incident Triage
## Intake and Hypotheses
## Evidence, Status and Limitations
## Authorization and Runtime Gates
## Recommended Approved Action
## Outcome Report
feature_status: implemented | partially_implemented | blocked
completed_evidence: []
missing_evidence: []
decision_needed: []
recommended_next_workflow: verify-work
```
