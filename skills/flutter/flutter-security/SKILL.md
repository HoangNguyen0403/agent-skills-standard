---
name: flutter-security
description: Secure Flutter token/PII storage, build-time secrets, network trust, and release hardening using OWASP Mobile practices. Use for secure storage, secret injection, certificate pinning, jailbreak/root risk, or release builds—not generic form validation, API error handling, auth-provider setup, or tests of existing security services.
metadata:
  triggers:
    files:
    - 'lib/infrastructure/**'
    - 'pubspec.yaml'
    keywords:
    - secure_storage
    - obfuscate
    - jailbreak
    - pinning
    - PII
    - OWASP
---

# Mobile Security

## **Priority: P0 (CRITICAL)**

## Implementation Workflow

1. **Store secrets securely** — Use `flutter_secure_storage` for tokens/PII. Never use `shared_preferences` for sensitive data.
2. **Externalize secrets** — Never store API keys in Dart code. Use `--dart-define` or `.env` files.
3. **Obfuscate releases** — Build `--obfuscate --split-debug-info=./symbols`. Deterrent only — move sensitive logic to backend.
4. **Pin certificates** — `dio_certificate_pinning` for high-security apps to prevent MITM.
5. **Root detection** — `flutter_jailbreak_detection` for root/jailbreak checks in financial/sensitive apps.
6. **Mask PII** — Redact PII (email, phone) from all logs and analytics.

### Secure Storage & Release Build Examples

See [implementation examples](references/implementation.md) for secure storage usage and obfuscated release build commands.

## Reference & Examples

SSL Pinning & Secure Storage: [references/REFERENCE.md](references/REFERENCE.md).

## Anti-Patterns

- **No Secrets in SharedPreferences**: Use `flutter_secure_storage` for tokens and PII
- **No Hardcoded API Keys**: Use `--dart-define` or secure vaults for all secrets
- **No Unobfuscated Releases**: Always build with `--obfuscate --split-debug-info`
- **No PII in Logs**: Mask or omit sensitive data from all logs and analytics events

## Related Topics

common/security-standards | layer-based-clean-architecture | performance

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- certificate pinning,SSL pinning

## Remediation anchors

- Remediation anchors: root/jailbreak detection, --obfuscate, --split-debug-info
