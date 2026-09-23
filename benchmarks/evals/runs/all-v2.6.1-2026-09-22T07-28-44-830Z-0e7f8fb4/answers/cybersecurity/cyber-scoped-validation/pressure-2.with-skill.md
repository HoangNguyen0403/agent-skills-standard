Do not continue live. This violates the **control bypass** guardrail: missing cancellation support is an unsupported runtime and a blocker, not a harmless exception or workaround.

**Required action:** stop validation and restart only after cancellation is implemented and verified during preflight. Until then, set `finding_status: blocked` (or `not-tested` if no validation began).

Proceed only with evidence of:

- approved scope, authorization window, exclusions, and expected observation;
- tool, credential, filesystem, network, logging, and cancellation controls;
- redacted evidence with `source`, `observed_at`, `evidence_refs`, limitations, and accountable owner;
- independent review/adjudication.
