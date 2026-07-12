A secure login endpoint should avoid plaintext password comparison, account enumeration, timing leaks, credential logging, and overly detailed errors. Store passwords only as slow, adaptive password hashes created with a modern password-hashing algorithm such as Argon2id (or bcrypt/scrypt where appropriate), with a unique salt managed by the password-hashing library. Never decrypt or retrieve plaintext passwords.

Illustrative pseudocode:

```js
async function login(req, res) {
  const { email, password } = req.body;
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Invalid request" });
  }

  const account = await db.users.findByEmail(normalizeEmail(email));
  const hash = account?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const valid = await argon2.verify(hash, password);

  if (!account || !valid || account.disabled) {
    await applyRateLimitAndRecordFailure(email, req);
    return res.status(401).json({ error: "Invalid credentials" });
  }

  await clearFailureState(account.id);
  const session = await sessions.create({ userId: account.id });
  res.cookie("session", session.id, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/"
  });
  return res.status(200).json({ user: safeUserDto(account) });
}
```

Use a constant-time password-verification implementation supplied by the hashing library; the dummy hash keeps nonexistent-user and existing-user paths more similar. Add bounded rate limiting and monitoring by account and source, MFA or step-up authentication where warranted, TLS, session rotation after login, secure session expiration/revocation, and generic responses that do not reveal whether an email is registered. Validate request size and format, avoid logging passwords or tokens, and consider rehashing hashes when the configured work factor changes.
