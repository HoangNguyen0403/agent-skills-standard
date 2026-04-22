---
name: common-security-standards
description: Enforce universal security protocols for safe, resilient software. Use when implementing authentication, encryption, authorization, input validation, secret management, or any security-sensitive feature across any language or framework.
metadata:
  triggers:
    files:
    - '**/*.ts'
    - '**/*.tsx'
    - '**/*.go'
    - '**/*.dart'
    - '**/*.java'
    - '**/*.kt'
    - '**/*.swift'
    - '**/*.py'
    keywords:
    - security
    - encrypt
    - authenticate
    - authorize
---
# Security Standards

## **Priority: P0 (CRITICAL)**

## Always-Apply Rules

Apply these on **every code write**, regardless of context:

- **No hardcoded secrets**: Use environment variables or secret managers. Never commit keys, passwords, or tokens to source control.
- **No raw SQL strings**: Use parameterized queries or ORMs — `WHERE id = ${userId}` always wrong.
- **No stacktraces in prod**: Return generic error codes; log full detail server-side only.

## Workflow

Activate when: implementing auth, encryption, authorization, input handling, or any security-sensitive feature.

1. **Identify trust boundaries** — map every data entry point (API, UI, CSV, webhook).
2. **Validate and sanitize** all external input at each boundary.
3. **Apply least privilege** to users, services, and containers.
4. **Verify** with SAST/DAST scanners in CI before merge.

## Context-Specific Rules

### Data Safeguarding

- **Zero Trust**: Never trust external input. Sanitize and validate every data boundary.
- **Least Privilege**: Grant minimum necessary permissions to users, services, and containers.
- **Encryption**: AES-256 for data-at-rest; TLS 1.3 for data-in-transit.
- **PII Logging**: Never log PII (email, phone, names). Mask sensitive fields before logging.

See [implementation examples](references/implementation.md) for parameterized queries and secret management.

### Secure Coding

- **Injection Prevention**: Use parameterized queries or ORMs to stop SQL, Command, and XSS injections.
- **Dependency Management**: Regularly scan (`npm audit`, `pip audit`) and update third-party libraries to patch CVEs.
- **Secure Auth**: Implement Multi-Factor Authentication (MFA) and secure session management.
- **Error Privacy**: Never leak stack traces or internal implementation details to end-user.

### Continuous Security

- **Shift Left**: Integrate security scanners (SAST/DAST) early in CI/CD pipeline.
- **Data Minimization**: Collect and store only minimum data required for business logic.
- **Audit Logging**: Maintain logs for sensitive operations (Auth, Deletion, Admin changes).

## Anti-Patterns

- **No default passwords**: Force rotation on first use with strong entropy requirements.

## References

- [Injection Testing Protocols (SQLi/HTMLi)](references/INJECTION_TESTING.md)
- [Vulnerability Remediation & Secure Patterns](references/VULNERABILITY_REMEDIATION.md)