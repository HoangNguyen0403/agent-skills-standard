# Implementing common API design best practices

Start with a resource-oriented contract and make the HTTP behavior predictable:

1. **Model resources in URLs.** Use lowercase, kebab-case, plural nouns such as `/v1/user-profiles` and `/v1/orders`. Avoid verbs in the base path. Keep nesting shallow; `/v1/users/{userId}/orders` is reasonable, while deeply nested item paths are difficult to document and maintain.

2. **Match methods to their semantics.** Use `GET` for read-only, idempotent reads; `POST` to create a resource or trigger an explicit action; `PUT` for a full replacement; `PATCH` for a partial update; and `DELETE` to remove a resource. Model non-CRUD actions as sub-resources, for example `POST /v1/orders/{id}/cancel`, rather than `GET /cancelOrder`.

3. **Return accurate status codes.** Use `200` for a successful response, `201` for creation with a `Location` header, and `204` when the successful operation has no response body. Use `400` for malformed or invalid input, `401` when authentication is missing or invalid, `403` when the authenticated caller lacks permission, `404` for a missing resource, `409` for a duplicate or state conflict, `422` for a valid request rejected by a business rule, `429` for rate limiting, and `500` only for unexpected server failures. Do not encode errors as HTTP `200` responses.

4. **Define one consistent error shape.** For example:

   ```json
   {
     "status": 400,
     "code": "VALIDATION_ERROR",
     "message": "Request validation failed",
     "details": [
       { "field": "email", "message": "Must be a valid email address" }
     ]
   }
   ```

   Keep codes stable for clients, while allowing the human-readable message to evolve.

5. **Version deliberately.** Use URL path versioning by default, such as `/v1/orders` and `/v2/orders`. Put each major version in its own route module/controller; do not mix versions in one controller. Keep the previous major version available for at least six months after a new release when compatibility requires it. Mark retiring versions with `Deprecation: true`, a `Sunset` date, and a successor `Link` header.

6. **Paginate collection endpoints.** Prefer cursor pagination for large or changing datasets: accept `cursor` and `limit`, default to `20`, cap `limit` at `100`, and reject larger values. Return a stable envelope such as:

   ```json
   {
     "data": [{ "id": "ord_123", "status": "pending" }],
     "pagination": {
       "nextCursor": "eyJpZCI6MTB9",
       "hasNextPage": true,
       "limit": 20
     }
   }
   ```

   Offset pagination is acceptable for small, mostly static collections.

7. **Make the contract executable.** Generate an OpenAPI 3.1 document from code annotations or another code-first source. Include request and response schemas, reusable error schemas, authentication requirements, examples, pagination parameters, and documented status codes. Review the generated contract in pull requests and require a version bump for breaking changes.

8. **Apply the security baseline to every endpoint.** Require authentication by default and explicitly opt out only for public routes. Validate and sanitize path parameters, query parameters, and request bodies. Require and validate `Content-Type: application/json` for JSON requests, reject unexpected content types, and emit `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`.

Finally, test the contract at the boundary: verify method idempotency, status codes, `Location` and deprecation headers, validation details, pagination limits/cursors, authorization failures, and that no state changes occur through `GET`.

