Use `db.QueryContext()` in repository code.

Why:
- it lets the caller pass a `context.Context`
- supports timeouts, cancellation, and request-scoped tracing
- avoids orphaned queries when the request is canceled

Use `db.Query()` only when you truly have no context to propagate, which is uncommon in app code.

