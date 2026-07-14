# Quick-start REST API example

Suppose the API manages orders. Version the public contract in the path and use resource nouns:

```text
GET    /v1/orders                 # list orders
POST   /v1/orders                 # create an order
GET    /v1/orders/{orderId}       # read one order
PATCH  /v1/orders/{orderId}       # partially update an order
DELETE /v1/orders/{orderId}       # delete an order
POST   /v1/orders/{orderId}/cancel # explicit non-CRUD action
```

Use cursor pagination on the list endpoint:

```http
GET /v1/orders?limit=20&cursor=eyJpZCI6MTB9
Accept: application/json
Authorization: Bearer <token>
```

```json
{
  "data": [
    { "id": "ord_123", "status": "pending" }
  ],
  "pagination": {
    "nextCursor": "eyJpZCI6MjB9",
    "hasNextPage": true,
    "limit": 20
  }
}
```

Enforce a default `limit` of `20`, a maximum of `100`, and reject larger values. Use `201 Created` for `POST /v1/orders`, include `Location: /v1/orders/ord_123`, and return `204 No Content` when cancellation or deletion succeeds without a representation. Use `400`, `401`, `403`, `404`, `409`, `422`, `429`, and `500` according to the failure semantics rather than returning `200` for errors.

For validation failures, use a stable machine-readable shape:

```json
{
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": [
    { "field": "items", "message": "At least one item is required" }
  ]
}
```

A minimal OpenAPI 3.1 contract should describe schemas, auth, parameters, examples, and error responses. A code-first excerpt might look like this:

```yaml
openapi: 3.1.0
info:
  title: Orders API
  version: 1.0.0
paths:
  /v1/orders:
    get:
      security:
        - bearerAuth: []
      parameters:
        - name: cursor
          in: query
          schema: { type: string }
        - name: limit
          in: query
          schema: { type: integer, default: 20, minimum: 1, maximum: 100 }
      responses:
        '200':
          description: Paginated orders
        '400':
          $ref: '#/components/responses/ValidationError'
    post:
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateOrder'
      responses:
        '201':
          description: Order created
          headers:
            Location:
              schema: { type: string }
        '409':
          description: Duplicate or conflicting order
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
  responses:
    ValidationError:
      description: Request validation failed
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
  schemas:
    Error:
      type: object
      required: [status, code, message, details]
      properties:
        status: { type: integer }
        code: { type: string }
        message: { type: string }
        details: { type: array, items: { type: object } }
    CreateOrder:
      type: object
      required: [items]
      properties:
        items: { type: array, minItems: 1 }
```

Require authentication by default, validate and sanitize all path/query/body inputs, require JSON content types where applicable, and emit `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`. Keep each major version in its own route module; when retiring `/v1`, advertise `Deprecation: true`, a `Sunset` date, and a successor link to `/v2/orders`.

