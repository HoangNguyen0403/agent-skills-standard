# API Design — Reference Examples

## URL Structure

```text
GET    /v1/orders              # list (paginated)
POST   /v1/orders              # create → 201 + Location header
GET    /v1/orders/:id          # single resource
PATCH  /v1/orders/:id          # partial update
DELETE /v1/orders/:id          # remove → 204

POST   /v1/orders/:id/cancel   # action sub-resource (not a verb in base URL)
```

## Pagination Response Envelope (cursor-based)

```json
{
  "data": [{ "id": "...", "status": "pending" }],
  "pagination": {
    "nextCursor": "eyJpZCI6MTB9",
    "hasNextPage": true,
    "limit": 20
  }
}
```

## Standard Error Body

```json
{
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": [{ "field": "email", "message": "Must be a valid email address" }]
}
```

## Status Code Decision Tree

| Scenario                        | Code |
| ------------------------------- | ---- |
| Successful read                 | 200  |
| Resource created                | 201  |
| Action with no response body    | 204  |
| Malformed request / bad input   | 400  |
| Missing or invalid auth token   | 401  |
| Valid token, lacking permission | 403  |
| Resource not found              | 404  |
| Duplicate / already exists      | 409  |
| Business rule violation         | 422  |
| Rate limit exceeded             | 429  |

## Deprecation Headers

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: </v2/orders>; rel="successor-version"
```
