---
name: cyber-exercise
description: "Run a bounded cybersecurity exercise workflow with authorization, runtime, control, evidence, and independent adjudication gates; supports safe offline planning when live controls are unavailable."
metadata:
  triggers:
    keywords:
    - cyber exercise
    - workflow
---
# Cyber Exercise Skill

> [!IMPORTANT]
> Run a bounded cybersecurity exercise workflow with authorization, runtime, control, evidence, and independent adjudication gates; supports safe offline planning when live controls are unavailable.

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.

## Instructions

When the user asks to perform this workflow, execute the following steps:

# Cyber Exercise

Goal: coordinate an authorized, evidence-led exercise without treating white-team control as compliance certification or host enforcement.

## Steps

1. **Plan**: Load `cyber-engagement-planning`; define objective, scope, exclusions, roles, synthetic-data boundary, evidence owner, expiry, stop, and restart terms.
2. **Authorize**: Load `cyber-authorization`; bind `engagement_scope_ref`, approved actions, exclusions, window, approver, and runtime support.
3. **Preflight**: Check tool, credential, filesystem, network, logging, and cancellation controls. If unsupported, mark live lane `BLOCKED` and continue offline plan/evidence review only.
4. **Control**: Load `cyber-exercise-control`; release injects, log decisions, stop on expiry/drift/unsafe impact, and require fresh gates before restart.
5. **Validate**: Load `cyber-scoped-validation`; validate one bounded claim using synthetic or explicitly authorized observations. Never use offensive scripts, real targets, credentials, malware, or exfiltration.
6. **Adjudicate**: Load `cyber-exercise-adjudication`; compare redacted evidence with independently held ground truth. Preserve `confirmed`, `suspected`, `blocked`, `not-tested`, and `false-positive` statuses.
7. **Report**: Load `cyber-evidence`; update `artifacts/security-review.md` when a continuous security-review chain exists. Add sparse framework edges only with primary sources and review status.

## Runtime Contract

Host runtime enforces tools, credentials, filesystem/network scope, logging, and cancellation. Markdown records intent and evidence; it cannot enforce permissions. Missing runtime support blocks live action, not safe offline planning.

## Handoff Payload

- `engagement_scope_ref`, objective, scope/exclusions, authorization window, runtime support
- control log, evidence records, independent ground-truth reference, finding statuses
- `artifacts/security-review.md` when in scope, mapping edges, limitations, accountable owner
- `feature_status`, `completed_evidence`, `missing_evidence`, `decision_needed`, `recommended_next_workflow`

## Blocking Questions

- Is authorization current, explicit, and bounded to this action?
- Which runtime controls are host-enforced, and which are unsupported?
- Who independently holds ground truth and adjudicates outcomes?

## Output Template

```md
# Cyber Exercise Report: [name]
## Scope and Authorization
## Runtime Contract
## Control Log
## Evidence and Findings
## Independent Adjudication
## Framework Edges
## Limitations and Decisions
## Outcome Report
feature_status: implemented | partially_implemented | blocked
completed_evidence: []; missing_evidence: []; decision_needed: []; recommended_next_workflow: verify-work
## Next Workflow
verify-work
```

