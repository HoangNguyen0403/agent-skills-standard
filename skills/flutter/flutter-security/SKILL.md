---
name: flutter-security
description: "OWASP Mobile security standards for Flutter. ALWAYS consult when storing data, making network calls, handling tokens/PII, or preparing a release build — not just dedicated security tasks. (triggers: lib/infrastructure/**, pubspec.yaml, secure_storage, obfuscate, jailbreak, pinning, PII, OWASP)"
---

# Mobile Security

## **Priority: P0 (CRITICAL)**

Standards for basic mobile security and PII protection.

## Implementation Guidelines

- **Secure Storage**: Use `flutter_secure_storage` for tokens/PII. Never use `shared_preferences`.
- **Hardcoding**: Never store API keys or secrets in Dart code. Use `--dart-define` or `.env`.
- **Obfuscation**: Always release with `--obfuscate` and `--split-debug-info`. Note: This is a deterrent, not cryptographic protection. For sensitive logic, move to backend.
- **SSL Pinning**: For high-security apps, use `dio_certificate_pinning`.
- **Root Detection**: Use `flutter_jailbreak_detection` for financial/sensitive applications.
- **PII Masking**: Mask sensitive data (email, phone) in logs and analytics.

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

