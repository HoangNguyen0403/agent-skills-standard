# Shared Evidence Record

Use one record shape across all cyber skills:

```text
engagement_scope_ref: [approved reference]
skill_version: [skill ID and version]
source: [file, observation channel, or synthetic fixture]
observed_at: [UTC timestamp]
finding_status: confirmed | suspected | blocked | not-tested | false-positive
evidence_refs: [redacted artifact IDs or hashes]
limitations: [missing controls, coverage, or uncertainty]
accountable_owner: [role or named owner]
```

Add observer, method, expected observation, authorization reference, redaction note, and independent ground-truth reference when applicable. Keep raw evidence access-controlled; sanitize before handoff. A hash establishes content identity, not trusted origin or compliance.

For chained reviews, update `artifacts/security-review.md` instead of creating contradictory reports. Preserve earlier records and append corrections with reason and provenance.
