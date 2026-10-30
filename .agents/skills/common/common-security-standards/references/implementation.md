# Implementation Examples

## Parameterized Query (TypeScript)

```typescript
// Parameterized query — prevents SQL injection
const user = await db.query(
  'SELECT * FROM users WHERE email = $1 AND status = $2',
  [email, 'active']
);
```

## Secret Management (Python)

```python
# Secret management — never hardcode credentials
import os
API_KEY = os.environ["API_KEY"]  # Good: from environment
# API_KEY = "sk-abc123"          # Bad: hardcoded secret
```

## Operation-Private Privileged Capability (Enforcement Contract)

This is a contract to implement against, not a copy-ready module. The authentication ingress, schema, and signing primitives are host-owned; the application must define their trust basis before claiming enforcement.

### Minting boundary

- Mint privileged capabilities only inside the operation owner: a module-private function or sealed factory that returns no mint handle. Do not export a public or sibling mint function, class, or gateway that accepts caller-supplied identity, context, or keys.
- Bind every capability to `operationId`, the resolved `principalId`, `tenantId`, `resourceId`, `action`, canonical payload digest, authority revision, and expiry. A capability without resource, action, and payload binding is not operation-private.
- Ordinary authenticated sessions are not privileged capabilities. Reuse them only under their audience, expiry, revocation, and current-authorization rules.

### Serialization protocol for authorization changes

Choose one protected serialization row per authorization domain, for example `authorization_state(tenant_id, account_id, revision)`.

- Every path that changes authorization-relevant facts must take that row's lock and bump its revision in the same transaction: membership add/remove/role change, session revoke or forced expiry, enrollment or ownership change, and privileged-capability issuance. No authorization mutation path bypasses this lock.
- The privileged writer must acquire the same row lock inside its mutation transaction before it reads membership, session, or account state, then compare the locked revision with the capability's revision. A revocation committed before the writer acquires the lock is visible and must win. A revocation that arrives while the writer holds the lock waits, and applies to every authorization point after the writer commits.
- Acquire locks in one fixed order everywhere, for example authority state, then account/resource, then operation-consumption insert. This defines the serialization point and avoids lock-order deadlocks.
- Unique consumption of `operationId` is a separate replay invariant. It never substitutes for the revision check, and the revision check never substitutes for consumption.

### Commit-time predicates

Evaluate all of these inside the writer transaction. The first failure aborts the operation without mutating state.

1. Resolve the current principal and tenant from the host-verified authentication or session state. Never read identity, tenancy, role, or revision from the request body, query, cookies parsed by application code, or other client-supplied claims.
2. Acquire the shared authorization-state lock, re-read its revision, then verify that the session is not revoked or expired and that the resource is reachable through current tenant and principal membership. Reject on an absent row, non-`ACTIVE` resource, revoked/expired session, membership change, or revision mismatch.
3. Verify the capability signature with the owner-held key, then compare operation, principal, tenant, resource, action, payload digest, and expiry against the current request.
4. Consume the operation atomically with a unique insert keyed by `operationId`. A duplicate or zero-row insert is a replay: abort before any mutation.
5. Validate domain values before mutation (for example, monetary amounts are positive integer minor units within bounds), and require every credit or destination update to affect exactly one permitted row in the same tenant. Zero or multiple affected rows abort.
6. Write audit evidence in the same transaction with the resolved principal, operation, and payload digest. Do not accept caller-supplied audit claims, and keep the writer unavailable to untrusted event construction.

### Replay, revocation, and authority predicates

```sql
-- Serialization point: every authorization mutation/revocation takes this lock
-- and bumps revision before writing its fact.
SELECT revision FROM authorization_state
WHERE tenant_id = $1 AND account_id = $2
FOR UPDATE;

-- Same transaction: read current session and membership after holding the lock.
SELECT s.revoked_at, m.role, a.balance_minor, a.status
FROM sessions s
JOIN account_memberships m ON m.account_id = $2 AND m.principal_id = $3
JOIN accounts a ON a.id = m.account_id
WHERE s.session_id = $4 AND s.principal_id = $3
FOR UPDATE OF a;                 -- absent/revoked row, revision mismatch, or non-ACTIVE = reject

-- Replay rejection: one consumption row per privileged operation.
INSERT INTO consumed_operations (operation_id, principal_id, resource_id, action, payload_digest)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (operation_id) DO NOTHING
RETURNING operation_id;          -- zero rows = reject as replay
```

Row locks alone serialize access; they do not reject a replayed operation, and an account-only lock does not cover a concurrent revocation. Authorization changes must contend on the same authorization-state revision the writer locks.

### Evidence integrity

Persisted evidence needs authenticated provenance and an integrity contract appropriate to the threat model. Protected append-only storage with least-privilege writers and readers is sufficient when the store is authoritative. Require a verified MAC or signature only when evidence crosses an untrusted persistence or transport boundary, and then verify it against current key, revision, and enrollment state before relying on it. Signing caller-supplied claims does not establish provenance.
