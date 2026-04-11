---
name: flutter-security
description: 'Enforce OWASP Mobile security standards for Flutter apps. Use when storing data, making network calls, handling tokens/PII, or preparing a release build. (triggers: lib/infrastructure/**, pubspec.yaml, secure_storage, obfuscate, jailbreak, pinning, PII, OWASP)'
---
# Mobile Security

## **Priority: P0 (CRITICAL)**

## Implementation Workflow

1. **Store secrets securely** — Use `flutter_secure_storage` for tokens/PII. Never use `shared_preferences` for sensitive data.
2. **Externalize secrets** — Never store API keys in Dart code. Use `--dart-define` or `.env` files.
3. **Obfuscate releases** — Build with `--obfuscate` + `--split-debug-info`. Deterrent only, not cryptographic protection; move sensitive logic to backend.
4. **Pin certificates** — For high-security apps, use `dio_certificate_pinning` to prevent MITM attacks.
5. **Detect jailbreak/root** — Use `flutter_jailbreak_detection` for financial/sensitive applications.
6. **Mask PII** — Redact sensitive data (email, phone) in all logs and analytics events.

### Secure Storage & Release Build Examples

See [implementation examples](references/implementation.md) for secure storage usage and obfuscated release build commands.

## Reference & Examples

For SSL Pinning and Secure Storage implementation details:
See [references/REFERENCE.md](references/REFERENCE.md).

## Anti-Patterns

- **No Secrets in SharedPreferences**: Use `flutter_secure_storage` for tokens and PII
- **No Hardcoded API Keys**: Use `--dart-define` or secure vaults for all secrets
- **No Unobfuscated Releases**: Always build with `--obfuscate` and `--split-debug-info`
- **No PII in Logs**: Mask or omit sensitive data from all logs and analytics events

## Related Topics

common/security-standards | layer-based-clean-architecture | performance