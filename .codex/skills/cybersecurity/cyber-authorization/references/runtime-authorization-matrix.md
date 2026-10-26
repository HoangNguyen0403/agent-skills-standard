# Runtime and Authorization Matrix

Checklist and canonical operational contracts for cybersecurity exercise authorization. Conforms to SRS-CLV-02, LLD-GATE, and LLD-ROUTE. Host policy and demonstrated enforcement remain authoritative.

## Host Capability Proof Matrix

Active execution (`active: true` for any tool, network, filesystem, credential, or host-state interaction outside supplied-artifact reasoning) requires demonstrated host proofs before action dispatch:

| Capability | Enforcement Owner & Required Proof | Missing or Lost Support |
| --- | --- | --- |
| Disposable isolation | Lab host owner: observed fixture identity, namespace/container boundary, negative egress challenge. | Block active action; label alone is not proof. |
| Tool allowlist & limits | Host owner: allowlisted action/version and verified denial of unapproved tool invocations. | Block active action; generic shell access unsupported. |
| Filesystem boundary | Host owner: explicit paths/modes; observed denial outside disposable workspace, including escape boundaries. | Block writes; allow safe offline analysis. |
| Network containment | Host owner: approved synthetic destinations; default-deny outbound egress verified; no public fallback. | Block live network action. |
| Credential boundary | Host owner: synthetic least-privilege source; zero ambient or real host credentials. | Block credentialed action; never inspect real secrets to prove absence. |
| Logging & custody | Host/evidence owner: actor, action, target, start/end timestamps, protected raw evidence path. | Block action if auditability cannot be maintained. |
| Cancellation & expiry | Host/control owner: independent operator stop path, timeout expiry, demonstrated cancellation latency limit. | Block dispatch; stop in-flight actions immediately. |
| Teardown authority | Lab owner: bounded teardown procedure, surviving cleanup authority, residual-state inspection. | Block scenario if safe lifecycle cannot be guaranteed. |

## Canonical Gate Interfaces

For complete normative schema definitions, see canonical [execution gate](../../cyber-lab-validation/references/execution-gate.md):
- **ActionRequest** (SRS:88): `{schema_version: 1, run_id, attempt_id, step_id, test_id, scenario_id, scenario_version, action_id, action_version, mode, active, target, input_refs, dependency_refs, authorization_ref, capability_proof_refs, limits, cleanup_plan_ref}`.
  - *Effects Classifier (IR02)*: `active: true` for any interaction outside supplied-artifact reasoning (including active service replay, new host collection, or environment modification). In contrast, reading a supplied synthetic event or source file without host collection/mutation is non-active (`active: false`) analysis and does not require disposable-isolation/host-proof checks.
  - `target`: Complete ScenarioContract target `{lab_id, asset_id, fixture_revision, identity_proof_ref}`.
  - `limits`: Complete ScenarioContract limits object (finite duration, action count/concurrency, resource/data/effect bounds, network/filesystem limits with units and host proof).
- **GateDecision** (SRS:90): `{request_ref, decision: eligible|blocked, evaluated_at, valid_until, bound_target_identity, bound_input_revisions, authorization_ref, capability_proof_refs, reason_codes, missing_prerequisites, owner}`.
  - Evaluated freshly before every active action; expiry is no later than earliest of authorization, proof, or scenario limit expiry. No long-lived cache is valid.
- **ProofEnvelope** (SRS:103): `{proof_id, capability_id, host_id, host_version, lab_id, target_identity, tool_action_versions, configuration_revision, method, observed_at, valid_until, observer, original_evidence_refs, redacted_evidence_refs, limitations, review_status}`.

## Adverse Timelines, Continuous Enforcement, and Ambiguity-Safe Recovery (IR05)

1. **Pre-Dispatch vs. Running Failure Dispositions**:
   - Host enforces constraints continuously throughout execution.
   - Pre-dispatch constraint/target failure yields `blocked` (`blocked/target-drift`, `blocked/unsupported-runtime`, etc.).
   - Once a step is `running`, any target drift, control loss, operator stop, or expiry MUST transition to `stopped` with recorded partial action receipts, **never downgraded to merely `blocked`** to conceal partial execution.
2. **Lost Acknowledgement & Unknown Effects Reconciliation**:
   - If an action completion acknowledgement or cancellation acknowledgement is lost, host state is unknown.
   - **Stop dispatch immediately**. Do NOT trigger automatic active replay.
   - Escalate for independently authorized host inspection/resource reconciliation. If the effect cannot be established, record unknown and stop that branch. No clean claim until reconciled.
3. **Restart Discipline**:
   - Terminal attempts (`stopped`, `failed`, `blocked`) are immutable.
   - Restarting requires: (1) explicit restart authority, (2) reconciled residual resource boundary, (3) fresh host capability proofs, (4) newly allocated `attempt_id` and fresh correlation key `(run_id, attempt_id, test_id)`, and (5) a fresh `GateDecision`. A fresh gate alone is insufficient if residual resources are unreconciled or restart authority is absent.
4. **Evidence De-duplication**:
   - Byte-identical repeated deliveries are de-duplicated; never repeat an underlying active action to repair a missing log.
   - Observation timeout yields `telemetry-gap` and authorized collection review only; no automatic extra active probing.
5. **Safe Continuation & Teardown**:
   - Blocked active steps never halt independent branches. Safe offline analysis, replay of supplied artifacts, and plan drafting continue uninterrupted.
   - Teardown requires valid surviving authority, even after primary operational authorization expires or halts.

## Primary References

- [NIST SP 800-115](https://csrc.nist.gov/pubs/sp/800/115/final) (Technical Guide to Information Security Testing and Assessment)
- [NIST SP 800-53 Rev. 5](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final) (Security and Privacy Controls)
- [Canonical lab execution gate](../../cyber-lab-validation/references/execution-gate.md)
