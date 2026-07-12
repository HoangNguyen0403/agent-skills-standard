# Baseline Answer

Do not return the raw Postgres error to the client. It can disclose schema details, table or column names, SQL fragments, host information, and implementation behavior. It also couples the public API to an internal persistence technology.

Translate the database failure at the service or transport boundary into a stable application error. Classify known cases explicitly—for example, a unique-constraint violation as a conflict, a missing row as not found, and a connection or timeout failure as a dependency/service-unavailable error. Return a consistent response containing a safe public code, human-readable message, request or correlation ID, and any documented field-level details. Use appropriate HTTP statuses such as 409, 404, 503, or 500; do not expose stack traces or driver error text.

Log the original error internally with structured fields including the operation, sanitized relevant identifiers, correlation ID, and stack/context. Preserve the cause for diagnostics using error wrapping or an equivalent mechanism, but make sure serialization uses the public error rather than recursively printing the cause. Avoid treating every database error as the same status: unknown errors should produce a generic 500 response and trigger alerting according to their operational severity.

Also validate that errors are not double-logged at every layer, redact secrets and sensitive values, and test both the response contract and the fact that raw SQL/Postgres details are absent from responses and logs intended for users.
