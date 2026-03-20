---
name: ios-security
description: 'Standards for Keychain, Biometrics, and Data Protection. Use when implementing Keychain storage, Face ID/Touch ID, or data protection in iOS. (triggers: **/*.swift, SecItemAdd, kSecClassGenericPassword, LAContext, LocalAuthentication)'
---

# iOS Security Standards

## **Priority: P0 (CRITICAL)**

## Implementation Guidelines

### Key Storage

- **Keychain**: Use for sensitive tokens, passwords, and identifiers (UUIDs). Never store in `UserDefaults`.
- **Valet**: Use high-level wrappers like SwiftKeychainWrapper or Valet to avoid raw Security.framework C-APIs.
- **Biometrics**: Use `LocalAuthentication` for FaceID/TouchID. Verify availability with `canEvaluatePolicy(_:error:)` before evaluation.

### Data Protection

- **File Encryption**: Use `Data.WritingOptions.completeFileProtection` when saving files to disk.
- **App Sandboxing**: Respect the sandbox; do not attempt to access files outside of your container.

### Network Security

- **ATS**: Don't disable App Transport Security (ATS) globally in `Info.plist`. Use exceptions only if strictly necessary.
- **SSL Pinning**: Use TrustKit or Alamofire pinning for backend-critical applications.

## Anti-Patterns

- **No secrets in UserDefaults**: Use Keychain.
- **No unhandled LAError**: Check for userCancel, authenticationFailed, etc.
- **No PII/token logging**: Ensure logs are stripped in Release builds.

## References

- [Keychain & Biometrics Implementation](references/implementation.md)

## Related Topics

- common/security-standards
- architecture
