---
name: common-api-design
description: "REST API conventions — HTTP semantics, status codes, versioning, pagination, and OpenAPI standards applicable to any framework. (triggers: **/*.controller.ts, **/*.router.ts, **/*.routes.ts, **/routes/**, **/controllers/**, **/handlers/**, rest api, endpoint, http method, status code, versioning, pagination, openapi, api design, api contract)"
---

# Common API Design Standards

## **Priority: P1 (OPERATIONAL)**

Consistent, predictable API contracts reduce integration friction and prevent breaking changes from reaching consumers.

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

- **Strategy**: URL path versioning is the default: `/v1/users`, `/v2/users`.
- **Header versioning** (`Api-Version: 2`) is acceptable for internal APIs.
- Never mix versions in the same controller — each version gets its own route module.
- Support previous major version for minimum 6 months after a new one is released.
- Deprecation: Add `Deprecation: true` + `Sunset: <date>` headers when a version will be retired.

## 📄 Pagination

- Prefer cursor-based (`cursor` + `limit`) for large/live datasets; offset only for small static ones.
- Default `limit: 20`, max `100`. Reject requests exceeding max.
- Response envelope: `{ data: [], pagination: { nextCursor, hasNextPage } }`.

## 📝 OpenAPI Contract

- Every API MUST have an OpenAPI 3.1 spec.
- Generate spec from code annotations (not hand-written YAML) to prevent drift.
- Include: request/response schemas, error shapes, auth requirements, examples.
- Review OpenAPI spec as part of PR process — breaking changes require version bump.

## 🔒 API Security Baseline

- Require auth on all routes by default; use `@Public()` or equivalent opt-out.
- Validate and sanitize all query params, path params, and request bodies.
- Set `Content-Type: application/json` explicitly. Reject unexpected content types.
- Include `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY` headers.

## Anti-Patterns

- **No `GET` mutations**: Search engines and CDNs cache GET — mutating state is catastrophic.
- **No 200 for errors**: `{ "success": false, "data": null }` with HTTP 200 breaks monitoring.
- **No deeply nested URLs**: Hard to document, version, and cache.
- **No breaking changes without versioning**: Removing/renaming fields in-place breaks consumers silently.
