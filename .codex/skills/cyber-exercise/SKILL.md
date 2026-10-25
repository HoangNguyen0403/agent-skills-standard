---
name: cyber-exercise
description: "Run a bounded cybersecurity exercise workflow with authorization, runtime, control, evidence, and independent adjudication gates; supports safe offline planning and optional isolated lab validation."
metadata:
  internal: true
  triggers:
    keywords:
    - cyber exercise
    - workflow
---
# Cyber Exercise Skill

> [!IMPORTANT]
> Run a bounded cybersecurity exercise workflow with authorization, runtime, control, evidence, and independent adjudication gates; supports safe offline planning and optional isolated lab validation.

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.

## Instructions

When the user asks to perform this workflow, execute the following steps:

# Cyber Exercise

Goal: Coordinate an authorized, evidence-led exercise across analysis, replay, isolated lab validation, or defensive verification without conflating evidence or treating white-team control as host enforcement.

## Steps

1. **Plan**: Load `cyber-engagement-planning`; define objective, scope, exclusions, roles, synthetic-data boundary, evidence owner, expiry, stop, and restart terms.
2. **Authorize**: Load `cyber-authorization`; bind `engagement_scope_ref`, approved actions, exclusions, window, approver, and runtime support.
3. **Preflight**: Verify tool allowlists, filesystem/network boundaries, logging, and cancellation controls. If unsupported, mark active steps `blocked` and proceed with offline planning and analysis.
4. **Control**: Load `cyber-exercise-control`; release injects, log decisions, enforce stop triggers (expiry, drift, unsafe impact), and require fresh gates before restart.
5. **Route and Validate**: Select exactly one mode per step (`analysis`, `replay`, `isolated-lab-validation`, `defensive-verification`):
   - *Analysis*: Load `cyber-scoped-validation`; inspect supplied artifacts and code offline.
   - *Replay*: Load `cyber-detection-validation`; replay synthetic telemetry, reporting only pipeline stages actually exercised.
   - *Isolated Lab Validation*: Load `cyber-lab-validation`; validate bounded claims on disposable synthetic local fixtures with action-specific authorization and proven host isolation.
   - *Defensive Verification*: Load `cyber-detection-validation` under active effects gate.
6. **Isolate and Continue**: Isolate blocked steps (`blocked`, `stopped`, `failed`). Mark dependent steps `dependency-blocked` with `evidence-missing`. Continue independent permitted tasks (remediation, reporting) without disguised retries or fabricated inputs.
7. **Adjudicate**: Load `cyber-exercise-adjudication`; compare redacted evidence with independent ground truth. Classify findings (`confirmed`, `suspected`, `blocked`, `not-tested`, `false-positive`).
8. **Report**: Load `cyber-evidence`; record per-step states, mode, fidelity limits, and findings. Update `artifacts/security-review.md` when in scope.

## Runtime Contract

Host runtime enforces tools, credentials, network/filesystem boundaries, and cancellation. Markdown records intent and evidence; it cannot grant permission. Missing runtime controls block active steps, not offline analysis or independent remediation.

## Handoff Payload

- `engagement_scope_ref`, objective, mode, runtime support, control log, and per-step dispositions (`step_state`, `block_reason`)
- Paired action/observation records, fidelity limitations, independent ground-truth references, finding statuses
- `artifacts/security-review.md` when in scope, mapping edges, limitations, accountable owner
- `feature_status`, `completed_evidence`, `missing_evidence`, `decision_needed`, `recommended_next_workflow`

## Blocking Questions

- Is authorization current, explicit, and action-specific?
- Which runtime controls are host-enforced vs unsupported?
- Are blocked steps isolated, with independent remediation continuing?
- Who independently holds ground truth and adjudicates outcomes?

## Output Template

```md
# Cyber Exercise Report: [name]
## Scope and Authorization
## Mode and Runtime Contract
## Control Log and Step Dispositions
## Evidence and Findings
## Independent Adjudication
## Framework Edges
## Limitations and Decisions
## Outcome Report
feature_status: implemented | partially_implemented | blocked
completed_evidence: []
missing_evidence: []
decision_needed: []
recommended_next_workflow: verify-work
## Next Workflow
verify-work
```

