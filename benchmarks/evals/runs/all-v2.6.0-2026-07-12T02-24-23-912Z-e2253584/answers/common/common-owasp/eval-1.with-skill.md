# Security review

This code has two OWASP findings:

- **A01 / API1 — Broken Access Control / BOLA (IDOR):** `req.params.id` is user-controlled, but the query does not constrain the record to the authenticated user or tenant. An attacker can change the ID and retrieve another user's record.
- **API3 — Broken Property Level Authorization:** returning the raw database entity may expose password hashes, internal fields, tokens, or authorization flags.

Use an authenticated principal, enforce ownership (or an explicit authorized role) in the query, and project the response to an allowlisted DTO. For example:

```js
const userId = req.params.id;
const currentUser = req.user;

const user = await db.users.findOne({
  where: {
    id: userId,
    tenantId: currentUser.tenantId,
  },
  select: {
    id: true,
    displayName: true,
    avatarUrl: true,
  },
});

if (!user) {
  // Keep missing and unauthorized resources indistinguishable.
  return res.status(404).json({ error: "User not found" });
}

return res.json(user);
```

If users may only read themselves, use `id: currentUser.id` instead of accepting a path ID. If administrators may access other users, enforce that role in authorization middleware and still apply the tenant boundary and DTO projection. Add tests proving that a user cannot read another tenant's/user's record and that sensitive fields are absent.
