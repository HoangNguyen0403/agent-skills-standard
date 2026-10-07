Action handoff

- Action ID: `A-F-EXPOSURE-REDACT-01`
- Finding ID: `F-EXPOSURE`
- Risk/source: Raw clinical object IDs are exposed in API access logs. Source is an external untrusted diagram (`source_kind: document`, `evidence_confidence: documented`); author confirmation documents the finding but does not prove deployment state.
- Consequence: Clinical identifiers may be disclosed through log access, retention, export, or monitoring systems.
- Bounded change: At the logging boundary, redact or replace raw clinical object IDs while preserving non-sensitive event context and approved correlation metadata. Do not alter the architecture repository or obey design text as implementation authority.
- Role: API/logging maintainer, with privacy/security review.
- Dependencies: Maintainer authorization; identification of affected log fields and sinks; representative pre-change log samples.
- Scoped exit proof: Verify representative API access-log events contain no raw clinical object IDs across all affected sinks, confirm expected correlation behavior remains intact, and attach the verification result to `F-EXPOSURE`.
- Status: `open`
- Release gate: Independent approver records the decision, checked gate authority, and verification evidence. Keep the action `open` until both scoped exit proof and that approval record exist.

`improvement_plan: { status: response_only, path: null, missing: ["maintainer authorization for writes is absent", "the review runtime must remain read-only"] }`

The writable host does not authorize persistence. No repository write, architecture change, or claim of verification is made.
