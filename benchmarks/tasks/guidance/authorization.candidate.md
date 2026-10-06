# Task Guidance: Multi-Tenant Authorization (Candidate Modernized Treatment)

*Notice: This is pilot fixture guidance for executable task evaluation, not production skill catalog evidence.*

## Security Invariants

In `src/service.js`, secure `DocumentService` against cross-tenant leaks and privilege escalation:

### 1. Tenant Boundary
- Strong tenant isolation: operations on resources outside `user.tenantId` throw `AuthorizationError`.
- Tenant spoofing: `createDocument` MUST ignore caller-supplied `docData.tenantId` and force `doc.tenantId = user.tenantId`.
- Cross-tenant ID collisions: reject creation when the ID belongs to another tenant; preserve the existing document unchanged.
- Listing: `listDocuments` returns every document belonging to the user's tenant and no others. Editors and admins MUST receive the complete set, including restricted documents; for the seeded tenant-1 case, exactly `doc-t1-public` and `doc-t1-secret`. Viewers MUST NOT receive restricted documents.

### 2. Role-Based Permissions Matrix

| Role | Read Public | Read Restricted | Create | Update | Delete |
|---|---|---|---|---|---|
| `viewer` | Yes | No (`AuthError`) | No (`AuthError`) | No (`AuthError`) | No (`AuthError`) |
| `editor` | Yes | Yes | Yes | Yes | No (`AuthError`) |
| `admin` | Yes | Yes | Yes | Yes | Yes |

### 3. State Invariants
- `updateDocument`: `tenantId` is immutable and cannot be overwritten.
- Target not found: `getDocument` returns `null`; `updateDocument` throws not-found error; `deleteDocument` returns `false`.
