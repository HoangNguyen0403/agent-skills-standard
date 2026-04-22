---
name: flutter-security
description: Enforce OWASP Mobile security standards for Flutter apps. Use when storing sensitive data, making network calls, handling tokens/PII, or preparing release builds.
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
