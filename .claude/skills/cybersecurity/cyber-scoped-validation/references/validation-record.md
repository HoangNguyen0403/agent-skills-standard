# Scoped Validation Record

Records offline and supplied-evidence validation observations. Conforms to SRS-CLV-01, SRS-CLV-04, and AC-CLV-01/11.

## Record Format

```yaml
engagement_scope_ref: [approved reference]
claim: [single bounded claim]
skill_version: [skill ID and version]
source: [synthetic fixture, supplied log, or approved observation channel]
observed_at: [UTC timestamp]
finding_status: confirmed | suspected | blocked | not-tested | false-positive
evidence_refs: [redacted artifact IDs or content hashes]
limitations: [coverage boundaries and host control gaps]
accountable_owner: [role or named person]
```

## Bounded Handoff and Finding Separation (IR03)

- **Safe Offline Validation**: For static analysis, code audit, or review of supplied synthetic/redacted logs, record findings using the base format above. No live host execution is attempted.
- **Authorized Lab Validation**: When active validation against disposable synthetic fixtures in an isolated environment is requested, route to [cyber-lab-validation](../../cyber-lab-validation/SKILL.md) to attach the required `lab_validation` extension, execute host capability gates, and capture paired action receipts.
- **Separation of Finding Status from Step State**:
  - If live validation is blocked by missing runtime controls, record the step outcome as `step_state: blocked/unsupported-runtime`.
  - Prior corroborated findings from supplied evidence remain `confirmed` or `suspected` with documented limitations; attempting a blocked retest does NOT erase prior corroborated findings or overwrite them as `not-tested`.
  - Set `finding_status: not-tested` only when NO supplied or exercised finding evidence exists for that claim (AC-CLV-11).
  - `finding_status: blocked` represents an evidence-backed unresolved validation barrier; it is never mechanically copied from `step_state`.
  - Safe offline analysis, remediation drafting, or plan review continues uninterrupted.
- **Shared Canonical Schema**: For complete carrier definitions and extension details, see canonical [shared evidence record](../../cyber-evidence/references/evidence-record.md).
