---
name: cyber-purple-validation
description: "Controlled purple validation using paired action-observation evidence and explicit defensive outcomes."
metadata:
  triggers:
    keywords:
    - cyber purple validation
    - workflow
---
# Cyber Purple Validation Skill

> [!IMPORTANT]
> Controlled purple validation using paired action-observation evidence and explicit defensive outcomes.

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.

## Instructions

When the user asks to perform this workflow, execute the following steps:

# Cyber Purple Validation

## Runtime Contract
Compose `cyber-detection-validation`, `cyber-authorization`, `cyber-evidence`, and `cyber-framework-mapping`. Use controlled synthetic/offline fixtures only. Active or modifying operations require documented engagement/scope, approved action, accountable owner, and runtime-proven controls; disruptive containment requires independent approval. No Markdown claim is enforcement or production efficacy.

## Steps
1. Define control hypothesis, permitted action, entity, time window, expected observation, and stop condition.
2. Obtain authorization and verify runtime controls before any action; otherwise record blocked and do not simulate success.
3. Capture an action record and observation record linked by test ID, entity, time window, and source.
4. Classify only from paired evidence: `blocked`, `prevented`, `detected`, `responded`, or `telemetry-gap`; detection is not response.
5. Write evidence fields: engagement/scope reference, skill/version/source, observation time, finding status, evidence references, limitations, accountable owner, and framework edge provenance.
6. When findings are security-review material, use canonical `artifacts/security-review.md` with blockers, warnings, evidence gaps, and handoff notes.

## Handoff Payload
Deliver the paired records, fixture provenance, runtime/authorization result, outcome rationale, negative/untested cases, and explicit limitations. Never claim coverage, compliance, or efficacy from a single log line or report prose.
Carry `feature_status`, `completed_evidence`, `missing_evidence`, `decision_needed`, `recommended_next_workflow`, engagement owner and canonical artifact path.

## Blocking Questions
Is the action authorized and runtime-supported? Are action and observation linked by test/entity/time/source? Who independently adjudicates? Missing prerequisites block execution or adjudication; a missing observation is `telemetry-gap`, not detected.

## Next Workflow
Route completed evidence to `verify-work`; route contract gaps to `implementation-readiness`.

## Output Template

```md
# Purple Validation
## Hypothesis and Scope
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

