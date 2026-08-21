# Security Vulnerability Remediation

Standard protocols for fixing critical security findings identified during a Security Audit.

## 🔴 P0: CRITICAL REMEDIATION

### 1. Hardcoded Secrets

**Fix**:

1. **Immediate**: Rotate the leaked secret (API key, password, etc.).
2. **Implementation**: Move the secret to an environment variable (`.env`) or a Secret Manager (AWS Secrets Manager, Doppler).
3. **Removal**: Use `git-filter-repo` or BFG Repo-Cleaner to remove the secret from git history.
4. **Mobile**: Move to server-side. If client must hold keys, use iOS Keychain / Android Keystore / `FlutterSecureStorage`.

### 2. PII / Secret Log Leakage

**Fix**:

- Implement a **Masking Layer** in your logger.
- Ensure fields like `password`, `ssn`, `email` are automatically redacted before serialization.
- **Mobile**: Remove all `print()`, `NSLog()`, `Log.d()` containing sensitive data. Use release-only logging.

---

## 🟠 P1: HIGH REMEDIATION

### 3. Raw SQL Concatenation (SQLi)

**Fix**:

- **Always** use parameterized queries provided by your DB driver or ORM.
- **Example (Node)**: Use `db.query('SELECT * FROM users WHERE id = $1', [userId])` instead of string interpolation.
- **Example (Java)**: Use `PreparedStatement` with `?` placeholders.
- **Example (Python)**: Use `cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))`.

### 4. Response Stack Traces

**Fix**:

- Implement a global exception filter/handler.
- In production mode, catch all errors and return a sanitized response: `{ "error": "Internal Server Error", "code": 500 }`.

### 5. Insecure Infrastructure

**Fix**:

- **Docker**: Specify a non-root user (`USER node`).
- **Pins**: Use specific versions instead of `:latest` (e.g., `FROM node:20-alpine`).

### 6. DOM XSS (Frontend)

**Fix**:

- Remove all uses of `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, `v-html` with user input.
- Use framework auto-escaping (React JSX, Angular template binding).
- If HTML rendering required, sanitize with DOMPurify: `DOMPurify.sanitize(userInput)`.

### 7. Insecure Mobile Storage

**Fix**:

- **iOS**: Migrate from `UserDefaults` to Keychain for tokens/secrets.
- **Android**: Migrate from `SharedPreferences` to `EncryptedSharedPreferences` or Android Keystore.
- **Flutter**: Migrate from `SharedPreferences` to `FlutterSecureStorage`.

### 8. Missing Certificate Pinning (Mobile)

**Fix**:

- **iOS**: Implement `TrustKit` or custom `URLSessionDelegate` with pinned certificates.
- **Android**: Add `network_security_config.xml` with `<pin-set>` or use OkHttp `CertificatePinner`.
- **Flutter**: Use `SecurityContext` with `badCertificateCallback` or `ssl_pinning_plugin`.

---

## 🟡 P2: MEDIUM REMEDIATION

### 9. Missing Security Headers (Frontend/Backend)

**Fix**:

Add these headers to all responses:
- `Content-Security-Policy: default-src 'self'`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`

### 10. Debug Mode in Production (All Platforms)

**Fix**:

- **Backend**: Ensure `NODE_ENV=production`, `DEBUG=false`, Spring `debug=false`.
- **Frontend**: Remove source maps from production builds. Remove `console.log` statements.
- **Android**: Set `android:debuggable="false"` in release `AndroidManifest.xml`. Enable ProGuard/R8.
- **iOS**: Verify release scheme does not include debug flags.
