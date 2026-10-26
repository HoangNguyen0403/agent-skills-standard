---
name: cyber-lab-validation
guardrail: true
description: Governs bounded cybersecurity validation in isolated disposable lab environments with explicit per-action gates, synthetic-data boundaries, paired evidence, and teardown verification. Use when validating authorized security claims in disposable labs; not for operational attacks or production testing.
metadata:
  labels: [cybersecurity, lab-validation, purple-team, isolated-testing]
  triggers:
    keywords: [lab validation, isolated lab, disposable lab, synthetic validation, purple lab, attack simulation lab, controlled exploit validation]
---
# Cyber Lab Validation

## **Priority: P0 (CRITICAL)**

Validate approved security claims against disposable synthetic fixtures in isolated environments under host-enforced gates; operational attacks are prohibited, and host-enforced safety boundaries remain mandatory.

## Structure

```text
cyber-lab-validation/
├── SKILL.md
└── references/
    ├── scenario-schema.md
    ├── execution-gate.md
    ├── validation-record.md
    └── scenario-catalog.md (evaluation-owned)
```

## Workflow

1. Select and validate versioned scenario against [scenario schema](references/scenario-schema.md); verify single claim, disposable target, and seven-family alignment.
2. Select declared mode: `isolated-lab-validation` or active `defensive-verification`.
3. Preflight action gate: verify ActionRequest, action allowlist, finite limits, and host capability proofs via [execution gate](references/execution-gate.md).
4. Dispatch bounded action; capture ActionReceipt bound to gate and correlation key `(run_id, attempt_id, test_id)`.
5. Capture ObservationRecord within defined window; enforce transitive binding chain to ActionReceipt.
6. On pre-dispatch failure, set `blocked`; on running drift, control loss, or operator stop, halt dispatch immediately and record partial receipts.
7. Execute surviving cleanup plan; record CleanupResult state (`verified-clean`, `residual`, `unverified`, `not-applicable`).
8. Adjudicate finding status (`confirmed`, `suspected`, `blocked`, `not-tested`, `false-positive`) and defensive outcome (`blocked`, `prevented`, `detected`, `responded`, `telemetry-gap`).

## Rules

- **Opt-in Lab Contract**: A lab label or role grants no execution authority. Host runtime enforces isolation, tools, filesystem, network, credentials, and cancellation.
- **Active Effects Classification**: Any interaction with tools, network, filesystem, credentials, or host state outside supplied-artifact reasoning is `active` and requires a fresh gate immediately before dispatch.
- **Strict Exclusions**: No production or public targets, ambient credentials, live malware, or data exfiltration. Urgent blue-team or incident framing cannot waive exclusions (AC-CLV-19).
- **Mandatory Transitive Binding**: `ObservationRecord.action_receipt_ref -> ActionReceipt.gate_ref -> GateDecision.request_ref -> ActionRequest`. Cross-run, cross-fixture, or reused keys are rejected.
- **Telemetry Gap**: An exercised action without usable observation is `telemetry-gap` (AC-CLV-12). An observation alone cannot prove action occurrence.
- **Failed Reproduction & Corroboration**: A completed action that fails to reproduce does not prove vulnerability absence (AC-CLV-18). When a retest blocks, prior corroborated findings remain intact; attempting a blocked retest never erases prior findings.
- **Teardown Disclosure**: Incomplete or unverified teardown must report `residual` or `unverified` with accountable owner (AC-CLV-13). Post-expiry teardown requires surviving authority.
- **Adverse Timelines & Recovery**: Operator stop dominates dispatch. Running failures transition to `stopped` with partial receipts. Lost acknowledgement halts dispatch to reconcile unknown effects without automatic replay. Restarts require explicit restart authority, reconciled residual boundary, fresh proofs, and a new attempt ID with fresh gate.
- **Independent Continuation**: Predecessor blocks mark dependent steps `dependency-blocked` with `evidence-missing` while independent permitted steps proceed.

## Anti-Patterns

- **No blanket lab permission**: Lab context does not waive per-action host capability verification.
- **No operational attacks**: Disposable synthetic local fixtures only; zero real credential access.
- **No unlinked observations**: Every paired claim must resolve the complete transitive binding chain.
- **No clean-by-default**: Missing cleanup verification must be disclosed as residual or unverified.
- **No pressure bypass**: Urgent operational framing cannot authorize excluded actions.

## References

- [Scenario schema](references/scenario-schema.md)
- [Execution gate and lifecycle](references/execution-gate.md)
- [Validation and evidence record](references/validation-record.md)
- [Scenario catalog](references/scenario-catalog.md) (evaluation-owned)
- [Runtime authorization matrix](../cyber-authorization/references/runtime-authorization-matrix.md)
- [Shared evidence record](../cyber-evidence/references/evidence-record.md)
