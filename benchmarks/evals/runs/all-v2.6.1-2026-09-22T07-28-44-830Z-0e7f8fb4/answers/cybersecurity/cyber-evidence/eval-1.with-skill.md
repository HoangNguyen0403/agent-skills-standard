```yaml
engagement_scope_ref: "SYNTH-EXERCISE-001"
skill_version: "cyber-evidence@loaded"
source: "synthetic exercise observation; observer notes"
observed_at: "2026-09-22T00:00:00Z"
observer: "exercise-observer"
method: "Manual review of synthetic event output; no production systems or real credentials involved"
finding_status: "suspected"
observation: "Synthetic event output indicated a possible unauthorized access attempt against the exercise service."
evidence_refs:
  - "synthetic://exercise-001/event-log-redacted"
  - "sha256:REDACTED_HASH"
redaction: "Removed tokens, credentials, personal data, host identifiers, and unnecessary payload content."
limitations:
  - "The observation is synthetic and does not establish real-world impact."
  - "No independently corroborating runtime control or source-system validation was available."
  - "The evidence is scanner/tool output without sufficient corroboration; therefore status remains suspected."
  - "Trusted origin and efficacy are not proven by the hash or timestamp."
  - "Ground truth is held separately and has not been compared in this record."
accountable_owner: "Exercise security lead"
ground_truth_ref: "held independently by exercise adjudicator; not included in this record"
adjudication: "Pending independent review; the operator cannot approve their own result."
artifact_update: "Update canonical artifacts/security-review.md if an existing workflow chain owns that artifact."
authorization_ref: null
framework_mapping_ref: null
```

Assumption: no authorization or framework-mapping evidence was supplied, so those references are intentionally absent. Raw evidence must remain separate from this sanitized record, and no real secrets or unnecessary personal data should be persisted.
