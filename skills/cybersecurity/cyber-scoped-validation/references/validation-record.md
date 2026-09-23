# Scoped Validation Record

```text
engagement_scope_ref: [approved reference]
claim: [single bounded claim]
skill_version: [skill ID and version]
source: [synthetic fixture or approved observation source]
observed_at: [UTC timestamp]
finding_status: confirmed | suspected | blocked | not-tested | false-positive
evidence_refs: [redacted IDs or hashes]
limitations: [coverage and control gaps]
accountable_owner: [role]
```

Attach preflight results for tool, credential, filesystem, network, logging, and cancellation controls. Stop on expiry, drift, unsafe impact, or operator stop. Route final status to independent adjudication.
