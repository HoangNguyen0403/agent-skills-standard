---
name: Security Standards
description: Universal security protocols for building safe and resilient software.
metadata:
  labels: [security, encryption, authentication, authorization]
  triggers:
    keywords: [security, encrypt, authenticate, authorize]
---

# Security Standards - High-Density Standards

Universal security protocols for building safe and resilient software.

## **Priority: P0 (CRITICAL)**

## 🛡 Data Safeguarding

- **Zero Trust**: Never trust external input. Sanitize and validate every data boundary (API, UI, CSV).
- **Least Privilege**: Grant minimum necessary permissions to users, services, and containers.
- **No Hardcoded Secrets**: Use environment variables or secret managers. Never commit keys or passwords.
- **Encryption**: Use modern, collision-resistant algorithms (AES-256 for data-at-rest; TLS 1.3 for data-in-transit).

## 🧱 Secure Coding Practices

- **Injection Prevention**: Use parameterized queries or ORMs to stop SQL, Command, and XSS injections.
- **Dependency Management**: Regularly scan (`audit`) and update third-party libraries to patch CVEs.
- **Secure Auth**: Implement Multi-Factor Authentication (MFA) and secure session management.
- **Error Privacy**: Never leak stack traces or internal implementation details to the end-user.

## 🔍 Continuous Security

- **Shift Left**: Integrate security scanners (SAST/DAST) early in the CI/CD pipeline.
- **Data Minimization**: Collect and store only the absolute minimum data required for the business logic.
- **Logging**: Maintain audit logs for sensitive operations (Auth, Deletion, Admin changes).

## 🚫 Anti-Patterns

- **Hardcoded Secrets**: `**No Secrets in Git**: Use Secret Managers or Env variables.`
- **Raw SQL**: `**No String Concatenation**: Use Parameterized queries or ORMs.`
- **Leaking Context**: `**No Stacktraces in Prod**: Return generic error codes to clients.`
- **Insecure Defaults**: `**No Default Passwords**: Force rotation and strong entropy.`

## 📚 References

- [Injection Testing Protocols (SQLi/HTMLi)](references/INJECTION_TESTING.md)
- [Vulnerability Remediation & Secure Patterns](references/VULNERABILITY_REMEDIATION.md)
