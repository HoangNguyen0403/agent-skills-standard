# Error Response Envelope

Canonical shape for new endpoints; existing consumer responses remain a compatibility contract.

```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "The requested user does not exist.",
    "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
    "details": []
  }
}
```

Internal error text, SQL, stack traces, and secrets are never serialized. `message` is client-safe; `code` is the stable machine-readable identifier.

## Classification
| Layer          | Code                  | Strategy                                 |
| -------------- | --------------------- | ---------------------------------------- |
| Validation     | `400 Bad Request`     | Return `details[]` with field paths      |
| Authentication | `401 Unauthorized`    | Generic message — never expose reason    |
| Not Found      | `404 Not Found`       | Distinguishable from auth errors         |
| Conflict       | `409 Conflict`        | Include conflicting resource ID          |
