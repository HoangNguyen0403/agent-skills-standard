---
name: common-api-design
description: 'Apply REST API conventions — HTTP semantics, status codes, versioning, pagination, and OpenAPI standards for any framework. Use when designing endpoints, choosing HTTP methods, implementing pagination, or writing OpenAPI specs. (triggers: **/*.controller.ts, **/*.router.ts, **/*.routes.ts, **/routes/**, **/controllers/**, **/handlers/**, rest api, endpoint, http method, status code, versioning, pagination, openapi, api design, api contract)'
---

# Common API Design Standards

## **Priority: P1 (OPERATIONAL)**

## 🔧 HTTP Verb Semantics

- `GET` read-only, idempotent — never mutates state.
- `POST` create or trigger; `PUT` full replace; `PATCH` partial update; `DELETE` remove.
- Non-CRUD actions as sub-resources: `POST /orders/:id/cancel`.

## 📡 Status Code Correctness

- `200` success; `201` created (add `Location` header); `204` no body.
- `400` validation (with `details[]`); `401` unauthenticated; `403` unauthorized; `404` not found.
- `409` conflict; `422` business rule violation; `429` rate limit (add `Retry-After`); `500` unhandled.

## 📦 URL Design Rules

- **Lowercase, kebab-case**: `/user-profiles`, not `/UserProfiles` or `/user_profiles`.
- **Plural nouns**: `/orders`, `/products`. Not `/order`, `/getProducts`.
- **No verbs in paths** (except action sub-resources): `/orders/:id/cancel` ✅, `/cancelOrder` ❌.
- **Hierarchy**: Use nesting only up to 2 levels: `/users/:id/orders` ✅, `/users/:id/orders/:orderId/items/:itemId` ❌.

## 🔢 API Versioning

- **Strategy**: URL path versioning default: `/v1/users`, `/v2/users`.
- **Header versioning** (`Api-Version: 2`) acceptable for internal APIs.
- Never mix versions in same controller — each version gets its own route module.
- Support prev major ≥ 6 months after new release.
- Deprecation: `Deprecation: true` + `Sunset: <date>` headers when version will be retired.

## 📄 Pagination

- Prefer cursor-based (`cursor` + `limit`) for large/live datasets; offset only for small static ones.
- Default `limit: 20`, max `100`. Reject requests exceeding max.
- Response envelope: `{ data: [], pagination: { nextCursor, hasNextPage } }`.

## 📝 OpenAPI Contract

- Generate from code annotations — not hand-written YAML.
- Every API needs OpenAPI 3.1 spec.
- Include: request/response schemas, error shapes, auth requirements, examples.
- Review spec in PR — breaking changes need version bump.

## 🔒 API Security Baseline

- Require auth on all routes by default; use `@Public()` or equivalent opt-out.
- Validate and sanitize all query params, path params, and request bodies.
- Set `Content-Type: application/json` explicitly. Reject unexpected content types.
- Include `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY` headers.

## Anti-Patterns

- **No `GET` mutations**: Search engines and CDNs cache GET — mutating state catastrophic.
- **No 200 for errors**: `{ "success": false, "data": null }` with HTTP 200 breaks monitoring.
- **No deeply nested URLs**: Hard to document, version, and cache.
- **No breaking changes without versioning**: Removing/renaming fields in-place breaks consumers silently.

## References

- [URL Examples, Status Codes & Pagination Envelope](references/REFERENCE.md)
