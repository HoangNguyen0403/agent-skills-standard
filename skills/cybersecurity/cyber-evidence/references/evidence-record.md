# Canonical Shared Evidence Record

Canonical evidence schemas, correlation contracts, and outcome definitions across all cybersecurity skills. Conforms to SRS-CLV-05, LLD-EVIDENCE, and AC-CLV-11/12/13/18.

## Base Evidence Record

Required across all cyber skills and analysis modes:

```yaml
engagement_scope_ref: [approved scope reference]
skill_version: [skill ID and version]
source: [file path, observation channel, or synthetic fixture]
observed_at: [UTC timestamp]
finding_status: confirmed | suspected | blocked | not-tested | false-positive
evidence_refs: [list of redacted artifact IDs or content hashes]
limitations: [missing controls, coverage limits, or sensor gaps]
accountable_owner: [role or named individual]
```

### When-Applicable Optional Metadata (from baseline)
Add these optional fields when available:
- `observer`: [role or named person capturing the observation]
- `method`: [inspection method, analysis technique, or sensor query]
- `expected_observation`: [predicate or expected behavior from plan/scenario]
- `authorization_ref`: [reference to active authorization record]
- `redaction_note`: [summary of sanitized items or redaction applied]
- `independent_ground_truth_ref`: [reference to independently held ground truth]

## Optional `lab_validation` Extension

When evidence originates from an authorized isolated lab validation or defensive verification run, attach this extension to the base record:

```yaml
lab_validation:
  schema_version: 1
  scenario_ref: [scenario_id:version]
  run_id: [run identifier]
  attempt_id: [attempt identifier]
  step_id: [step identifier]
  test_id: [test correlation identifier]
  mode: analysis | replay | isolated-lab-validation | defensive-verification
  fidelity: supplied | replay | exercised-lab
  gate_ref: [GateDecision reference / hash]
  action_receipt_refs: [list of ActionReceipt references]
  observation_refs: [list of ObservationRecord references]
  cleanup_ref: [CleanupResult reference]
```

Legacy consumers may safely ignore this extension; consumers asserting active lab validation MUST validate it.

## Paired Carriers and Transitive Binding Chain

For paired exercised-lab claims, evidence must resolve the complete immutable reference chain:

```text
ObservationRecord.action_receipt_ref
  └──> ActionReceipt.gate_ref
         └──> GateDecision.request_ref
                └──> ActionRequest (target, input_refs)
```

### Complete ActionReceipt Schema
Immutable host-emitted receipt for an executed bounded action (SRS:124):

```yaml
run_id: [string, execution run identifier]
attempt_id: [string, attempt identifier]
step_id: [string, step identifier]
test_id: [string, unique correlation identifier]
entity: [string, system or component acted upon]
target_identity: [object, exact bound lab_id, asset_id, fixture_revision, identity_proof_ref]
action_id: [string, approved action ID]
action_version: [string, action version]
gate_ref: [GateDecision reference / hash]
started_at: [UTC timestamp]
ended_at: [UTC timestamp]
host_source: [string, host telemetry provenance or execution agent identifier]
result: success | execution-error | stopped | timed-out
original_evidence_refs: [list of protected, access-controlled raw artifacts]
```

### Complete ObservationRecord Schema
Immutable observation captured from monitoring, telemetry, or host inspection (SRS:124):

```yaml
observation_id: [string, unique within (run_id, attempt_id)]
action_receipt_ref: [ActionReceipt reference / hash, nullable/absent for unpaired analysis]
test_id: [string, matching test correlation identifier]
entity: [string, monitored entity]
window:
  start_at: [UTC timestamp]
  end_at: [UTC timestamp]
source: [string, telemetry channel, log source, or sensor]
observed_at: [UTC timestamp]
exercised_stages: [list of exercised stages, e.g., parser, correlation, alert, mitigation]
method: [string, inspection or detection method]
redacted_evidence_refs: [list of sanitized evidence references]
limitations: [telemetry blindspots, sensor delays, or filtering limits]
```

### Binding, Inherited-Value Agreement, and Collision Validation
1. **Inherited-Value Agreement**: The gate binds the request's run/attempt/step, action/version, target identity, fixture revision, and fixture-resource digests through its bound target/input revisions; the ActionReceipt must agree with those inherited values. Every observation used for a paired claim inherits run/attempt/step, gate, and complete target/fixture identity from this chain. If a carrier repeats inherited fields, they must agree exactly.
2. **Correlation Key**: `(run_id, attempt_id, test_id)` is allocated before dispatch and bound to exactly one step, action receipt, gate decision, and target/fixture revision and digest set. It is never reassigned.
3. **Rejection of Conflicting Joins**: Cross-run, cross-attempt, cross-fixture joins, and conflicting reuse of a correlation key, scoped `(run_id, attempt_id, observation_id)`, or immutable reference are strictly rejected. Conflicting originals are preserved with a provenance limitation, never overwritten or resolved by latest timestamp.
4. **De-duplication**: Byte-identical repeated delivery of the same record/reference is de-duplicated, never counted as separate proof.
5. **Paired Observation Acceptance (AC-CLV-12)**: Before any paired `prevented`, `detected`, or `responded` classification, uniquely resolve every immutable link in the complete chain above. Validate the scoped correlation key, observation entity and declared source against the expected observation, observation timing/window against the approved scenario observation window, and exact inherited target identity, fixture revision, and fixture-resource digests. Reject missing or ambiguous links, out-of-window observations, source-only or test-label-only matches, and any conflicting scoped observation ID/reference reuse. Preserve rejected originals with a provenance limitation; rejected observations cannot establish a defensive outcome. When an evidenced ActionReceipt has no usable uniquely matched ObservationRecord after validation, classify the exercise as `telemetry-gap`; an observation alone cannot prove that action occurred.

## Complete CleanupResult Schema

Records post-validation lifecycle state (SRS:134):

```yaml
run_id: [string]
attempt_id: [string]
planned_resources: [list of created temporary containers, files, routes, or processes]
teardown_action_refs: [list of executed cleanup action receipts]
authority_ref: [surviving teardown authorization reference]
verification_refs: [independent inspection receipts confirming cleanup]
state: verified-clean | residual | unverified | not-applicable
residual_resources: [list of unremoved resources if state != verified-clean]
limitations: [host inspection limitations]
accountable_owner: [role or named person]
```

### Cleanup State Rules
- `verified-clean`: Independent observation confirms all planned resources were removed.
- `residual`: Known resources remain active or unremoved; lists exact surviving items.
- `unverified`: Teardown was attempted or failed, but independent inspection could not confirm removal. Never report clean when unverified.
- `not-applicable`: Valid for any mode creating no lab state, accompanied by explicit rationale (e.g., static analysis, offline replay, or read-only defensive verification).
- Post-expiry teardown requires valid surviving teardown authority.

## Canonical Finding Status Enum

- `confirmed`: Vulnerability or security condition corroborated by verified evidence (e.g., independently corroborated supplied source/incident evidence, or paired host observations). Host receipts are NOT required for every confirmed finding—only for exercised-lab validation claims.
- `suspected`: Indicated by source analysis, uncorroborated single-channel telemetry, or preliminary pattern match without independent corroboration.
- `blocked`: Evidence-backed unresolved validation barrier (e.g., an environment constraint or security control prevents completing validation); finding status is NOT mechanically copied from workflow `step_state`.
- `not-tested`: Default finding status when NO supplied or exercised finding evidence exists (AC-CLV-11).
  - *Retest Preservation Rule*: When a retest step is blocked (e.g., `step_state: blocked`), prior corroborated findings remain `confirmed` or `suspected` with appropriate limitations; attempting a blocked retest does NOT erase prior corroborated findings or overwrite them as `not-tested`.
- `false-positive`: Claim invalidated by independent corroborating evidence. Failed reproduction alone never proves absence or justifies `false-positive` without independent proof (AC-CLV-18).

## Purple Defensive Outcome Enum

- `blocked`: Action could not run or was denied by pre-action authorization/runtime gates. Never classify `blocked` as `prevented`.
- `prevented`: Evidenced control interruption halted the action in-flight before target impact.
- `detected`: Validated `ObservationRecord` confirms behavioral telemetry identified the action within the defined window.
- `responded`: Independently evidenced, authorized mitigation was triggered in response to detection. Detection alone does not constitute response.
- `telemetry-gap`: An executed `ActionReceipt` exists, but no usable matching `ObservationRecord` was captured (AC-CLV-12). An observation alone cannot prove an action occurred.

## Replay vs. Exercised Stage Fidelity

Replay classification reports only processing stages actually exercised (e.g., parsing, ingestion, correlation), never sensor acquisition or prevention unless independently exercised and evidenced (AC-CLV-02).
