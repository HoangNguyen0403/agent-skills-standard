Assumption: the app uses TypeScript, a server-side API, PostgreSQL through an ORM, and browser sessions.

Implement these endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/mfa/verify`

Store only the minimum required fields:

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  mfaRequired  Boolean  @default(true)
  createdAt    DateTime @default(now())
}

model Session {
  id        String   @id
  userId    String
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Hash passwords with `Argon2id`; never encrypt or log them.

```ts
import argon2 from "argon2";

const passwordHash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
});
```

Validate and sanitize every API and UI input:

```ts
const email = String(req.body.email ?? "").trim().toLowerCase();
const password = String(req.body.password ?? "");

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  return res.status(400).json({ code: "AUTH_INVALID_INPUT" });
}

if (password.length < 12 || password.length > 128) {
  return res.status(400).json({ code: "AUTH_INVALID_INPUT" });
}
```

Login should use an ORM or parameterized query, never raw SQL:

```ts
const user = await prisma.user.findUnique({ where: { email } });

const valid = user
  ? await argon2.verify(user.passwordHash, password)
  : false;

if (!valid) {
  auditAuthFailure(req); // Must not log email or other PII.
  return res.status(401).json({ code: "AUTH_INVALID_CREDENTIALS" });
}

const sessionId = crypto.randomBytes(32).toString("base64url");

await prisma.session.create({
  data: {
    id: sessionId,
    userId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
});

res.cookie("session", sessionId, {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
});

return res.status(200).json({
  authenticated: true,
  mfaRequired: user.mfaRequired,
});
```

Security requirements:

- Use environment variables or a secret manager for database credentials, encryption keys, and MFA secrets. No hardcoded secrets.
- Serve all traffic with TLS 1.3.
- Encrypt database backups and disks with AES-256.
- Add rate limiting, such as five failed attempts per email/IP combination per 15 minutes, with progressive delay.
- Use HttpOnly Secure cookies and rotate the session after successful authentication.
- Require MFA before granting access to protected resources.
- Enforce least privilege for application database users, services, and containers.
- Return generic error codes only; never expose stack traces or internal details.
- Avoid account-enumeration differences between registration and login responses.
- Maintain audit logs for registration, login success/failure, MFA events, logout, password changes, and account recovery. Never log email, phone, names, passwords, tokens, or other PII; mask sensitive fields.
- Do not use default passwords. Require strong entropy and force password rotation on first use if temporary credentials are ever introduced.
- Add SAST and DAST checks to CI, plus dependency scanning such as `npm audit`.
- Test validation, brute-force throttling, session expiry/revocation, CSRF behavior, MFA enforcement, injection attempts, and generic error responses.
