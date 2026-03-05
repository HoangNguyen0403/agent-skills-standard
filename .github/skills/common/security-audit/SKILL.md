---
name: Security Audit
description: Adversarial security probing and vulnerability assessments across Node, Go, Dart, Java, Python, and Rust.
metadata:
  labels: [security, audit, pentest, vulnerability, cve, secrets, injection]
  triggers:
    files: ['package.json', 'go.mod', 'pubspec.yaml', 'pom.xml', 'Dockerfile']
    keywords:
      [
        security audit,
        vulnerability scan,
        secrets detection,
        injection probe,
        pentest,
      ]
---

# Security Audit

## **Priority: P0 (CRITICAL)**

## 📋 Security Probing Protocol

### 1. Hardcoded Secrets (Critical)

Scan for plain-text keys, passwords, and tokens in code.

```bash
grep -riE "(password|apiKey|api_key|secret|private_key|token)\s*=\s*['\"][^'\"]{6,}" \
  . --exclude-dir={node_modules,dist,build,.git} -l
```

### 2. Data Leakage in Logs (PII/Secrets)

Identify sensitive info printed to logs or stdout.

- **Node/TS**: `grep -rE "console\.(log|error|warn)" . --include="*.ts" --include="*.js" | grep -iE "password|token|secret|private"`
- **Go**: `grep -rE "log\.(Print|Printf|Println|Fatal)" . --include="*.go" | grep -iE "password|token|secret"`
- **Dart/Flutter**: `grep -rE "print\(|debugPrint\(" . --include="*.dart" | grep -iE "password|token|secret"`
- **Java/Spring**: `grep -rE "log(ger)?\.(info|debug|warn|error)" . --include="*.java" | grep -iE "password|token|secret"`

### 3. Injection Surface (SQL / Command)

Detect raw string concatenation in queries or system commands.

```bash
grep -rE "\+.*SELECT|\+.*INSERT|\+.*UPDATE|\+.*DELETE|query\(.*\+|fmt\.Sprintf.*SELECT" \
  . --include="*.ts" --include="*.js" --include="*.go" --include="*.java" --include="*.py"
```

### 4. Auth Coverage vs Exposure

Compare total routes vs protected endpoints.

- **NestJS**: `total=$(grep -r "@(Get|Post|Put|Delete|Patch)" . | wc -l); guarded=$(grep -r "@(UseGuards|Auth)" . | wc -l)`
- **Spring**: `total=$(grep -r "@(GetMapping|PostMapping|PutMapping)" . | wc -l); guarded=$(grep -r "@(PreAuthorize|Secured)" . | wc -l)`
- **Go**: `total=$(grep -rE "(GET|POST|PUT|DELETE)" . | wc -l); guarded=$(grep -rE "(middleware|auth|jwt|guard)" . | wc -l)`

### 5. Dependency Audit (CVE Scan)

- **Node**: `npm audit --audit-level=high`
- **Dart/Flutter**: `dart pub outdated --json`
- **Go**: `go list -m -u all | grep "\["`
- **Java**: `mvn dependency:list` or `./gradlew dependencies`
- **Python**: `pip-audit`
- **Rust**: `cargo audit`

### 6. Infrastructure Hardening

```bash
grep -rE "^FROM .+:latest|^USER root|curl.*sh.*|ADD http" . --include="Dockerfile"
```

## ⚖️ Scoring Impact

| Finding                      | Threshold | Severity | Deduction |
| ---------------------------- | --------- | -------- | --------- |
| **Hardcoded Secrets**        | Any match | 🔴 P0    | -25       |
| **Plain-text PII in Logs**   | Any match | 🔴 P0    | -20       |
| **Unguarded Routes > 20%**   | > 0.2     | 🔴 P0    | -15       |
| **Raw SQL Concatenation**    | Any match | 🟠 P1    | -10       |
| **Response Leakage (Stack)** | > 0       | 🟠 P1    | -10       |

> [!CAUTION]
> A **🔴 P0 finding** immediately caps the Security score at **40/100**.

## 📚 Reference Links

- [Vulnerability Remediation Protocols](references/REMEDIATION.md)
