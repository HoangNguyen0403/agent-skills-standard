---
name: Injection Testing
description: Protocols for identifying and exploiting SQL and HTML injection vulnerabilities.
---

# Injection Testing (SQLi & HTMLi)

## **Priority: P0 (CRITICAL)**

## Protocol 1: SQL Injection (SQLi)

1. **Identify**: Locate input boundaries (URL params, Form fields, Headers, Cookies).
2. **Detection**:
   - Insert `'` or `"` → Check for DB errors.
   - Insert `OR 1=1--` → Check for logic bypass.
   - Insert `SLEEP(5)` → Check for time-based blind injection.
3. **Exploitation (Discovery)**:
   - `ORDER BY n--`: Find column count.
   - `UNION SELECT NULL...`: Find displayable columns.
   - `SELECT table_name FROM information_schema.tables`: Enumerate DB.

## Protocol 2: HTML Injection (HTMLi)

1. **Identify**: Locate reflected inputs in the UI.
2. **Detection**:
   - Insert `<h1>Test</h1>` → Check for font size change.
   - Insert `<a>Evil</a>` → Check for link injection.
3. **Remediation**:
   - **Primary**: Context-aware escaping (e.g., `htmlspecialchars` in PHP, `escape` in Python).
   - **Secondary**: Use `textContent` instead of `innerHTML` in JS.

## **The Iron Law of Sanitization**

> **Never trust internal OR external data.** Validate at the entry point, Sanitize at the exit point.

## **Expert Implementation**

See [VULNERABILITY_REMEDIATION.md](VULNERABILITY_REMEDIATION.md) for secure coding patterns.
