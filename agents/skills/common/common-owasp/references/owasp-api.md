# OWASP API Security Top 10 (2023) — Full Detection Signals

## API1 — Broken Object Level Authorization (BOLA)

| Signal | Example |
| ------ | ------- |
| `findById(user-supplied id)` without owner filter | `repo.findOne({ id: params.id })` — no `AND owner_id` check |
| Bulk endpoint accepts arbitrary ID array | `DELETE /items` body: `[1,2,3]` — no ownership check per item |
| Admin resource accessible via standard user route | `/api/orders/99` returns another user's order |

**Fix**: Always append `AND owner_id = currentUser.id` (or tenantId) alongside the user-supplied key.

---

## API2 — Broken Authentication

| Signal | Example |
| ------ | ------- |
| JWT missing `exp` claim | `jwt.sign({ userId }, secret)` — no `expiresIn` |
| Token not revoked on logout | Blocklist not checked; token remains valid |
| Bearer token in URL query param | `/resource?token=abc123` — logged in server access logs |
| Refresh token stored in localStorage | XSS-accessible storage for long-lived credential |

---

## API3 — Broken Object Property Level Authorization

| Signal | Example |
| ------ | ------- |
| Full ORM entity returned directly | `return await userRepository.findOne(id)` — exposes password hash |
| No DTO projection | Response includes `isAdmin`, `internalNotes`, or system fields |
| Mass assignment without allowlist | `Object.assign(entity, req.body)` — any field can be overwritten |

**Fix**: Always project to a response DTO; use `@Exclude()` or explicit field selection; allowlist writable fields.

---

## API4 — Unrestricted Resource Consumption

| Signal | Example |
| ------ | ------- |
| No max `limit` on list query | `findAll()` without `take` cap — returns all rows |
| Unbounded file upload size | No `Content-Length` or multipart size limit |
| No rate limit on heavy compute endpoint | Report generation endpoint callable unlimited times |

---

## API5 — Broken Function Level Authorization

| Signal | Example |
| ------ | ------- |
| Admin action on non-admin route | `POST /api/users/promote` — no role guard |
| Internal management endpoint in public router | `/api/internal/reset` reachable without auth |
| HTTP method not restricted | `DELETE /api/items/:id` — no admin role check |

---

## API6 — Unrestricted Business Flow Access

| Signal | Example |
| ------ | ------- |
| OTP endpoint without rate limit | `/api/auth/otp` can be called unlimited times |
| Password-reset flow without step verification | Skip token step by hitting final endpoint directly |
| Checkout flow re-entrant | Same cart can be checked out multiple times |

---

## API8 — Security Misconfiguration

| Signal | Example |
| ------ | ------- |
| Stack trace in API response body | `{ "error": "TypeError at controllers/...:42" }` |
| CORS wildcard on authenticated routes | `Access-Control-Allow-Origin: *` on `/api/profile` |
| Verbose error detail exposed | Internal DB error message returned to client |
| Default framework error handler | Unhandled exception exposes file paths or versions |

---

## API9 — Improper Inventory Management

| Signal | Example |
| ------ | ------- |
| Deprecated endpoint still active | `/api/v1/login` remains reachable alongside `/api/v2/login` |
| Undocumented internal endpoint exposed | `/api/debug/users` reachable but not in OpenAPI spec |
| No API versioning strategy | Breaking changes deployed without version bump |

---

## API10 — Unsafe Consumption of Third-Party APIs

| Signal | Example |
| ------ | ------- |
| Third-party response used without validation | `const data = await thirdParty.get(); return data.user;` — no schema check |
| Trusting `Content-Type` from external source | Parsing external response as JSON without type guard |
| Redirect followed to arbitrary URL | HTTP client auto-follows Location header from external API |

**Fix**: Validate all third-party responses against a schema (e.g., Zod); treat external data as untrusted input.
