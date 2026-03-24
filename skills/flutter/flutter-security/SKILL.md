---
name: flutter-security
description: "Enforce OWASP Mobile security standards for Flutter apps. Use when storing data, making network calls, handling tokens/PII, or preparing a release build. (triggers: lib/infrastructure/**, pubspec.yaml, secure_storage, obfuscate, jailbreak, pinning, PII, OWASP)"
---

# Mobile Security

## **Priority: P0 (CRITICAL)**

OWASP-aligned mobile security and PII protection for Flutter.

## Implementation Workflow

1. **Store secrets securely** — Use `flutter_secure_storage` for tokens/PII. Never use `shared_preferences` for sensitive data.
2. **Externalize secrets** — Never store API keys in Dart code. Use `--dart-define` or `.env` files.
3. **Obfuscate releases** — Always build with `--obfuscate` and `--split-debug-info`. This is a deterrent, not cryptographic protection; move sensitive logic to backend.
4. **Pin certificates** — For high-security apps, use `dio_certificate_pinning` to prevent MITM attacks.
5. **Detect jailbreak/root** — Use `flutter_jailbreak_detection` for financial/sensitive applications.
6. **Mask PII** — Redact sensitive data (email, phone) in all logs and analytics events.

### Secure Storage & Release Build Examples

See [implementation examples](references/implementation.md) for secure storage usage and obfuscated release build commands.

## Reference & Examples

For SSL Pinning and Secure Storage implementation details:
See [references/REFERENCE.md](references/REFERENCE.md).

## Anti-Patterns

- ❌ `prefs.setString('auth_token', token)` — tokens/PII must use `flutter_secure_storage`, never SharedPreferences
- ❌ `const apiKey = 'sk-…'` hardcoded in Dart — store secrets via `--dart-define` or a secure vault; never in source
- ❌ Release build without `--obfuscate --split-debug-info` flags — unobfuscated binaries expose class/method names
- ❌ `print('User email: $email')` — mask or omit PII in logs and analytics events entirely

## Related Topics

common/security-standards | layer-based-clean-architecture | performance

