# Lab Validation and Evidence Adjudication

Lab-specific validation guidelines, correlation verification, and outcome adjudication. Conforms to SRS-CLV-05, LLD-EVIDENCE, and AC-CLV-11/12/13/18.

## Canonical Schema Authority

For complete normative schema definitions, carrier structures, and legacy metadata, see the canonical [shared evidence record](../../cyber-evidence/references/evidence-record.md):
- **Base Evidence Record & Optional Metadata**: `engagement_scope_ref`, `skill_version`, `source`, `observed_at`, `finding_status`, `evidence_refs`, `limitations`, `accountable_owner`, plus optional `observer`, `method`, `expected_observation`, `authorization_ref`, `redaction_note`, and `independent_ground_truth_ref`.
- **`lab_validation` Extension**: `schema_version: 1`, `scenario_ref`, `run_id`, `attempt_id`, `step_id`, `test_id`, `mode`, `fidelity`, `gate_ref`, `action_receipt_refs`, `observation_refs`, `cleanup_ref`.
- **`ActionReceipt`**: Host-emitted execution record with `host_source`, `target_identity`, timestamps, and protected original evidence.
- **`ObservationRecord`**: Sensor/telemetry observation with `observation_id`, `action_receipt_ref`, `window`, `exercised_stages`, `method`, and redacted evidence.
- **`CleanupResult`**: Teardown lifecycle carrier with `planned_resources`, `teardown_action_refs`, `authority_ref`, `verification_refs`, `state`, and `residual_resources`.

## Mandatory Transitive Binding Verification

For paired exercised-lab claims, evidence must resolve the complete immutable reference chain:

```text
ObservationRecord.action_receipt_ref
  └──> ActionReceipt.gate_ref
         └──> GateDecision.request_ref
                └──> ActionRequest (target, input_refs)
```

### Verification Invariant
The complete, normative paired-observation acceptance predicate—including scoped key, expected entity/source, approved scenario window, exact inherited target/fixture/resource digests, unique immutable-link resolution, rejected-original preservation, scoped ID/reference collision rejection, and `telemetry-gap` fallback—is defined in [Binding, Inherited-Value Agreement, and Collision Validation](../../cyber-evidence/references/evidence-record.md#binding-inherited-value-agreement-and-collision-validation). Apply that predicate before classifying any paired defensive outcome. This reference is not a shortened alternative rule.

## Lab Outcome Adjudication Guidelines

### Purple Defensive Outcomes
- `blocked`: Action was denied by pre-action authorization/runtime gates or could not run. Never label `blocked` as `prevented`.
- `prevented`: Evidenced control interruption halted the action in-flight before target impact.
- `detected`: Validated `ObservationRecord` confirms behavioral telemetry identified the action within the defined window.
- `responded`: Independently evidenced, authorized mitigation was triggered in response to detection. Detection alone does not prove response.
- `telemetry-gap`: An executed `ActionReceipt` exists, but no usable matching `ObservationRecord` was captured within the window (AC-CLV-12). An observation alone cannot prove an action occurred.

### Finding Status & Corroboration Rules
- Use canonical finding status definitions from [evidence-record.md](../../cyber-evidence/references/evidence-record.md).
- `confirmed` applies when a finding is corroborated by verified evidence (supplied or exercised).
- `blocked` finding status indicates an evidence-backed unresolved validation barrier; it is NOT mechanically copied from workflow `step_state`.
- `not-tested` applies when NO supplied or exercised evidence exists (AC-CLV-11).
- **Retest Preservation Rule (IR03)**: When a lab retest step is blocked (e.g., `step_state: blocked/unsupported-runtime`), prior corroborated findings from source analysis or supplied evidence remain `confirmed` or `suspected` with appropriate limitations; attempting a blocked retest does NOT erase prior findings or overwrite them as `not-tested`.
- **Failed Reproduction (AC-CLV-18)**: A completed action that fails to reproduce a vulnerability yields a negative/insufficient result; it does NOT prove vulnerability absence or warrant `false-positive` without independent corroborating evidence.

### Cleanup Adjudication (AC-CLV-13)
- `verified-clean`: Independent observation confirms all planned resources were removed.
- `residual`: Unremoved resources remain; lists exact surviving items and accountable owner.
- `unverified`: Teardown was attempted or failed, but independent inspection could not confirm removal. Never report clean when unverified.
- `not-applicable`: Valid for any mode creating no lab state, with explicit rationale (e.g., analysis, offline replay, or read-only defensive verification).
- Teardown requires surviving authority even after expiry or operator stop.

### Non-Bypass Invariant (AC-CLV-19)
- Urgent operational framing, simulated incidents, or blue-team defense context can NEVER override target exclusions, bypass host gates, or permit ambient credentials.
