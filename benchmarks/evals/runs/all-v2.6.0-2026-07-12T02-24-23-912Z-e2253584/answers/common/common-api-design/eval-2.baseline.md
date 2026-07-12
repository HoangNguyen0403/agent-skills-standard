# Common API design anti-patterns to avoid

- **Database-shaped APIs.** Exposing tables, foreign keys, ORM fields, or internal service boundaries makes the public contract unstable and leaks implementation details. Model business resources and use response DTOs instead.
- **Inconsistent naming and semantics.** Mixing `/users`, `/getUsers`, singular paths, different casing, or endpoint-specific meanings for `status` makes clients guess. Establish conventions and apply them everywhere.
- **Using the wrong HTTP method or status code.** Treating every operation as `POST`, returning `200` for validation failures, or returning `200` with an embedded error prevents standard clients, caches, and monitoring from working correctly.
- **Uncontrolled breaking changes.** Renaming fields, changing types, removing enum values, changing pagination meaning, or altering authorization behavior without versioning or migration notice breaks existing consumers. Prefer additive evolution and publish deprecation policy.
- **No idempotency for retried writes.** A network timeout followed by a client retry can create duplicate orders, charges, or jobs. Support idempotency keys or deterministic request identities and enforce them atomically.
- **Unbounded collection endpoints.** Returning every record, accepting unlimited `limit` values, or allowing expensive arbitrary filters leads to memory, latency, and denial-of-service problems. Enforce limits, pagination, indexes, and query timeouts.
- **Leaky or ambiguous error handling.** Returning stack traces, database errors, inconsistent shapes, or only a generic `"failed"` message makes debugging unsafe and difficult. Use a stable error code, safe message, field-level details where useful, and a request ID.
- **Authorization based only on authentication.** Checking that a token is valid but not checking whether the caller may access a particular object creates IDOR/BOLA vulnerabilities. Test every resource and action against the actor and tenant boundary.
- **Trusting client input.** Accepting client-supplied ownership, prices, roles, or state transitions without server-side validation permits privilege escalation and business-logic abuse. Recompute or verify authoritative values on the server.
- **Putting secrets or sensitive data in URLs and logs.** Query strings are commonly retained by proxies, browser history, and analytics systems. Use headers or request bodies where appropriate, redact logs, and minimize returned personal data.
- **Ignoring concurrency and state transitions.** A read-modify-write flow without optimistic locking, conditional requests, or a defined transition model can lose updates or allow invalid state changes. Return conflicts clearly and make transitions explicit.
- **Overloading one endpoint.** An endpoint that changes behavior based on dozens of flags or accepts unrelated payload shapes becomes impossible to document and test. Split distinct resources or commands and keep each contract focused.
- **Chatty or overly nested APIs.** Requiring many sequential calls or deeply nested paths increases latency and couples consumers to an awkward hierarchy. Provide appropriate summaries, expansions, or purpose-built read models without duplicating uncontrolled business logic.
- **Weak filtering and sorting guarantees.** Allowing arbitrary field expressions, unstable sorting, or undocumented default order produces inconsistent pages and can expose query injection risks. Allowlist fields and define deterministic ordering.
- **No observability or contract tests.** If requests lack correlation IDs, latency/status metrics, and schema/compatibility tests, regressions are discovered by consumers. Treat the API contract and operational signals as release requirements.
- **Security through obscurity.** Hiding an endpoint or using unpredictable IDs is not authorization. Enforce authentication, authorization, validation, rate limits, and auditability independently.

The recurring lesson is to make behavior explicit and bounded: stable contracts, safe errors, enforced permissions, controlled resource usage, retry-aware writes, and documented evolution.

