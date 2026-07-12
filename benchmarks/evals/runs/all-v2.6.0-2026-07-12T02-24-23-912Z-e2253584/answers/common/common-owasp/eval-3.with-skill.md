Below is an Express-style login endpoint. It uses a slow password hash (Argon2), a parameterized/ORM lookup, generic failure messages, rate limiting, and an expiring signed session token. The password is never logged or returned.

```js
import argon2 from "argon2";
import jwt from "jsonwebtoken";

// Apply a server-side rate limiter to this route in addition to account/IP
// monitoring, with thresholds appropriate for the deployment.
app.post("/login", loginRateLimiter, async (req, res) => {
  const email = typeof req.body?.email === "string"
    ? req.body.email.trim().toLowerCase()
    : "";
  const password = typeof req.body?.password === "string"
    ? req.body.password
    : "";

  if (!email || !password || email.length > 254 || password.length > 1024) {
    return res.status(400).json({ error: "Invalid credentials" });
  }

  // Use a prepared query or ORM parameter binding; never concatenate email.
  const user = await db.users.findOne({
    where: { email },
    select: { id: true, tenantId: true, passwordHash: true, status: true },
  });

  const valid = user && user.status === "active"
    ? await argon2.verify(user.passwordHash, password)
    : false;

  if (!valid) {
    // Record a security event without recording the password or token.
    auditLog.warn("login_failed", { email, ip: req.ip });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { sub: user.id, tenantId: user.tenantId, type: "access" },
    process.env.JWT_PRIVATE_KEY,
    { algorithm: "RS256", issuer: "api.example.com", audience: "web", expiresIn: "15m" },
  );

  auditLog.info("login_succeeded", { userId: user.id, ip: req.ip });
  return res.json({ accessToken: token, expiresIn: 900 });
});
```

Configure HTTPS/TLS, keep the signing key outside source control, verify issuer/audience/algorithm/expiry on every request, and provide refresh-token rotation and logout revocation if long-lived sessions are required. For cookie-based sessions, use `Secure`, `HttpOnly`, and appropriate `SameSite` attributes plus CSRF protection. Add tests for wrong passwords, disabled users, rate limiting, token expiry, algorithm/key validation, and absence of password hashes in responses.
