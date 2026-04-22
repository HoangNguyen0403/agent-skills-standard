# DAST Implementation Guide

The following commands are standard for dynamic application security testing. Use these after reconnaissance to find vulnerabilities in a running application (local or staging).

## 1. ZAP-CLI (Zed Attack Proxy)

ZAP is the industry standard for web application and API scanning.

```bash
# Basic spider and scan
zap-cli quick-scan --self-contained http://localhost:8080

# Advanced API scan with report
zap-cli report -f html -o zap_report.html
```

- **Target**: SQLi, XSS, CSRF, Session Management.
- **Why**: Deep crawling of all links and parameters.

## 2. Nuclei

Nuclei is a fast, template-based vulnerability scanner.

```bash
# Basic scan targeting CVEs and misconfigurations
nuclei -u http://localhost:3000

# Scan for specific tech stacks (e.g. NestJS, Spring)
nuclei -t technologies/ -u http://localhost:3000
```

- **Target**: Weak configurations, default credentials, known CVEs.
- **Why**: High concurrency and customizable YAML templates.

## 3. Nikto

Nikto is a classic tool for scanning web servers.

```bash
# Single target scan
nikto -h http://localhost:8000
```

- **Target**: Server version disclosure, outdated software, insecure headers.
- **Why**: Fast reconnaissance on server-level vulnerabilities.

## 4. AI-Driven `curl` Probing

When automated tools are blocked or unavailable, use targeted `curl` requests.

```bash
# 1. Test for Auth Bypass (X-Forwarded-For)
curl -H "X-Forwarded-For: 127.0.0.1" http://staging.app/admin

# 2. Test for BOLA/IDOR (Iterating UUIDs or sequential IDs)
curl -H "Authorization: Bearer [TOKEN]" http://api.app/users/1005

# 3. Test for Info Disclosure (Common sensitive paths)
curl -I http://app.com/.env
curl -I http://app.com/api-docs
curl -I http://app.com/metrics
```

## Remediation Guidelines

- **If SQLi found**: Use ORM-based parameterized queries immediately across the layer.
- **If CORS \* found**: Restrict to a specific allowlist of domains.
- **If XSS found**: Sanitize all outputs with a library like DOMPurify before rendering.
