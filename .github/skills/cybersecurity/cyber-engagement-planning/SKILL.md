---
name: cyber-engagement-planning
guardrail: true
description: Drafts bounded cybersecurity engagement plans with objectives, scope, exclusions, roles, authorization, runtime controls, evidence, stop criteria, and restart gates. Use when preparing an exercise or assessment plan before execution.
metadata:
  labels: [cybersecurity, engagement-planning, scope]
  triggers:
    keywords: [engagement plan, rules of engagement, exercise plan, security assessment scope, test exclusions, stop criteria]
---
# Cyber Engagement Planning

## **Priority: P0 (CRITICAL)**

Produce a reviewable plan that separates intended activity from host-enforced permission.

## Structure

```text
cyber-engagement-planning/
├── SKILL.md
├── references/engagement-brief.md
└── evals/evals.json
```

## Workflow
1. State objective, success observation, engagement/scope reference, dates, and accountable owner.
2. Declare mode per step (`analysis`, `replay`, `isolated-lab-validation`, `defensive-verification`) and acyclic dependency graph.
3. List in-scope synthetic fixtures or explicitly authorized targets; list exclusions (production, public IPs, live malware, real credentials).
4. For isolated lab validation steps, define ScenarioContract requirements: pinned synthetic fixtures, action allowlists, finite limits, and teardown plan via [cyber-lab-validation](../cyber-lab-validation/SKILL.md).
5. Assign requester, approver, operator, exercise control, adjudicator, and escalation roles.
6. Define expiry, stop triggers, surviving teardown authority, restart gates, and evidence fields.
7. Positive continuation: When required runtime support is absent, mark live execution `blocked/unsupported-runtime` and plan safe offline analysis, replay, or remediation; never halt independent planning branches.
8. Restart requires both current authorization and verified host enforcement of scope. Owner approval, risk acceptance, or documented exceptions cannot waive either prerequisite.
## Rules

- Plan only; do not include payloads, attack commands, credentials, real targets, or destructive steps.
- Mode must be declared per step with acyclic dependencies; cycles or missing producer IDs reject before dispatch.
- Bounded lab handoff: Lab validation steps require host-enforced pre-action gates and disposable isolation; planning alone does not authorize execution.
- Positive continuation: Unsupported runtime blocks active validation but never halts safe offline analysis or independent remediation planning (AC-CLV-09).
- Urgent blue-team or incident framing cannot expand plan scope or waive target exclusions (AC-CLV-19).
- Plan evidence fields explicitly: `engagement_scope_ref`, `skill_version`, `source`, `observed_at`, `finding_status`, `evidence_refs`, `limitations`, and `accountable_owner`.
## Anti-Patterns

- **No implied authorization**: A completed plan is not approval.
- **No vague scope**: Name boundaries and exclusions.
- **No hidden runtime dependency**: State unsupported controls and block live work.
- **No team-color shortcut**: Roles do not replace authorization.

## References

- [Engagement brief](references/engagement-brief.md)
- [Lab scenario schema](../cyber-lab-validation/references/scenario-schema.md)
- [Runtime authorization matrix](../cyber-authorization/references/runtime-authorization-matrix.md)
- [Canonical review artifact conventions](../../common/common-security-audit/references/trust-review-policy.md)
