---
name: cyber-purple-validation
description: "Controlled purple validation using paired action-observation evidence, explicit defensive outcomes, and optional isolated lab routing."
metadata:
  internal: true
  triggers:
    keywords:
    - cyber purple validation
    - workflow
---
# Cyber Purple Validation Skill

> [!IMPORTANT]
> Controlled purple validation using paired action-observation evidence, explicit defensive outcomes, and optional isolated lab routing.

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.

## Instructions

When the user asks to perform this workflow, execute the following steps:

# Cyber Purple Validation

Goal: Validate detection and defense controls using paired action-observation evidence across replay, offline analysis, or isolated lab validation.

## Runtime Contract
Compose `cyber-detection-validation`, `cyber-authorization`, `cyber-evidence`, `cyber-framework-mapping`, and optionally `cyber-lab-validation`. Controlled synthetic/offline fixtures only. Active operations require documented scope, approved action, accountable owner, and runtime-proven controls. No Markdown claim is enforcement or production efficacy.

## Steps
1. **Hypothesis and Mode**: Define control hypothesis, entity, time window, expected observation, and stop condition. Classify step mode as `analysis`, `replay`, `isolated-lab-validation`, or `defensive-verification`.
2. **Authorize and Gate**: Obtain action-specific authorization and verify host runtime controls before active steps. If unauthorized or unsupported, record step `blocked` with reason; do not simulate success.
3. **Execute or Route**:
   - For `analysis`: inspect detection logic, queries, and configs offline.
   - For `replay`: replay synthetic telemetry through pipeline; report only stages actually exercised (e.g. parser, correlation), not sensor efficacy or prevention unless evidenced.
   - For `isolated-lab-validation`: load `cyber-lab-validation` on disposable synthetic fixtures under verified host containment.
4. **Isolate and Continue**: If an active step is blocked or refused, mark dependent verification `dependency-blocked` (`evidence-missing`). Continue independent rule tuning, detection logic, and remediation. Never fabricate evidence.
5. **Capture Paired Evidence**: Link action receipt and observation record by `(run_id, attempt_id, test_id)`, entity, time window, and source.
6. **Classify Outcome**: Classify defensive outcome strictly from paired evidence: `blocked`, `prevented`, `detected`, `responded`, or `telemetry-gap`. An action without observation is `telemetry-gap`; blocked execution is `blocked` (never prevented).
7. **Document Findings**: Record finding status, evidence references, limitations, cleanup result, and accountable owner. Use `artifacts/security-review.md` when security-review material.

## Handoff Payload
Deliver paired records, mode, exercised stages, fidelity limitations, step dispositions (`step_state`, `block_reason`), and outcome rationale. Never claim coverage, compliance, or efficacy from a single log line or report prose.
Carry `feature_status`, `completed_evidence`, `missing_evidence`, `decision_needed`, `recommended_next_workflow`, engagement owner and canonical artifact path.

## Blocking Questions
Is the action authorized and runtime-supported? Are action and observation linked by test ID/entity/window/source? Are blocked steps isolated with independent remediation continuing? Missing prerequisites block execution or dependent adjudication; missing observation is `telemetry-gap`.

## Next Workflow
Route completed evidence to `verify-work`; route contract gaps to `implementation-readiness`.

## Output Template

```md
# Purple Validation
## Hypothesis, Scope and Mode
## Action and Observation Evidence
## Outcome and Adjudication
## Limitations and Coverage Gaps
## Outcome Report
feature_status: implemented | partially_implemented | blocked
completed_evidence: []
missing_evidence: []
decision_needed: []
recommended_next_workflow: verify-work
```

