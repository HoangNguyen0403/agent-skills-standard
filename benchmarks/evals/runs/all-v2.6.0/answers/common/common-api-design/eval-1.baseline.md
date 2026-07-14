# Common API design best practices

Start with the consumer-facing contract, then implement the server behind it. Define the resources, operations, inputs, outputs, error behavior, and non-functional requirements before writing handlers. Publish the contract in OpenAPI or an equivalent machine-readable format and use it to generate documentation, client types, and contract tests where practical.

## Design the interface

- Model stable business resources rather than exposing database tables or internal service calls. Use consistent nouns and resource paths, for example `/v1/orders` and `/v1/orders/{orderId}`.
- Use HTTP methods and status codes consistently: `GET` for retrieval, `POST` for creation or commands, `PUT` for full replacement, `PATCH` for partial updates, and `DELETE` for deletion. Return `201 Created` with a `Location` header for successful creation, `204 No Content` when a successful operation has no body, and meaningful `4xx` or `5xx` responses otherwise.
- Keep representations consistent. Use one naming convention, explicit types, ISO 8601 timestamps in UTC, stable identifiers, and clear nullable/optional-field semantics. Do not make clients infer meaning from undocumented fields.
- Make list endpoints predictable. Support documented filtering, sorting, and pagination; return a stable page shape such as `{ "items": [...], "nextCursor": "..." }`. Prefer cursor pagination for changing or large datasets.
- Design for retries. Make create/payment-like operations idempotent with an idempotency key or another deduplication strategy, and ensure retry-safe `PUT` and `DELETE` behavior where appropriate.

## Define errors and compatibility

Use a single error envelope across endpoints, for example:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request contains invalid fields.",
    "details": [{ "field": "email", "reason": "invalid format" }],
    "requestId": "req_123"
  }
}
```

Keep error codes stable and avoid leaking stack traces, SQL, tokens, or sensitive data. Distinguish authentication (`401`), authorization (`403`), missing resources (`404`), conflicts (`409`), validation (`400` or `422`, according to the documented convention), rate limiting (`429`), and unexpected server failures (`500`-class responses).

Choose a compatibility strategy before release. Prefer additive changes such as optional response fields and new endpoints. Do not silently change the meaning or type of an existing field. Version only when a breaking change is unavoidable, and document deprecation dates, migration guidance, and the support window.

## Build the operational and security contract

- Authenticate every protected request and authorize each action against the authenticated principal and resource. Enforce object-level authorization; knowing an ID must not grant access.
- Validate input at the boundary, constrain query sizes and upload limits, normalize carefully, and use parameterized database operations. Apply rate limits and timeouts appropriate to the operation.
- Avoid putting secrets or personal data in URLs, logs, error messages, or analytics. Use TLS, secure token handling, and least-privilege service credentials.
- Emit structured logs and metrics with a correlation/request ID, endpoint, status, latency, and outcome. Never log credentials or raw sensitive payloads. Define health, readiness, and dependency-timeout behavior for deployed services.
- Test the contract, authentication and authorization matrix, validation edges, retries, pagination, concurrency, rate limits, and backward compatibility. Include consumer-driven or schema contract tests where multiple teams depend on the API.

Finally, review the API with representative consumers. A good design is consistent, explicit, secure, observable, retry-safe, and easy to evolve without forcing unnecessary client changes.

