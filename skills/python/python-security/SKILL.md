---
name: python-security
description: Secure Python services against secret leakage, injection, unsafe subprocess calls, and dependency drift. Use when handling env vars, tokens, SQL, file paths, shell commands, auth flows, or Python security gates.
metadata:
  triggers:
    files:
      - "requirements.txt"
      - ".env.example"
      - "**/*.py"
    keywords:
      - secret
      - token
      - subprocess
      - injection
      - sanitize
      - pip-audit
---

# Python Security

## **Priority: P0 (CRITICAL)**

## Rules

- Keep secrets in env or secret stores; never hardcode them in code or fixtures.
- Parameterize SQL and validate file or path inputs before use.
- Prefer `subprocess.run([...], shell=False)` with explicit args.
- Audit dependency surfaces and keep security gates current.

## Recipe

1. **Classify inputs**: trusted config, semi-trusted runtime data, untrusted user or PR text.
2. **Validate or normalize before boundary calls**.
3. **Redact secrets from logs, reports, and artifacts**.
4. **Use least-privilege filesystem and process execution**.
5. **Run dependency/security verification** after auth or gate changes.

## Anti-Patterns

- **No shell string execution** for user-shaped input.
- **No secrets in example configs, tests, or docs**.
- **No direct path joins from untrusted input** without root checks.
- **No "internal-only" exception to SQL or subprocess hygiene**.

## References

- [Framework Map](../references/framework-map.md)
