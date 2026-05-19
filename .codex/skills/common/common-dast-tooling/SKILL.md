---
name: common-dast-tooling
description: Standardize dynamic application security testing for backend APIs, frontend web apps, and mobile clients. Covers ZAP, Nuclei, Nikto, sqlmap, ffuf, browser automation, mobile proxy interception, and AI-driven curl probes. Use when advising on or running dynamic security scans on local/staging environments.
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
    - sqlmap
    - ffuf
    - mobile proxy
---
# DAST Tooling Standard

## **Priority: P1 (OPERATIONAL)**

## Always-Apply Rules

- **No Scanning Production**: Never run DAST tools against live production environments. Use local or staging replicas only.
- **No Uncapped Scans**: Always set `max-depth` or `max-duration` to avoid infinite loops on dynamic routes.
- **No Anonymous Probing**: Use authenticated headers (`Authorization`) to test protected surfaces, not public ones.
- **No Mobile on Real Devices in Prod**: Use emulators/simulators for mobile interception testing.

## 1. Backend / API Tools

### Scanner Tools
See [implementation guide](references/implementation.md) for setup commands.

- **Nuclei**: Fast, template-based CVE/misconfiguration scanning.
- **ZAP-CLI**: Deep spidering for SQLi, XSS, CSRF, session issues.
- **Nikto**: Server configuration audit (version disclosure, headers).
- **sqlmap**: Automated SQL injection detection and exploitation (suggest only — human confirms).
- **ffuf / feroxbuster**: Content discovery and endpoint fuzzing.

### API-Specific Probing
- **GraphQL**: Introspection query, nested query depth attack, field suggestion enumeration.
- **gRPC**: `grpcurl` for service enumeration and method probing.
- **WebSocket**: Connection hijacking, message injection testing.

## 2. Frontend / Web Tools

- **Browser DevTools**: Network tab for auth token leakage, console for client-side errors.
- **Playwright/Puppeteer** (suggested): Automated DOM XSS detection, form submission, CSRF testing.
- **Lighthouse**: Security/performance audit (CSP, HTTPS, mixed content).
- **CSP Evaluator**: Validate Content-Security-Policy headers.

## 3. Mobile Interception Tools

- **mitmproxy / Burp Suite**: Proxy mobile traffic for API inspection.
- **Frida**: Runtime instrumentation for cert pin bypass, biometric bypass, jailbreak detection bypass.
- **adb / xcrun simctl**: Device-level inspection, deep link testing, storage extraction.
- **Objection**: Mobile runtime exploration (iOS/Android).

## 4. AI-Driven `curl` Probing (Manual Fallback)

When automated tools unavailable, generate targeted `curl` probes:

- **Bypassing Guards**: Probe with manipulated headers (`X-Forwarded-For`, `X-Custom-Auth`).
- **Data Leakage**: Request `/metrics`, `/health`, `.git`, `/.env`, `/api-docs`.
- **Parameter Tampering**: Modify payload types (String→Object), inject large payloads.
- **JWT Manipulation**: Test with expired token, no token, modified claims.

See [implementation guide](references/implementation.md) for all commands.

## Scoring Impact

| Finding | Severity | Deduction |
|---|---|---|
| Unauthenticated access to private data | P0 | -25 |
| Successful SQLi/RCE via probe | P0 | -20 |
| Mobile API interception (no cert pin) | P1 | -15 |
| DOM XSS confirmed via browser | P1 | -10 |
| Info Leakage (Server versions/Env vars) | P1 | -10 |
| Missing security headers (CSP/HSTS) | P2 | -5 |

## Anti-Patterns

- **No relying solely on static analysis**: Pentesting MUST include dynamic execution feedback.
- **No ignoring non-web protocols**: Check Docker ports, SSH banners, gRPC/RMQ listeners.
- **No skipping mobile**: If mobile app exists, proxy its traffic and inspect API calls.

## References

- [DAST Tooling Implementation](references/implementation.md)
- [OWASP Dynamic Scanning Guide](https://owasp.org/www-community/Vulnerability_Scanning)