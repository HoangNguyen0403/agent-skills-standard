Do not return the raw Postgres message. Database errors can reveal schema details, query structure, host information, or other implementation data, and the controller should not be responsible for interpreting infrastructure failures.

Wrap the database error at the infrastructure boundary with operation context, preserving the cause for logs and diagnostics. Translate it into a safe domain or application error such as `ORDER_LOOKUP_FAILED` or `RESOURCE_CONFLICT`, depending on the classified cause. The domain error must contain no HTTP status code. A global API error handler should map that error to the appropriate status and return a stable envelope, for example:

```json
{
  "error": {
    "code": "ORDER_LOOKUP_FAILED",
    "message": "Unable to retrieve the order.",
    "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
    "details": []
  }
}
```

Log the original error, operation, relevant non-sensitive identifiers, and `traceId` on the server. Do not expose the database error or stack trace in the response. If the database error is a known constraint violation, map it to a specific safe code such as `RESOURCE_CONFLICT` and HTTP 409; otherwise use a suitable server-error mapping without leaking infrastructure details. Preserve the original cause when wrapping, and never swallow it.
