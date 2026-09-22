```yaml
record_type: cyber-evidence
engagement_scope_ref: synthetic-exercise/scope-001
skill_version: cyber-evidence (version not supplied)
source: synthetic-exercise-runner
observed_at: "2026-09-22T00:00:00Z" # assumed timestamp
observer: exercise-operator-01
method: redacted HTTP validation; tool output was not independently corroborated
observation: >
  A synthetic request appeared to reach a test endpoint without the expected
  authorization control. Credentials, tokens, payloads, and personal data were
  excluded from this record.
finding_status: suspected
evidence_refs:
  - "synthetic://exercise-001/observation-004"
  - "sha256:redacted-evidence-digest"
limitations:
  - Synthetic data only; production impact and exploitability are unknown.
  - No runtime authorization telemetry or server-side audit logs were available.
  - The observation is scanner/tool-derived and lacks independent corroboration.
  - Hashes and timestamps support provenance but do not prove trusted origin or efficacy.
  - Raw evidence is retained separately from this sanitized record and contains no credentials or real secrets.
ground_truth:
  ref: "synthetic://exercise-001/ground-truth-004"
  custody: independent-exercise-controller
  comparison: pending independent adjudicator review
accountable_owner: application-security-owner
promotion_requirement: >
  An independent reviewer must corroborate the observation; the operator who
  recorded it cannot approve their own result.
canonical_artifact_action: >
  No existing workflow chain owns artifacts/security-review.md; update it only
  if this record is later attached to such a chain.
authorization_ref: null
framework_mapping_ref: null
next_steps:
  - Obtain sanitized server-side logs or a reproducible synthetic test.
  - Have an independent adjudicator compare the observation with ground truth.
  - Preserve the suspected status until corroboration or falsification.
```
