# Quick-start example: a small orders API

Assume an authenticated client needs to create and inspect orders. Define a versioned resource API with a stable JSON contract.

## Endpoints

```text
GET    /v1/orders?status=paid&limit=20&cursor=abc   List the caller's orders
POST   /v1/orders                                  Create an order
GET    /v1/orders/{orderId}                         Get one authorized order
PATCH  /v1/orders/{orderId}                         Change allowed mutable fields
DELETE /v1/orders/{orderId}                         Cancel an unpaid order
```

The server authenticates the caller and scopes every query by the caller's account. It allows at most 100 results per page, sorts by `createdAt` descending plus `id` as a tie-breaker, and returns a cursor for the next page.

## Create request and response

```http
POST /v1/orders HTTP/1.1
Authorization: Bearer <access-token>
Idempotency-Key: checkout-8f2a
Content-Type: application/json

{
  "items": [
    { "productId": "prod_42", "quantity": 2 }
  ],
  "shippingAddressId": "addr_7"
}
```

```http
HTTP/1.1 201 Created
Location: /v1/orders/ord_1001
Content-Type: application/json

{
  "id": "ord_1001",
  "status": "pending",
  "items": [
    { "productId": "prod_42", "quantity": 2, "unitPrice": 1299 }
  ],
  "total": 2598,
  "currency": "USD",
  "createdAt": "2026-07-11T04:00:00Z"
}
```

Prices and totals are computed from server-side catalog data; the client cannot set them. The idempotency key is stored with the authenticated account and request fingerprint. Repeating the same key returns the original result, while reusing it with a different payload returns `409 Conflict`.

## List and error shapes

```json
{
  "items": [
    {
      "id": "ord_1001",
      "status": "pending",
      "total": 2598,
      "currency": "USD",
      "createdAt": "2026-07-11T04:00:00Z"
    }
  ],
  "nextCursor": "eyJjcmVhdGVkQXQiOi..."
}
```

An invalid request uses the same envelope as every other endpoint:

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "One or more fields are invalid.",
    "details": [
      { "field": "items[0].quantity", "reason": "must be a positive integer" }
    ],
    "requestId": "req_abc123"
  }
}
```

Use `401` for missing or invalid authentication, `403` when the caller lacks permission, `404` when the order is not visible to that caller, and `409` when a cancellation conflicts with the current order state. Do not reveal whether another account owns a requested ID.

## Minimal implementation checklist

1. Write the OpenAPI schema for the paths, request/response types, authentication, errors, limits, and pagination.
2. Validate and authorize at the HTTP boundary; use a service layer for order rules and a repository for persistence.
3. Use a transaction or atomic store operation for idempotency records and order creation.
4. Add tests for happy paths, invalid quantities, unauthorized IDs, duplicate idempotency keys, state conflicts, pagination, and response compatibility.
5. Add structured request-ID logging, latency/status metrics, rate limits, timeouts, and redaction before exposing the API.

This pattern is intentionally small, but it demonstrates the key properties of a production API: resource-oriented paths, explicit contracts, correct status codes, safe errors, server-owned business values, authorization, bounded reads, and retry-safe writes.

