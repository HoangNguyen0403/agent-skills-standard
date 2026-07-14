# IDOR/BOLA audit approach

IDOR is an authorization failure: the API accepts an object identifier supplied by one user and returns or changes an object that user is not entitled to access. Test every read, update, delete, download, export, and action endpoint—not only `GET` endpoints.

## Map and inspect

Build an inventory of routes and object identifiers from path parameters, query parameters, JSON bodies, headers, GraphQL variables, and indirect IDs. Trace each identifier to its repository/ORM query and verify the lookup includes the authenticated subject, tenant, role, or an equivalent policy check. A `findById`, `findOne`, or `findByPk` without an owner/tenant constraint is a high-priority candidate, but a separate later check is not enough if another code path can race or bypass it.

Review nested-resource authorization, alternate endpoints, bulk operations, predictable IDs, UUID exposure, object existence differences, admin/support impersonation, soft-deleted records, and cross-tenant joins. Confirm authorization is enforced server-side and cannot be changed by mass-assigned fields such as `ownerId`, `tenantId`, or `role`.

## Adversarial verification

Use two ordinary users in two tenants (plus relevant roles). Capture a legitimate object ID for user A, then replay user A's read/update/delete/download requests with user B's credentials while changing only the ID. Repeat with IDs in path/query/body, nested and bulk forms, alternate HTTP methods, and direct service/GraphQL mutations. Expected behavior is a consistent 403 or privacy-preserving 404, with no data mutation, side effect, timing-sensitive disclosure, or sensitive error detail. Verify that user A still has the intended access and that tenant boundaries hold under concurrent requests.

## Remediation and evidence

Centralize policy checks and scope database queries by the authenticated principal, for example `WHERE id = ? AND tenant_id = ?`, with server-derived tenant/user values—not client input. Use deny-by-default authorization, allowlisted fields, and atomic transactions for check-and-change operations. Add regression tests for every affected operation and cross-tenant matrix, then retest through the real HTTP/API boundary. Report the exact endpoint, request shape, identities, object IDs (redacted as needed), response/status, mutation evidence, root cause, severity, and fix verification. Do not claim the API is safe from a grep result alone; absence of an obvious `findById` match is not proof of authorization coverage.

