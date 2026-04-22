---
name: common-security-audit
description: Probe for hardcoded secrets, injection surfaces, unguarded routes, and infrastructure weaknesses across Node, Go, Dart, Java, Python, and Rust codebases. Use when performing security audits, vulnerability scans, secrets detection, or penetration testing.
metadata:
  triggers:
    files:
    - 'package.json'
    - 'go.mod'
    - 'pubspec.yaml'
    - 'pom.xml'
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

## 2. Detect Data Leakage in Logs

Identify sensitive info printed to logs or stdout.

- **Node/TS**: `grep -rE "console\.(log|error|warn)" . --include="*.ts" --include="*.js" | grep -iE "password|token|secret"`
- **Go**: `grep -rE "log\.(Print|Printf|Println|Fatal)" . --include="*.go" | grep -iE "password|token|secret"`
- **Dart/Flutter**: `grep -rE "print\(|debugPrint\(" . --include="*.dart" | grep -iE "password|token|secret"`
- **Java/Spring**: `grep -rE "log(ger)?\.(info|debug|warn|error)" . --include="*.java" | grep -iE "password|token|secret"`

## 3. Map Injection Surfaces

Detect raw string concatenation in queries or system commands.

See [implementation examples](references/implementation.md) for injection surface detection.

## 4. Measure Auth Coverage vs Exposure

Compare total routes against protected endpoints.

- **NestJS**: `total=$(grep -r "@(Get|Post|Put|Delete|Patch)" . | wc -l); guarded=$(grep -r "@(UseGuards|Auth)" . | wc -l)`
- **Spring**: `total=$(grep -r "@(GetMapping|PostMapping|PutMapping)" . | wc -l); guarded=$(grep -r "@(PreAuthorize|Secured)" . | wc -l)`
- **Go**: `total=$(grep -rE "(GET|POST|PUT|DELETE)" . | wc -l); guarded=$(grep -rE "(middleware|auth|jwt|guard)" . | wc -l)`

## 5. Run Dependency CVE Scans

- **Node**: `npm audit --audit-level=high`
- **Dart/Flutter**: `dart pub outdated --json`
- **Go**: `go list -m -u all | grep "\["`
- **Java**: `mvn dependency:list` or `./gradlew dependencies`
- **Python**: `pip-audit`
- **Rust**: `cargo audit`

## 6. Audit Infrastructure Hardening

See [implementation examples](references/implementation.md) for infrastructure hardening checks.

## 7. Detect Adversarial Entry Points (RCE/SSRF/Path Traversal)

Identify where user input reaches dangerous sinks without sanitization.

- **Path Traversal**: `grep -rE "path\.join\(|os\.path\.join\(" . | grep -vE "path\.resolve|path\.normalize"`
- **SSRF**: `grep -rE "axios\.get\(|http\.Get\(|fetch\(" . | grep -vE "['\"]https?://" `
- **BOLA/IDOR**: `grep -rE "findById\(|findOne\(" . | grep -viE "tenant|owner|user_id"`

## Scoring Impact

| Finding | Threshold | Severity | Deduction |
| ------------------------ | --------- | -------- | --------- |
| Hardcoded Secrets | Any match | P0 | -25 |
| Plain-text PII in Logs | Any match | P0 | -20 |
| Unguarded Routes > 20% | > 0.2 | P0 | -15 |
| Raw SQL Concatenation | Any match | P1 | -10 |
| Response Leakage (Stack) | > 0 | P1 | -10 |

> **CAUTION**: P0 finding immediately caps Security score at 40/100.

## Anti-Patterns

- **No applying generic patterns over project-specific rules**: Respect existing security constraints.
- **No ignoring error handling or edge cases**: Audit must cover boundary conditions.

## References

- [Vulnerability Remediation Protocols](references/REMEDIATION.md)