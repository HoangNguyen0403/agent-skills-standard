Assumption: approved synthetic claim `SYN-001`: a synthetic user from tenant A can access tenant A data but not tenant B data.

Validation result: **PASS**

Redacted evidence:

- `GET /v1/records/synthetic-a` using synthetic identity → `200 OK`
- `GET /v1/records/synthetic-b` using the same identity → `403 Forbidden`
- Authorization log: `tenant-a → tenant-b access denied`
- Redacted token, user ID, record IDs, and request IDs: `[REDACTED]`

No production data or real personal information was used.
