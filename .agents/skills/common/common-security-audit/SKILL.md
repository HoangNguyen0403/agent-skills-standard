---
name: common-security-audit
description: Probe for hardcoded secrets, injection surfaces, unguarded routes, business logic flaws, and platform-specific weaknesses across backend (Node, Go, Java, Python, Rust), frontend (React, Angular, Vue), and mobile (iOS, Android, Flutter) codebases. Use when performing security audits, vulnerability scans, secrets detection, or penetration testing.
metadata:
  triggers:
    files:
    - 'package.json'
    - 'go.mod'
    - 'pubspec.yaml'
    - 'pom.xml'
    - 'Cargo.toml'
    - 'requirements.txt'
    - 'AndroidManifest.xml'
    keywords:
    - Dockerfile
    - security audit
    - vulnerability scan
    - secrets detection
    - injection probe
    - pentest
---
# Security Audit

## **Priority: P0 (CRITICAL)**

## 1. Scan for Hardcoded Secrets

See [implementation examples](references/implementation.md) for secrets scanning commands.

Covers: Backend source, frontend bundles (`REACT_APP_`, `NEXT_PUBLIC_`, `VITE_`), mobile configs (`BuildConfig`, iOS configurations, `strings.xml`).

## 2. Detect Data Leakage in Logs

See [implementation examples](references/implementation.md) for log leakage scanning commands across Node, Go, Dart, Java, Swift.

## 3. Map Injection Surfaces & Auth Coverage

See [implementation examples](references/implementation.md) for injection detection and auth coverage measurement.

## 4. Run Dependency CVE Scans

- **Node/Python/Rust**: `npm audit --audit-level=high` | `pip-audit` | `cargo audit`
- **Go/Dart**: `go list -m -u all` | `dart pub outdated --json`
- **Java/Mobile**: `mvn dependency:list` / `./gradlew dependencies` | `pod audit` / Gradle scan

## 5. Infrastructure & Adversarial Entry Points

See [implementation examples](references/implementation.md) for RCE/SSRF/Path Traversal and infrastructure hardening (Docker/K8s).

## 6. Frontend-Specific Audit

- **Exposed Secrets**: `grep -rE "(REACT_APP_|NEXT_PUBLIC_|VITE_)" . --include="*.ts*" --include="*.env*"`
- **DOM Sinks & Source Maps**: Check `dangerouslySetInnerHTML`, `innerHTML`, `eval`, and `.map` files in prod builds.

## 7. Mobile-Specific Audit

See [mobile audit commands](references/mobile-audit.md) for insecure storage (credential stores/Keystore), cert pinning, debug flags, and deep links.

## 8. Business Logic & Advanced Attacks

- **BOLA/IDOR**: Verify entity lookups always enforce tenant/owner ownership checks (e.g. any `findById` without an `owner` filter is a P0 IDOR vulnerability).
- **JWT / Mass Assignment**: Check missing `exp`, weak keys, and uncontrolled property spread (`...req.body`).
- **Race / GraphQL**: Verify atomic DB transactions, introspection disabled, and query depth limits.

## Scoring Impact

| Finding | Threshold | Severity | Deduction |
| --- | --- | --- | --- |
| Hardcoded Secrets | Any match | P0 | -25 |
| Plain-text PII in Logs | Any match | P0 | -20 |
| Unguarded Routes > 20% | > 0.2 | P0 | -15 |
| Raw SQL Concatenation | Any match | P1 | -10 |
| Response Leakage (Stack) | > 0 | P1 | -10 |
| Insecure Mobile Storage | Token in plaintext | P1 | -15 |
| Missing Cert Pinning | No pinning detected | P2 | -8 |
| DOM XSS Sinks | Any match | P1 | -10 |

> **CAUTION**: P0 finding immediately caps Security score at 40/100. Immediate actions for leaked secrets: rotate the credential NOW and purge from history.

## Anti-Patterns

- **No applying generic patterns over project-specific rules**: Respect existing security constraints.
- **No ignoring error handling or edge cases**: Audit must cover boundary conditions.
- **No backend-only audit**: Always check frontend AND mobile when in-scope.

## References

- [Vulnerability Remediation Protocols](references/REMEDIATION.md)
- [Mobile Audit Commands](references/mobile-audit.md)