# Baseline Answer

Use a single error model with clear ownership at each layer:

1. Database access returns errors with context and preserves the original cause. The repository translates driver-specific conditions into persistence-level categories such as not found, conflict, timeout, or unavailable. It must not expose SQL, credentials, query parameters containing sensitive data, or stack traces to callers.
2. Domain logic defines business errors independently of HTTP and database packages. It validates invariants and returns typed or sentinel errors such as `ErrInvalidInput`, `ErrNotFound`, `ErrConflict`, or a domain-specific rule violation. It wraps lower-level failures when useful but does not silently convert an unknown failure into a successful result.
3. The service layer coordinates repositories and domain operations, adds operation context, and decides whether an error is retryable. It should preserve error identity so callers can classify it with `errors.Is` or `errors.As`.
4. The HTTP handler or middleware is the translation boundary. It maps known public errors to stable JSON responses and status codes—for example, validation to 400, authentication/authorization to 401/403, not found to 404, conflict to 409, and unexpected dependency or internal failures to 503/500 as appropriate. Unknown errors receive a generic message and a correlation ID, never the underlying error string.

Centralize response formatting in middleware or one error writer so every endpoint has the same shape, for example `{code, message, request_id, details}`. Keep `details` safe and defined by the API contract. Log unexpected errors once at the boundary with structured context, stack/cause information, operation name, request ID, and sanitized inputs; use metrics and tracing for counts, latency, and dependency failures. Do not log secrets or full request bodies by default.

Define an explicit retry policy. Retry only transient operations where idempotency, bounded attempts, exponential backoff, and cancellation are guaranteed. Never retry validation, authorization, conflicts, or non-idempotent writes blindly. Respect context cancellation and deadlines throughout the call chain.

Test repository translation, domain behavior, HTTP status/body mapping, unknown-error sanitization, cancellation, and retry limits. Document the public error contract and monitor error rates so operational failures are observable without leaking implementation details.
