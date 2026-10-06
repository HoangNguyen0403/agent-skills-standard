# Task Guidance: Multi-Tenant Authorization (Minimal Treatment)

*Notice: This is pilot fixture guidance for executable task evaluation, not production skill catalog evidence.*

## Specification

Module `src/service.js` must export `DocumentService` and `AuthorizationError`.

### Tenant Isolation
- Users may only access or mutate documents belonging to their `user.tenantId`.
- Any cross-tenant access attempt (read, update, delete) MUST throw `AuthorizationError`.
- Document creation must force `doc.tenantId = user.tenantId`. Caller-supplied `docData.tenantId` must be ignored or rejected.
- `listDocuments(user)` must only return documents where `doc.tenantId === user.tenantId`, even if the user has role `'admin'`.

### Role-Based Access Control (Within Tenant)
- `viewer`: Can read non-restricted documents. Cannot read `restricted: true` documents. Cannot create, update, or delete documents.
- `editor`: Can read, create, and update documents. Can read `restricted: true` documents. Cannot delete documents.
- `admin`: Full read, create, update, and delete permissions within their own tenant.
