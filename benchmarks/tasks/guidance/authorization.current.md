# Task Guidance: Multi-Tenant Authorization (Current Treatment)

*Notice: This is pilot fixture guidance for executable task evaluation, not production skill catalog evidence.*

## CRITICAL SECURITY DIRECTIVES

Execute this implementation with zero-trust defensive coding. Every method MUST implement explicit authorization checks.

### Phase 1: Authentication & Tenant Guardrails
1. Validate that `user` object has valid `tenantId` and `roles` array.
2. In `getDocument(user, docId)`:
   - Retrieve document from map.
   - If not found, return null.
   - If `doc.tenantId !== user.tenantId`, you MUST immediately throw `new AuthorizationError("Access denied: cross-tenant access is forbidden")`.
3. In `createDocument(user, docData)`:
   - Check if user has permission to create (role must include `'editor'` or `'admin'`).
   - If user only has `'viewer'`, you MUST immediately throw `new AuthorizationError("Viewer role cannot create documents")`.
   - FORCED TENANT OVERRIDE: Set `doc.tenantId = user.tenantId`. Do NOT trust `docData.tenantId`.

### Phase 2: Mutation & Deletion Controls
1. In `updateDocument(user, docId, updates)`:
   - Retrieve document. If not found, throw Error("Document not found").
   - Cross-tenant check: if `doc.tenantId !== user.tenantId`, throw `new AuthorizationError("Access denied: cross-tenant update forbidden")`.
   - Role check: user must have role `'editor'` or `'admin'`. If `'viewer'`, throw `new AuthorizationError("Viewer role cannot update documents")`.
   - Immutable field protection: `updates.tenantId` MUST NEVER overwrite `doc.tenantId`.
2. In `deleteDocument(user, docId)`:
   - Retrieve document. If not found, return false.
   - Cross-tenant check: if `doc.tenantId !== user.tenantId`, throw `new AuthorizationError("Access denied: cross-tenant delete forbidden")`.
   - Strict admin requirement: only users with role `'admin'` may delete documents. Editors and viewers MUST be rejected with `new AuthorizationError("Only admin can delete documents")`.

### Phase 3: Listing & Data Leakage Prevention
1. In `listDocuments(user)`:
   - Iterate through documents.
   - Filter ONLY documents where `doc.tenantId === user.tenantId`.
   - IMPORTANT: Even if `user.roles` includes `'admin'`, admin privileges are strictly tenant-scoped! Do NOT return documents belonging to other tenants.

### Phase 4: Restricted Content Controls
- If `doc.restricted === true`, only users with `'editor'` or `'admin'` roles may access it. Viewers attempting to read restricted documents MUST receive `new AuthorizationError("Restricted document access denied")`.

Verify every method against these four phases before completion.
