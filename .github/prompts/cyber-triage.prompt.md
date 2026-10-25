---
description: "Evidence-led blue incident triage with authorization, runtime gates, and optional isolated lab retest handoff."
---
# Cyber Triage

Goal: Triage incidents from supplied evidence, isolate blocked actions, and optionally validate findings in isolated lab environments without expanding production authority.

## Runtime Contract
Use `cyber-incident-triage` with `cyber-authorization`, `cyber-evidence`, `cyber-framework-mapping`, and optionally `cyber-lab-validation`. Offline synthetic analysis is standard. Active collection, containment, or production modification require documented scope, approved operation, accountable owner, and runtime-proven controls. Independent approval is required for containment. Markdown does not enforce permissions.

## Handoff Payload
Return an evidence record containing engagement/scope reference, mode, finding status (`confirmed`, `suspected`, `blocked`, `not-tested`, `false-positive`), step dispositions (`step_state`, `block_reason`), evidence references, limitations, and accountable owner. Preserve originals and custody details. Keep suspected, blocked, and not-tested findings visible.
Carry `feature_status`, `completed_evidence`, `missing_evidence`, `decision_needed`, `recommended_next_workflow`, engagement owner and canonical artifact path.

## Steps
1. **Intake and Triage**: Capture intake claims without treating them as facts. Perform initial triage in `analysis` mode using supplied artifacts.
2. **Preserve Evidence**: Preserve and reference original/volatile evidence before alteration. Record custody details and provenance.
3. **Assess and Map**: Assess hypothesis, impact, urgency, and lifecycle separately; map framework edges with explicit source and review status.
4. **Optional Lab Retest Handoff**: When reproducing an observed attack pattern, route to `cyber-lab-validation` on disposable synthetic fixtures under verified host isolation. Never use production environments or real credentials.
5. **Gate Containment**: Require action-specific authorization, host runtime proof, and independent approval for containment. If blocked or refused, mark step `blocked` with explicit reason (`authorization-missing`, `policy-refused`).
6. **Isolate and Continue**: Mark steps dependent on blocked actions as `dependency-blocked` (`evidence-missing`). Continue independent triage analysis, hypothesis evaluation, timeline reconstruction, and remediation recommendations.
7. **Report**: Produce `artifacts/security-review.md` as canonical finding artifact when requested; record finding status (`confirmed`, `suspected`, `blocked`, `not-tested`, `false-positive`), limitations, and handoff notes.

## Blocking Questions
Before active operations: Is scope current and specific? Which required runtime controls are host-enforced? Who owns evidence custody and independently approves containment? Are blocked operations isolated while independent analysis continues?

## Next Workflow
Route completed evidence to `verify-work`; route missing requirements or design contracts to `implementation-readiness`/`design-solution`. Main records final verification in the SRS walkthrough.

## Output Template

```md
# Incident Triage
## Intake, Hypotheses and Mode
## Evidence, Status and Limitations
## Authorization, Runtime Gates and Step Dispositions
## Recommended Approved Action
## Outcome Report
feature_status: implemented | partially_implemented | blocked
completed_evidence: []
missing_evidence: []
decision_needed: []
recommended_next_workflow: verify-work
```
