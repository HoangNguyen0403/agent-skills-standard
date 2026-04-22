---
name: ios-security
description: Secure iOS apps with Keychain, biometrics, and data protection. Use when implementing Keychain storage, Face ID/Touch ID, or data protection in iOS.
metadata:
  triggers:
    files:
    - '**/*.swift'
    keywords:
    - SecItemAdd
    - kSecClassGenericPassword
    - LAContext
    - LocalAuthentication
    - ios security
    - swift security
    - keychain
    - biometric
    - face id
    - touch id
    - certificate pinning
    - app transport security
---
# iOS Security

## **Priority: P0 (CRITICAL)**

## Implementation Workflow

1. **Store secrets in Keychain** — Use `SecItemAdd`, `SecItemUpdate`, and `SecItemDelete` with `kSecClassGenericPassword` for tokens/PII. Never use `UserDefaults`.
2. **Add biometric auth** — Use `LocalAuthentication` with `LAContext`. Verify availability with `canEvaluatePolicy` before prompting.
3. **Encrypt files** — Use `Data.WritingOptions.completeFileProtection` when saving to disk.
4. **Keep ATS enabled** — Never disable App Transport Security globally in `Info.plist`.
5. **Pin certificates** — Use `ServerTrustManager` or `TrustKit` for production apps to prevent MITM attacks.
6. **Strip sensitive logs** — Ensure PII and tokens removed from logs in Release builds.

See [Keychain and biometrics implementation examples](references/implementation.md)

## Anti-Patterns

- **No Secrets in `UserDefaults`**: Always use Keychain for tokens and PII
- **No Unhandled `LAError`**: Check for `userCancel` and `authenticationFailed` in biometric flows
- **No PII/Token Logging**: Strip sensitive data from all logs in Release builds

## References

- [Keychain & Biometrics Implementation](references/implementation.md)

## Related Topics

- common/security-standards
- architecture