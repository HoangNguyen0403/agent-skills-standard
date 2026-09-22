Assumption: the approved synthetic claim is **“A synthetic authentication event is redacted before evidence storage.”** No live runtime target, credentials, or network access are required.

```yaml
engagement_scope_ref: "SYNTH-VAL-001"
skill_version: "cyber-scoped-validation"
authorization_window: "2026-09-22T00:00:00+07:00/2026-09-22T23:59:59+07:00"
exclusions:
  - live targets
  - exploit scripts or operational attack commands
  - malware
  - exfiltration
  - credential collection

claim: "A synthetic authentication event is redacted before evidence storage."
expected_observation: "Credential and token fields are replaced with [REDACTED]; non-sensitive event metadata remains."

preflight:
  tool_allowlist: "offline parser and fixture comparison only"
  credential_source: "none"
  filesystem: "synthetic fixture and redacted output only"
  network: "disabled"
  logging: "local validation log with sensitive values excluded"
  cancellation: "operator stop available"

validation_mode: "safe offline analysis"
observation_count: 1
observed_at: "2026-09-22T10:00:00+07:00"
source: "synthetic fixture AUTH-EVENT-001"
evidence_refs:
  - "artifacts/security-review.md#SYNTH-VAL-001"
  - "redacted://AUTH-EVENT-001"
redacted_evidence:
  input: '{"event":"login","user":"[REDACTED]","password":"[REDACTED]","token":"[REDACTED]"}'
  output: '{"event":"login","user":"[REDACTED]","password":"[REDACTED]","token":"[REDACTED]"}'
finding_status: "supported-offline"
limitations:
  - "Synthetic offline validation only; runtime efficacy was not tested."
  - "No claim is made about compliance, authorization, or production effectiveness."
accountable_owner: "Security Validation Owner"
independent_review: "Required before acceptance or closure."
```

Stop and mark the result `blocked` if any runtime control is missing, scope drifts, the authorization window expires, unsafe impact appears, or the operator requests cancellation. If the observation cannot be reproduced, record `not-tested`, `suspected`, or `false-positive` as applicable rather than treating missing evidence as a pass.
