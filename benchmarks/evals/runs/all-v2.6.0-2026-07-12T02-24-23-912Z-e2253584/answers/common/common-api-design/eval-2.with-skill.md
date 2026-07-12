# Common API design anti-patterns to avoid

- **Mutating state with `GET`.** `GET` requests are cached, prefetched, and retried by infrastructure. A state-changing operation such as cancellation or deletion must use an appropriate method, for example `POST /v1/orders/{id}/cancel` or `DELETE /v1/orders/{id}`.

- **Using verbs or inconsistent casing in base URLs.** Avoid `/getProducts`, `/cancelOrder`, `/UserProfiles`, and `/user_profiles`. Prefer `/v1/products`, `/v1/user-profiles`, and an action sub-resource only where an operation is not ordinary CRUD.

- **Using singular or action-oriented collection names.** `/order` and `/createOrder` make resource discovery and client conventions inconsistent. Use plural nouns such as `/orders` and `POST /orders` for creation.

- **Returning `200` for failures.** A body like `{ "success": false, "data": null }` with HTTP `200` misleads monitoring, caches, and generic clients. Return the status that describes the failure and a consistent error object. Typical choices are `400` for invalid input, `401` for missing/invalid authentication, `403` for insufficient permission, `404` for missing resources, `409` for conflicts, `422` for business-rule rejection, `429` for throttling, and `500` for unexpected failures.

- **Confusing authentication and authorization.** `401` means the caller is not successfully authenticated; `403` means the authenticated caller is not allowed to perform the operation. Do not use one interchangeably with the other.

- **Using the wrong success code.** Creation should return `201` and a `Location` header for the new resource. A successful operation with no body should return `204`, not an empty `200` response when the contract says there is no representation.

- **Deeply nesting resources.** Paths such as `/users/{userId}/orders/{orderId}/items/{itemId}` become hard to document, authorize, and evolve. Keep nesting to roughly two levels and use direct resource URLs or query filters where possible.

- **Unbounded or unstable pagination.** Returning every record, accepting unlimited `limit` values, or relying on offsets for a large live dataset causes latency and duplicate/missing records. Prefer cursor plus `limit`, default to `20`, cap it at `100`, reject values above the cap, and return `data` plus `pagination.nextCursor` and `pagination.hasNextPage`.

- **Breaking an existing version in place.** Removing fields, changing meanings, or changing response shapes without a major version makes clients fail silently. Use `/v1` and `/v2` route modules, keep versions separated, and communicate retirement with `Deprecation: true` and `Sunset: <date>` headers.

- **Hand-writing an incomplete API specification.** A stale YAML file that omits error responses, authentication, schemas, or examples is not a reliable contract. Generate OpenAPI 3.1 from code annotations, review the generated spec, and version breaking changes.

- **Trusting unvalidated input or allowing unexpected content types.** Validate and sanitize every path, query, and body value; explicitly require JSON where appropriate; reject unexpected media types. Apply authentication by default and opt into public routes explicitly. Include `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY` in responses.

- **Hiding unstable implementation details in the contract.** Error codes, pagination fields, and resource representations should be intentional and documented. Keep a stable machine-readable `code`, a useful `message`, and structured `details[]` for validation errors instead of forcing clients to parse prose.

