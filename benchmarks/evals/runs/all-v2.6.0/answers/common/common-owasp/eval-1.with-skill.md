🔴 **P0 — IDOR/BOLA (OWASP API1 / A01):** `req.params.id` is user-controlled and queried without ownership or tenant authorization.

⚠️ **API3 — Broken Property Level Authorization:** Returning `user` directly may expose sensitive fields. Use **DTO projection**.

```js
const user = await db.findOne({
  id: req.params.id,
  ownerId: req.auth.userId, // or tenantId
  select: ['id', 'name', 'avatar']
});

if (!user) return res.status(404).json({ error: 'Not found' });
return res.json(user);
```

Also verify the route has authentication, an opaque session or a JWT with expiry, rate limiting, and explicit CORS configuration.
