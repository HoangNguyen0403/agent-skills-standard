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

1. Classify request mode (`analysis`, `replay`, `isolated-lab-validation`, `defensive-verification`) and effects: `active: true` for any interaction outside supplied-artifact reasoning (reading supplied events/files without host mutation is non-active analysis).
2. Resolve authorization record: `engagement_scope_ref`, accountable owner, approved actions, exclusions, window, stop/restart terms.
3. Confirm host runtime capability proofs for disposable isolation, tools, credentials, filesystem, network, logging, and cancellation.
4. Evaluate fresh ActionRequest and emit GateDecision immediately before each active action; verify bound target and fixture revision.
5. On pre-dispatch failure, set `blocked`; on running drift, control loss, or operator stop, transition to `stopped` with recorded partial receipts.
6. Run cleanup under surviving teardown authority; restart requires explicit authority, reconciled residual boundary, fresh proofs, and new attempt with fresh gate.
## Rules

- Active effects require fresh host capability proofs; reading supplied synthetic events or files without host collection/mutation is non-active analysis and is never blocked by live runtime prerequisites.
- Mode never overrides effects classification: active defensive verification or service replay requires the same host gates as lab testing.
- Host enforces constraints continuously. Pre-dispatch failure is `blocked`; running failure, drift, or stop transitions to `stopped` (never merely `blocked`).
- Pre-action gate recheck immediately before every active action; no long-lived engagement-wide authorization cache is valid.
- Lost acknowledgement halts dispatch to reconcile unknown in-flight effects; automatic active replay is strictly prohibited.
- Restart requires explicit restart authority, reconciled residual boundary, fresh host proofs, and new attempt ID/gate; fresh GateDecision alone is insufficient.
- Markdown records intent; host runtime enforces isolation, permissions, credentials, network, filesystem, and cancellation.
- Gate production changes independently; no operator self-approves promotion.
- Treat real credentials, production/public targets, live malware, exfiltration, and destructive commands as strictly out of scope.
- Carry shared evidence fields from [cyber-evidence](../cyber-evidence/SKILL.md) and use [canonical lab execution gate](../cyber-lab-validation/references/execution-gate.md).
## Anti-Patterns

- **No implied consent**: A ticket, chat, or plan is not authorization.
- **No stale scope**: Do not continue after expiry or scope drift.
- **No unsupported execution**: Plan safely; block live action when controls are absent.
- **No self-approval**: Separate requester, operator, and approver roles.

## References

- [Runtime and authorization matrix](references/runtime-authorization-matrix.md)
- [Lab execution gate](../cyber-lab-validation/references/execution-gate.md)
- [Evidence record](../cyber-evidence/references/evidence-record.md)
