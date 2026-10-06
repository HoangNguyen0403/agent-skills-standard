# Task Guidance: Multi-Tenant Authorization (Minimal Treatment)

*Notice: This is pilot fixture guidance for executable task evaluation, not production skill catalog evidence.*

## Specification

Module `src/service.js` must export `DocumentService` and `AuthorizationError`.

### Tenant Isolation
- Users may only access or mutate documents belonging to their `user.tenantId`.
- Any cross-tenant access attempt (read, update, delete) MUST throw `AuthorizationError`.
- Document creation MUST force `doc.tenantId = user.tenantId`; ignore caller-supplied `docData.tenantId` rather than rejecting that spoofing field.
- If a requested ID already belongs to another tenant, creation MUST be rejected without changing the existing document.
- `listDocuments(user)` MUST return the complete set of documents belonging to the user's tenant and no others. For the seeded tenant-1 case, editors and admins MUST list exactly `doc-t1-public` and `doc-t1-secret`, including the restricted document. Viewers MUST NOT receive restricted documents in listings.

### Role-Based Access Control (Within Tenant)
- `viewer`: Can read non-restricted documents. Cannot read `restricted: true` documents. Cannot create, update, or delete documents.
- `editor`: Can read, create, and update documents. Can read `restricted: true` documents. Cannot delete documents.
- `admin`: Full read, create, update, and delete permissions within their own tenant.
