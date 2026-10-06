# Task Guidance: Multi-Tenant Authorization (Candidate Modernized Treatment)

*Notice: This is pilot fixture guidance for executable task evaluation, not production skill catalog evidence.*

## Security Invariants

In `src/service.js`, secure `DocumentService` against cross-tenant leaks and privilege escalation:

### 1. Tenant Boundary
- Strong tenant isolation: operations on resources outside `user.tenantId` throw `AuthorizationError`.
- Tenant spoofing immunity: `createDocument` always binds to `user.tenantId`.
- Listing boundary: `listDocuments` returns strictly `{ doc | doc.tenantId === user.tenantId }`.

### 2. Role-Based Permissions Matrix

| Role | Read Public | Read Restricted | Create | Update | Delete |
|---|---|---|---|---|---|
| `viewer` | Yes | No (`AuthError`) | No (`AuthError`) | No (`AuthError`) | No (`AuthError`) |
| `editor` | Yes | Yes | Yes | Yes | No (`AuthError`) |
| `admin` | Yes | Yes | Yes | Yes | Yes |

### 3. State Invariants
- `updateDocument`: `tenantId` is immutable and cannot be overwritten.
- Target not found: `getDocument` returns `null`; `updateDocument` throws not-found error; `deleteDocument` returns `false`.
