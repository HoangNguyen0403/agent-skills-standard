---
name: ios-security
description: 'Standards for Keychain, Biometrics, and Data Protection. Use when implementing Keychain storage, Face ID/Touch ID, or data protection in iOS. (triggers: **/*.swift, SecItemAdd, kSecClassGenericPassword, LAContext, LocalAuthentication)'
---

# iOS Security Standards

## **Priority: P0 (CRITICAL)**

## Implementation Guidelines

### Key Storage

- **Keychain**: Use for **Auth tokens**, passwords, and PII. Never store in **`UserDefaults`**.
- **SecItem API**: Use **`SecItemAdd`**, `SecItemUpdate`, and `SecItemDelete` for persistent secure storage. Use **`kSecClassGenericPassword`** for tokens.
- **Biometrics**: Use **`LocalAuthentication`** for **Face ID** or **Touch ID**. Use `LAContext` and verify availability with **`canEvaluatePolicy`** before evaluation.

### Data Protection

- **File Encryption**: Use **`Data.WritingOptions.completeFileProtection`** when saving files to disk.
- **App Sandboxing**: Respect the sandbox; do not attempt to access files outside of your container.
- **Sensitive Data**: Avoid storing PII in unprotected files.

### Network Security

- **ATS**: Don't disable **App Transport Security (ATS)** globally in `Info.plist`. In-transport encryption is mandatory.
- **SSL Pinning**: Use **ServerTrustManager** or **TrustKit** for backend-critical applications to prevent MITM attacks.

## Anti-Patterns

- **No secrets in UserDefaults**: Always use **Keychain**.
- **No unhandled LAError**: Check for userCancel, authenticationFailed, etc.
- **No PII/token logging**: Ensure sensitive logs are stripped in Release builds.

## References

- [Keychain & Biometrics Implementation](references/implementation.md)

## Related Topics

- common/security-standards
- architecture
