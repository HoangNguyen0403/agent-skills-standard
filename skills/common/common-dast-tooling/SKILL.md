---
name: common-dast-tooling
description: Standardize usage of Dynamic Application Security Testing (DAST) tools (ZAP, Nuclei, Nikto) and custom AI-driven curl probes for adversarial system testing. Use when advising on or running dynamic security scans on local/staging environments.
metadata:
  triggers:
    keywords:
    - DAST
    - dynamic scan
    - zap
    - nuclei
    - nikto
    - curl probe
    - pentest
    - dynamic analysis
---
# DAST Tooling Standard

## **Priority: P1 (OPERATIONAL)**

## Always-Apply Rules

- **No Scanning Production**: Never run DAST tools against live production environments. Use local or staging replicas only.
- **No Uncapped Scans**: Always set `max-depth` or `max-duration` to avoid infinite loops on dynamic routes.
- **No Anonymous Probing**: Use authenticated headers (`Authorization`) to test protected surfaces, not public ones.

## 1. Automated DAST Tools

Follow [implementation guide](references/implementation.md) for command-line setup.

- **Nuclei**: Best for fast, template-based CVE/Misconfiguration scanning.
- **ZAP-CLI**: Best for deep spidering and web vulnerability scanning (SQLi, XSS, etc.).
- **Nikto**: Quick scan for insecure server configurations and outdated software.

## 2. Adversarial `curl` Probing (Manual)

When tools unavailable, use AI to generate targeted `curl` probes:

- **Bypassing Guards**: Probe protected routes with manipulated headers (`X-Forwarded-For`, `X-Custom-Auth`).
- **Data Leakage**: Request `/metrics`, `/health`, or `.git` directories to find exposed metadata.
- **Parameter Tampering**: Modify payload types (String -> Object) or inject large payloads to test limits.

## Scoring Impact

| Finding | Severity | Deduction |
| --------------------------------------- | -------- | --------- |
| Unauthenticated access to private data | P0 | -25 |
| Successful SQLi/RCE via probe | P0 | -20 |
| Info Leakage (Server versions/Env vars) | P1 | -10 |
| Missing security headers (CSP/HSTS) | P2 | -5 |

## Anti-Patterns

- **No relying solely on static analysis**: Pentesting MUST include dynamic execution feedback.
- **No ignoring non-web protocols**: Check Docker ports, SSH banners, and internal gRPC/RMQ listeners.

## References

- [DAST Tooling Implementation](references/implementation.md)
- [OWASP Dynamic Scanning Guide](https://owasp.org/www-community/Vulnerability_Scanning)