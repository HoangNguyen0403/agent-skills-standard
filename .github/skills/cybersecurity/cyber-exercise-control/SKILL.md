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
1. Confirm approved plan, mode per step (`analysis`, `replay`, `isolated-lab-validation`, `defensive-verification`), authorization, exclusions, runtime support, and synthetic boundaries.
2. Manage execution states using StepResult schema (`planned`, `eligible`, `running`, `completed`, `blocked`, `stopped`, `failed`, `dependency-blocked`).
3. Publish schedule and injects with step ID, trigger, expected channel, limits, and abort conditions.
4. Stop immediately on expiry, drift, unsafe impact, data exposure, or operator signal; host stop dominates concurrent dispatch.
5. Record partial receipts upon cancellation; execute teardown under surviving authority; disclose residual state in CleanupResult.
6. Mark steps lacking predecessor evidence as `dependency-blocked` with `evidence-missing` naming producer; advance independent permitted steps.
7. Restart requires explicit restart authority, reconciled residual boundary, fresh host proofs, new attempt ID, fresh correlation key, and a fresh GateDecision.
## Rules

- Coordinate safety and lifecycle; do not issue attack commands, alter production, handle real credentials, or contact real targets.
- StepResult invariants: `block_reason` required on `blocked`, `stopped`, `failed`, `dependency-blocked`; null on `planned`, `eligible`, `running`, `completed`.
- Adverse timeline dominance: Host enforces constraints continuously. Pre-dispatch failure is `blocked`; running failure, drift, or stop transitions to `stopped` with partial receipts (never merely `blocked`).
- Lost acknowledgement: If action or cancellation acknowledgement is lost, stop dispatch immediately to reconcile unknown in-flight effects; automatic active replay is strictly prohibited.
- Dependency isolation: Predecessor blocks never halt independent branches (AC-CLV-09); missing producer evidence marks dependent steps `dependency-blocked` without guessing inputs (AC-CLV-10).
- Teardown lifecycle: Cleanup requires valid surviving teardown authority; unverified teardown reports `residual` or `unverified` with accountable owner (AC-CLV-13).
- Terminal attempt immutability: Reusing prior or expired gates is forbidden; restarts require explicit restart authority, reconciled residual boundary, fresh proofs, and a new attempt/gate (AC-CLV-06).
- Hand observations to independent adjudication; preserve evidence and ground truth separately.
## Anti-Patterns

- **No silent scope change**: Pause and re-authorize.
- **No self-adjudication**: Control does not grade its own outcome.
- **No fake safety**: Markdown cannot enforce runtime restrictions.
- **No forced continuity**: Stop is valid evidence.

## References

- [Control log](references/control-log.md)
- [Lab execution gate and lifecycle](../cyber-lab-validation/references/execution-gate.md)
- [Runtime authorization matrix](../cyber-authorization/references/runtime-authorization-matrix.md)
