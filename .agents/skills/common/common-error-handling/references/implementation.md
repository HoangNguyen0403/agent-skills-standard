# Implementation Examples

## Standard Error Response Shape

Canonical nested envelope; new endpoints should return this shape.

```json
{
  "error": {
    "code": "ORDER_PAYMENT_FAILED",
    "message": "Payment method declined",
    "traceId": "abc-123-def",
    "details": []
  }
}
```

- `code`: stable `SCREAMING_SNAKE_CASE` identifier; clients branch on this, not on `message`.
- `message`: client-safe text. Never include SQL, stack traces, secrets, or internal identifiers.
- `traceId`: correlates the response with the server-side log entry.
- `details`: field-safe validation entries; omit sensitive values.

Existing application responses are a compatibility contract: align new endpoints to this envelope, but do not rewrite established client contracts solely to match the doc.
