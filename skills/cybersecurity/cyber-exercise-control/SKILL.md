---
name: cyber-exercise-control
guardrail: true
description: Controls authorized cybersecurity exercises through inject scheduling, safety gates, stop and restart decisions, communications, and synthetic-data boundaries. Use when serving as exercise control or white-team coordinator, not as compliance assessor or whitehat operator.
metadata:
  labels: [cybersecurity, exercise-control, white-team]
  triggers:
    keywords: [exercise control, white team, exercise inject, stop exercise, restart exercise, exercise safety gate]
---
# Cyber Exercise Control

## **Priority: P0 (CRITICAL)**

Coordinate a bounded exercise; control safety and adjudication handoffs without performing attacks or certifying compliance.

## Structure

```text
cyber-exercise-control/
├── SKILL.md
├── references/control-log.md
└── evals/evals.json
```

## Workflow

1. Confirm approved plan, authorization, exclusions, runtime support, roles, and synthetic-data boundary.
2. Publish schedule and injects with owner, trigger, expected channel, and abort condition.
3. Log each release, pause, stop, restart, scope change, and escalation with time and authority.
4. Stop on authorization expiry, scope drift, unsafe impact, data exposure, or unsupported runtime.
5. Restart only after fresh authorization/runtime gates and a recorded decision.
6. Hand observations to independent adjudication; preserve evidence and ground truth separately.

## Rules

- White team means exercise control and adjudication coordination here; it does not mean compliance or whitehat testing.
- Keep offline inject design available when live controls are unsupported.
- Do not issue attack commands, alter production, handle real credentials, or contact real targets.
- Use shared evidence fields and canonical `artifacts/security-review.md` when applicable.
Control records carry `engagement_scope_ref`, `skill_version`, `source`, `observed_at`, `finding_status`, `evidence_refs`, `limitations`, and `accountable_owner`.

## Anti-Patterns

- **No silent scope change**: Pause and re-authorize.
- **No self-adjudication**: Control does not grade its own outcome.
- **No fake safety**: Markdown cannot enforce runtime restrictions.
- **No forced continuity**: Stop is valid evidence.

## References

- [Control log](references/control-log.md)
- [Authorization matrix](../cyber-authorization/references/runtime-authorization-matrix.md)
