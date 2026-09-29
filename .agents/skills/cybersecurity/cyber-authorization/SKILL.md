---
name: cyber-authorization
guardrail: true
description: Validates cyber exercise authorization, scope, exclusions, runtime controls, expiry, stop and restart gates. Use when planning or reviewing authorized security activity, scope drift, or unsupported execution environments.
metadata:
  labels: [cybersecurity, authorization, runtime-boundary]
  triggers:
    keywords: [exercise authorization, rules of engagement, scope drift, authorization expiry, runtime controls, stop condition]
---
# Cyber Authorization

## **Priority: P0 (CRITICAL)**

Gate live action with documented authority and host-enforced controls; keep offline planning available.

## Structure

```text
cyber-authorization/
├── SKILL.md
├── references/runtime-authorization-matrix.md
└── evals/evals.json
```

## Workflow

1. Classify request: offline planning, evidence review, or live action.
2. Resolve authorization record: `engagement_scope_ref`, accountable owner, approved actions, exclusions, window, stop/restart terms.
3. Confirm runtime support for tools, credentials, filesystem, network, logging, and cancellation.
4. Recheck expiry, exclusions, target identity, and scope drift immediately before each live action.
5. Stop on expiry, drift, missing control, unsafe data, or operator stop; record reason and time.
6. Restart only after a fresh gate and explicit restart authority.

## Rules

- Unsupported runtime blocks live action; it never blocks safe offline analysis or plan drafting.
- Markdown records intent; host runtime enforces permissions, credentials, network, filesystem, and cancellation.
- Gate production changes independently; no operator self-approves promotion.
- Treat credentials, real targets, malware, exfiltration, and destructive commands as out of scope here.
- Carry shared evidence fields from [cyber-evidence](../cyber-evidence/SKILL.md).
Evidence record uses `engagement_scope_ref`, `skill_version`, `source`, `observed_at`, `finding_status`, `evidence_refs`, `limitations`, and `accountable_owner`.

## Anti-Patterns

- **No implied consent**: A ticket, chat, or plan is not authorization.
- **No stale scope**: Do not continue after expiry or scope drift.
- **No unsupported execution**: Plan safely; block live action when controls are absent.
- **No self-approval**: Separate requester, operator, and approver roles.

## References

- [Runtime and authorization matrix](references/runtime-authorization-matrix.md)
- [Evidence record](../cyber-evidence/references/evidence-record.md)
