---
name: cyber-detection-validation
guardrail: true
description: Validates defensive controls with paired authorized action and observation evidence, distinguishing blocked, prevented, detected, responded, and telemetry-gap outcomes. Use for purple-team validation design or offline fixture review; not unsanctioned testing or production efficacy claims.
metadata:
  triggers:
    files: []
    keywords:
      - purple team
      - detection validation
      - paired evidence
      - defensive validation
      - telemetry gap
      - control outcome
---
# Cyber Detection Validation

## **Priority: P0 (CRITICAL)**
No defensive outcome without linked action and observation evidence.

Input: control hypothesis, permitted action, scope/approval, mode (`analysis`, `replay`, `isolated-lab-validation`, `defensive-verification`), entity, window, expected observation, stop condition.
Process: classify active effects (`active: true` for any interaction outside supplied-artifact reasoning; reading supplied events/files is non-active analysis); verify fresh host gate before active actions; capture ActionReceipt and ObservationRecord; enforce transitive binding chain: `ObservationRecord.action_receipt_ref -> ActionReceipt.gate_ref -> GateDecision.request_ref -> ActionRequest`.
Output: purple outcome enum, finding status, evidence references, limitations, stage fidelity, owner.

## Workflow

1. Declare step mode and effects: `analysis`, `replay`, `isolated-lab-validation`, or `defensive-verification`.
2. Preflight host gate for active effects: evaluate ActionRequest and GateDecision immediately before dispatch.
3. Execute bounded action; bind ActionReceipt to correlation key `(run_id, attempt_id, test_id)`.
4. Capture ObservationRecord within defined time window; enforce unique `observation_id` and transitive binding chain.
5. Classify purple defensive outcome: `blocked`, `prevented`, `detected`, `responded`, or `telemetry-gap`.
6. Report stage fidelity: replay reports only exercised stages (e.g., parsing/correlation); lab reports observed sensor/control stages.
7. Run teardown plan; record CleanupResult (`verified-clean`, `residual`, `unverified`, `not-applicable`).

## Rules
- Active operations require fresh host capability proofs; reading supplied synthetic events without host mutation is non-active analysis. Mode never overrides active effects classification.
- Controlled synthetic fixtures only. No real credentials, malware, production targets, or data exfiltration.
- Mandatory transitive binding: ObservationRecord must uniquely resolve through ActionReceipt to GateDecision. Cross-run, cross-fixture, or conflicting keys are rejected.
- Replay stage fidelity: Replay of supplied synthetic events reports only exercised processing stages (e.g., ingestion, correlation), never sensor acquisition or prevention unless independently evidenced (AC-CLV-02).
- Telemetry gap: An exercised action without usable matching observation is `telemetry-gap` (AC-CLV-12). An observation alone cannot prove an action occurred.
- Purple enum definitions: `blocked`: denied or could not run; `prevented`: control stopped action; `detected`: observation identified behavior; `responded`: independently evidenced approved response; `telemetry-gap`: action exists without observation.
- Teardown disclosure: Incomplete or unverified cleanup reports `residual` or `unverified` with accountable owner (AC-CLV-13).
- Carry shared evidence fields from [cyber-evidence](../cyber-evidence/SKILL.md) and use [lab execution gate](../cyber-lab-validation/references/execution-gate.md) when validating in labs.
## Anti-Patterns
- Never label blocked as prevented or observation-only as detected.
- Never infer response from detection or claim efficacy/compliance from documentation.
- Never simulate a successful action when runtime or approval is absent.

## References
- [Shared evidence record](../cyber-evidence/references/evidence-record.md)
- [Lab validation and evidence record](../cyber-lab-validation/references/validation-record.md)
- [Runtime authorization matrix](../cyber-authorization/references/runtime-authorization-matrix.md)
- NIST SP 800-115: https://doi.org/10.6028/NIST.SP.800-115
- MITRE ATT&CK Evaluations: https://attackevals.mitre-engenuity.org/
