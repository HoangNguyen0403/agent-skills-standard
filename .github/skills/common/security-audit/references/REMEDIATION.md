# Security Vulnerability Remediation

Standard protocols for fixing critical security findings identified during a Security Audit.

## 🔴 P0: CRITICAL REMEDIATION

### 1. Hardcoded Secrets

**Fix**:

1. **Immediate**: Rotate the leaked secret (API key, password, etc.).
2. **Implementation**: Move the secret to an environment variable (`.env`) or a Secret Manager (AWS Secrets Manager, Doppler).
3. **Removal**: Use `git-filter-repo` or BFG Repo-Cleaner to remove the secret from git history.

### 2. PII / Secret Log Leakage

**Fix**:

- Implement a **Masking Layer** in your logger.
- Ensure fields like `password`, `ssn`, `email` are automatically redacted before serialization.

---

### 🟠 P1: HIGH REMEDIATION

### 3. Raw SQL Concatenation (SQLi)

**Fix**:

- **Always** use parameterized queries provided by your DB driver or ORM.
- **Example (Node)**: Use `db.query('SELECT * FROM users WHERE id = $1', [userId])` instead of string interpolation.

### 4. Response Stack Traces

**Fix**:

- Implement a global exception filter/handler.
- In production mode, catch all errors and return a sanitized response: `{ "error": "Internal Server Error", "code": 500 }`.

### 5. Insecure Infrastructure

**Fix**:

- **Docker**: Specify a non-root user (`USER node`).
- **Pins**: Use specific versions instead of `:latest` (e.g., `FROM node:20-alpine`).
