# OWASP Web Application Top 10 (2021) — Full Detection Signals

## A01 — Broken Access Control

| Signal | Example |
| ------ | ------- |
| Resource fetched by user-supplied ID with no owner filter | `findById(req.params.id)` — no `WHERE owner_id = currentUser` |
| Route missing authorization decorator | `@Get(':id')` with no `@UseGuards(...)` |
| Path traversal via `../` in file operations | `readFile('../' + req.params.file)` |
| IDOR via object property override | Changing `userId` field in request body overrides another user's data |

**Fix**: Every resource query must include `AND owner_id = currentUser.id` or equivalent tenant filter.

---

## A02 — Cryptographic Failures

| Signal | Example |
| ------ | ------- |
| Weak password hash | `md5(password)` or `sha1(password)` |
| Sensitive field stored plaintext | `user.ssn = req.body.ssn` without encryption |
| HTTP URL hardcoded for sensitive endpoint | `http://payments.internal/charge` |
| Missing TLS enforcement | No HSTS header, redirect from HTTP not forced |

**Fix**: Use bcrypt/argon2 for passwords; AES-256-GCM for data at rest; enforce HTTPS everywhere.

---

## A03 — Injection

| Signal | Example |
| ------ | ------- |
| String concatenation in SQL | `"SELECT * FROM users WHERE id = " + id` |
| User input passed to shell runner | `child_spawn("zip", [req.body.filename])` without allowlist validation |
| Unsanitized template rendering | `res.render(template, { name: req.query.name })` without escaping |
| XSS via unescaped output to DOM | Writing user text to `innerHTML` without sanitization |

**Fix**: Use parameterized queries / prepared statements; never concatenate user input into queries or shell arguments.

---

## A04 — Insecure Design

| Signal | Example |
| ------ | ------- |
| No rate limiting on auth endpoints | `/login` accepts unlimited attempts |
| Missing input validation at entry point | Controller accepts arbitrary body shape |
| No fraud controls on high-value flows | Checkout with no duplicate-order check |

---

## A05 — Security Misconfiguration

| Signal | Example |
| ------ | ------- |
| CORS wildcard on authenticated routes | `Access-Control-Allow-Origin: *` |
| Debug mode enabled in production | `DEBUG=true`, stack traces in response body |
| Security headers absent | No CSP, HSTS, X-Frame-Options, X-Content-Type-Options |
| Default credentials | Admin/admin, unchanged DB root password |

---

## A06 — Vulnerable Components

| Signal | Example |
| ------ | ------- |
| CVE in dependency audit | `npm audit --audit-level=high` returns findings |
| Unreviewed new direct dependency added | New `import` of unknown package without security review |
| Outdated major version with known CVE | `lodash@4.17.4` (Prototype Pollution) |

---

## A07 — Authentication Failures

| Signal | Example |
| ------ | ------- |
| JWT without expiry | `jwt.sign(payload, secret)` — no `expiresIn` |
| No session invalidation on logout | Token not added to blocklist or session not cleared |
| Weak password policy | Accepting 4-character passwords |
| No brute-force protection | No lockout or CAPTCHA on login |

---

## A08 — Software and Data Integrity Failures

| Signal | Example |
| ------ | ------- |
| Unverified JWT | Accepting JWTs without signature verification |
| Deserialization of untrusted data | Binary deserialization of external input without schema validation |
| Auto-update without checksum | Downloading and running a binary without hash verification |

---

## A09 — Logging & Monitoring Failures

| Signal | Example |
| ------ | ------- |
| No audit log on account deletion | User deleted with no log entry |
| No audit log on privilege escalation | Role changed with no record |
| No audit log on payment action | Charge processed with no audit trail |
| Sensitive data logged | Logging password or token value at info/debug level |

---

## A10 — SSRF

| Signal | Example |
| ------ | ------- |
| HTTP client with user-controlled URL and no allowlist | `fetch(req.body.webhookUrl)` |
| Internal metadata endpoint reachable | URL allows `http://169.254.169.254/` |
| No URL scheme restriction | User can pass `file://` or `gopher://` protocol URLs |

**Fix**: Validate and allowlist target URLs; block private IP ranges (RFC1918, loopback, metadata endpoints).
