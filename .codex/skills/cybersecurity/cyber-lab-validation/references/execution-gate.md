# Lab Execution Gate and Lifecycle

Canonical operational gate and lifecycle contracts for isolated cyber lab validation. Conforms to SRS-CLV-02, SRS-CLV-04, LLD-GATE, and LLD-ROUTE.

## Canonical ActionRequest Schema

Emitted by a workflow or scenario executor immediately before evaluating action dispatch:

```yaml
schema_version: 1
run_id: [string, immutable execution run identifier]
attempt_id: [string, attempt identifier within run]
step_id: [string, step identifier]
test_id: [string, unique correlation identifier]
scenario_id: [string, scenario identifier]
scenario_version: [string, scenario revision]
action_id: [string, exact action identifier from approved allowlist]
action_version: [string, action version]
mode: analysis | replay | isolated-lab-validation | defensive-verification
active: true | false  # Canonical effects classifier: true for any tool, network, filesystem, credential, or host-state interaction outside supplied-artifact reasoning (including active service replay, new host collection, or environment modification). In contrast, reading a supplied synthetic event or source file without host collection/mutation is non-active (active: false) analysis and does not require disposable-isolation/host-proof checks.
target:
  lab_id: [string, disposable lab identifier]
  asset_id: [string, target synthetic asset identifier]
  fixture_revision: [string, pinned fixture revision / digest]
  identity_proof_ref: [string, reference to host isolation/identity proof]
input_refs: [list of input artifact references / digests]
dependency_refs: [list of predecessor StepResult references]
authorization_ref: [reference to active authorization record]
capability_proof_refs: [list of host capability proof IDs]
limits:  # Complete approved scenario execution limits object; no default numeric limit is invented
  duration_limit: [string / object with units and enforcement proof]
  action_count_limit: [integer]
  concurrency_limit: [integer]
  resource_effect_bounds: [object, approved memory/cpu/process limits]
  network_egress_bounds: [object, approved synthetic destination allowlist]
  filesystem_bounds: [object, disposable workspace paths and modes]
cleanup_plan_ref: [reference to teardown procedure]
```

## Canonical GateDecision Schema

Emitted by host-enforced gate immediately before dispatch. Evaluated freshly before every active action; no long-lived engagement-wide cache is valid:

```yaml
request_ref: [ActionRequest reference / hash]
decision: eligible | blocked
evaluated_at: [UTC timestamp]
valid_until: [UTC timestamp, <= earliest of authorization, proof, or scenario limit expiry]
bound_target_identity:
  lab_id: [exact bound lab identifier]
  asset_id: [exact bound asset identifier]
  fixture_revision: [exact bound fixture revision]
  identity_proof_ref: [exact bound proof reference]
bound_input_revisions: [exact validated input_refs digests]
authorization_ref: [verified active authorization reference]
capability_proof_refs: [list of verified ProofEnvelope IDs]
reason_codes: [list of block reason codes if blocked, otherwise empty]
missing_prerequisites: [list of missing capabilities, inputs, or predecessor evidence]
owner: [evaluating gate authority role / identifier]
```

## Host Capability ProofEnvelope Schema

Active execution (`active: true`) requires verified host-enforced proof envelopes (SRS:75, 103). A manifest or reviewer name alone does not prove enforcement:

```yaml
proof_id: [string, unique proof identifier]
capability_id: [enum, one of disposable-isolation, tool-allowlist, filesystem, network, credential-boundary, logging-custody, cancellation-expiry, teardown]
host_id: [string, host environment identifier]
host_version: [string, host software/runtime version]
lab_id: [string, disposable lab identifier]
target_identity: [exact bound target asset and fixture digest]
tool_action_versions: [list of verified tool and action versions]
configuration_revision: [string, host configuration digest]
method: [string, verification method, e.g., safe boundary challenge or negative egress probe]
observed_at: [UTC timestamp of observation]
valid_until: [UTC timestamp of proof expiry]
observer: [role or named individual who observed proof]
original_evidence_refs: [list of raw protected verification evidence artifacts]
redacted_evidence_refs: [list of sanitized verification evidence references]
limitations: [known host boundaries, emulation caveats, or monitoring limits]
review_status: [approved | pending-review | rejected]
```

### Required Host Capabilities Matrix

| Capability | Enforcement Owner & Proof Required for Active Work | Missing or Lost Support |
| --- | --- | --- |
| Disposable isolation | Lab host owner: observed fixture identity, namespace/container boundary, negative egress challenge. | Block active action; container label alone is not proof. |
| Tool allowlist & limits | Host owner: allowlisted action/version and verified denial of disallowed actions/inputs in same boundary. | Block active action; generic shell access unsupported. |
| Filesystem | Host owner: explicit paths/modes; observed denial outside disposable workspace, including escape boundaries. | Block writes; allow safe offline analysis. |
| Network | Host owner: approved destination identity, default-deny outbound egress verified; no public target fallback. | Block live network action. |
| Credential boundary | Host owner: synthetic least-privilege lab source; zero ambient real credentials. | Block credentialed action; never inspect real secrets to prove absence. |
| Logging & custody | Host/evidence owner: actor, action, target, start/end timestamps, protected raw evidence path. | Block action if auditability cannot be maintained. |
| Cancellation & expiry | Host/control owner: independent operator stop path, timeout expiry, demonstrated cancellation latency limit. | Block dispatch; lost path stops new dispatch and triggers surviving host stop procedure. |
| Teardown | Lab owner: bounded cleanup authority, resource inventory, teardown procedure, residual-state observation. | Block scenario if safe lifecycle cannot be guaranteed. |

## Canonical StepResult Schema and State Semantics

```yaml
schema_version: 1
run_id: [string, immutable execution run identifier]
attempt_id: [string, attempt identifier within run]
step_id: [string, step identifier]
mode: analysis | replay | isolated-lab-validation | defensive-verification
active: true | false
step_state: planned | eligible | running | completed | blocked | stopped | failed | dependency-blocked
block_reason: null | out-of-scope | policy-refused | unsupported-action | unsupported-runtime | authorization-missing | authorization-expired | operator-stop | target-drift | unsafe-impact | evidence-missing | infrastructure-failure
reason_detail: [descriptive diagnostic without sensitive payloads]
dependency_refs: [list of predecessor StepResult references]
gate_ref: [GateDecision reference, nullable for non-active analysis]
action_receipt_refs: [list of ActionReceipt references]
observation_refs: [list of ObservationRecord references]
produced_evidence_refs: [list of evidence record references]
missing_prerequisites: [list of missing items]
permitted_next_steps: [list of independent permitted step IDs]
accountable_owner: [role or named person]
cleanup_result_ref: [CleanupResult reference]
```

### State Transitions and Invariants

- Valid transitions:
  - `planned` / `eligible` -> `running` -> `completed` | `failed` | `stopped`.
  - `planned` / `eligible` -> `blocked` | `dependency-blocked`.
- `block_reason` is an impediment classification (not a finding status):
  - **Required** on `blocked`, `stopped`, `failed`, and `dependency-blocked`.
  - **Must be null** on `planned`, `eligible`, `running`, and `completed`.
- `completed` indicates that the specific bounded action finished execution; it does NOT mean a vulnerability was found/reproduced or that defense worked.
- `failed` indicates an attempted operational/tool error, NOT failed reproduction: a completed bounded action that fails to reproduce a vulnerability is `completed` with a negative claim result.
- `dependency-blocked` MUST use `block_reason: evidence-missing` and cite producer step IDs in `reason_detail`.

## Adverse Timelines, Continuous Enforcement, and Ambiguity-Safe Recovery

1. **Pre-Dispatch vs. Running Failure Dispositions**:
   - Host must enforce constraints continuously throughout execution, not merely at dispatch.
   - Pre-dispatch constraint/target failure yields `blocked` (`blocked/target-drift`, `blocked/unsupported-runtime`, etc.).
   - Once a step is `running`, any target drift, control loss, operator stop, or expiry MUST transition to `stopped` with recorded partial action receipts, **never downgraded to merely `blocked`** to conceal partial execution (SRS:114).
2. **Lost Acknowledgement & Unknown Effects Reconciliation**:
   - Dispatch identity is `(run_id, attempt_id, step_id, action_id)`.
   - If an action completion acknowledgement or cancellation acknowledgement is lost, host execution state is unknown.
   - **Stop dispatch immediately**. Do NOT trigger automatic active replay or assume failure/success.
   - Escalate to the accountable owner for independently authorized host inspection/resource reconciliation. If the effect cannot be established, record unknown and stop that branch. No clean claim until reconciled.
3. **Restart Discipline**:
   - Terminal attempts (`stopped`, `failed`, `blocked`) are immutable and preserved.
   - Restarting requires:
     1. Explicit restart authority from the designated approver.
     2. Reconciled residual resource boundary from prior attempts.
     3. Fresh host capability proofs and valid authorization.
     4. Newly allocated `attempt_id` and fresh correlation key `(run_id, attempt_id, test_id)`.
     5. Completely fresh `GateDecision`. A fresh gate alone is insufficient if residual resources are unreconciled or restart authority is absent.
4. **Evidence De-duplication**:
   - Repeated delivery of byte-identical records/references is de-duplicated by content identity; it is never counted as a second action or proof. Conflicting records under reused keys are rejected and preserved for review.
   - Do NOT repeat an underlying active action to repair a missing log.
5. **Observation Timeout**:
   - If an exercised action finishes but the observation window expires without telemetry, the outcome is `telemetry-gap`.
   - Authorized collection review only; no automatic extra active probing.
6. **Dependency Semantics & Independent Continuation**:
   - A consumer step requires the specified predecessor evidence artifact/predicate, not producer `completed` alone.
   - Supplied independent evidence may satisfy a declared alternate input only when the scenario explicitly permits it; provenance and fidelity are carried forward.
   - A blocked predecessor step never halts independent branches. Safe offline analysis, remediation drafting, or independent permitted steps continue execution.
7. **Surviving Teardown Authority**:
   - Teardown procedures require valid surviving authority. If primary operational authorization expires or halts, cleanup continues exclusively under explicit surviving teardown authority.
