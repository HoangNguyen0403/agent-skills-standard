# DAST Implementation Guide

## 1. ZAP-CLI (Zed Attack Proxy)

```bash
# Basic spider and scan
zap-cli quick-scan --self-contained http://localhost:8080
# API scan with OpenAPI spec
zap-cli openapi-import -u http://localhost:8080/openapi.json
# Advanced scan with report
zap-cli active-scan -r http://localhost:8080
zap-cli report -f html -o zap_report.html
```

- **Target**: SQLi, XSS, CSRF, Session Management, CORS.
- **Why**: Deep crawling of all links and parameters.

## 2. Nuclei

```bash
# Basic scan targeting CVEs and misconfigurations
nuclei -u http://localhost:3000
# Scan for specific tech stacks
nuclei -t technologies/ -u http://localhost:3000
# Scan with severity filter
nuclei -u http://localhost:3000 -severity critical,high
# Custom templates
nuclei -t custom-templates/ -u http://localhost:3000
```

- **Target**: Weak configurations, default credentials, known CVEs.
- **Why**: High concurrency and customizable YAML templates.

## 3. Nikto

```bash
nikto -h http://localhost:8000
```

- **Target**: Server version disclosure, outdated software, insecure headers.

## 4. sqlmap (Suggest Only)

```bash
# Basic URL parameter test
# sqlmap -u "http://localhost:3000/api/users?id=1" --batch --level=3
# POST parameter test
# sqlmap -u "http://localhost:3000/api/search" --data="query=test" --batch
# With authentication
# sqlmap -u "http://localhost:3000/api/admin" --cookie="session=abc" --batch
```

> **CAUTION**: Never auto-run sqlmap. Suggest command to user with `--batch` for non-interactive mode.

## 5. ffuf / feroxbuster (Content Discovery)

```bash
# Directory brute-force
ffuf -u http://localhost:3000/FUZZ -w /usr/share/wordlists/dirb/common.txt -mc 200,301,302
# API endpoint discovery
ffuf -u http://localhost:3000/api/FUZZ -w api-wordlist.txt -mc 200,401,403
# Parameter fuzzing
ffuf -u "http://localhost:3000/api/users?FUZZ=test" -w params.txt -mc 200
```

## 6. GraphQL Probing

```bash
# Introspection query
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name fields { name } } } }"}'
# Nested query depth attack (DoS)
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ users { posts { comments { author { posts { comments { id } } } } } } }"}'
```

## 7. AI-Driven `curl` Probing

```bash
# Auth Bypass (header manipulation)
curl -H "X-Forwarded-For: 127.0.0.1" http://staging.app/admin
curl -H "X-Original-URL: /admin" http://staging.app/anything
# BOLA/IDOR (ID enumeration)
curl -H "Authorization: Bearer [USER_A_TOKEN]" http://api.app/users/[USER_B_ID]
# Info Disclosure
curl -s http://app.com/.env && curl -s http://app.com/.git/config
curl -s http://app.com/api-docs && curl -s http://app.com/metrics
# JWT manipulation
curl -H "Authorization: Bearer " http://api.app/admin/users  # empty token
curl -H "Authorization: invalid" http://api.app/admin/users   # malformed
curl http://api.app/admin/users                                # no header
# SSRF
curl "http://api.app/fetch?url=http://127.0.0.1:6379"
curl "http://api.app/fetch?url=http://169.254.169.254/latest/meta-data/"
```

## 8. Mobile Proxy Interception

```bash
# mitmproxy — intercept mobile app traffic
mitmproxy --mode regular --listen-port 8080
# Configure device proxy to [HOST_IP]:8080
# Install mitmproxy CA cert on device

# Frida — cert pinning bypass (Android)
# frida -U -f com.app.name -l ssl-bypass.js --no-pause
# Frida — cert pinning bypass (iOS)  
# frida -U -f com.app.name -l ios-ssl-bypass.js

# adb — deep link testing
adb shell am start -a android.intent.action.VIEW -d "appscheme://path?param=value"
# xcrun — deep link testing (iOS simulator)
xcrun simctl openurl booted "appscheme://path?param=value"
```

## 9. Frontend Browser Automation (Playwright)

```javascript
// Suggested: DOM XSS detection script
// const { chromium } = require('playwright');
// const browser = await chromium.launch();
// const page = await browser.newPage();
// await page.goto('http://localhost:3000/search?q=<img src=x onerror=alert(1)>');
// const alerts = [];
// page.on('dialog', d => { alerts.push(d.message()); d.dismiss(); });
// // Check if XSS triggered
```

## Remediation Quick-Reference

- **SQLi found**: Use parameterized queries / ORM across the layer.
- **CORS `*` found**: Restrict to explicit allowlist of domains.
- **XSS found**: Sanitize outputs with DOMPurify. Use framework auto-escaping.
- **Missing cert pin**: Implement `CertificatePinner` (OkHttp) or `ServerTrustPolicy` (Alamofire).
- **Missing headers**: Add CSP, HSTS, X-Frame-Options, X-Content-Type-Options.
