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
2. List in-scope synthetic assets or explicitly authorized targets; list exclusions and non-goals.
3. Assign requester, approver, operator, exercise control, adjudicator, and escalation roles.
4. Record allowed actions, prohibited actions, data handling, communications, and runtime controls.
5. Define expiry, stop triggers, restart authority, evidence fields, and unresolved decisions.
6. Mark live execution `blocked` and the plan offline-only when required runtime support is absent; never imply production readiness.
7. Restart requires both current authorization and verified host enforcement of scope. Owner approval, risk acceptance, documented exceptions, or proposed compensating controls cannot waive either prerequisite; unverified alternatives keep the live lane blocked.

## Rules

- Plan only; do not include payloads, attack commands, credentials, real targets, or destructive steps.
- Treat production modifications as separately approved actions.
- Reuse [authorization](../cyber-authorization/SKILL.md), [evidence](../cyber-evidence/SKILL.md), and [mapping](../cyber-framework-mapping/SKILL.md).
- Use primary framework sources; mark uncertain mappings explicitly.
Plan evidence fields explicitly: `engagement_scope_ref`, `skill_version`, `source`, `observed_at`, `finding_status`, `evidence_refs`, `limitations`, and `accountable_owner`.

## Anti-Patterns

- **No implied authorization**: A completed plan is not approval.
- **No vague scope**: Name boundaries and exclusions.
- **No hidden runtime dependency**: State unsupported controls and block live work.
- **No team-color shortcut**: Roles do not replace authorization.

## References

- [Engagement brief](references/engagement-brief.md)
- [Canonical review artifact conventions](../../common/common-security-audit/references/trust-review-policy.md)
