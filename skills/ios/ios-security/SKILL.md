---
name: ios-security
description: "Secure iOS apps with Keychain, biometrics, and data protection. Use when implementing Keychain storage, Face ID/Touch ID, or data protection in iOS. (triggers: **/*.swift, SecItemAdd, kSecClassGenericPassword, LAContext, LocalAuthentication)"
---

# iOS Security

## **Priority: P0 (CRITICAL)**

## Implementation Workflow

1. **Store secrets in Keychain** — Use `SecItemAdd`, `SecItemUpdate`, and `SecItemDelete` with `kSecClassGenericPassword` for tokens/PII. Never use `UserDefaults`.
2. **Add biometric auth** — Use `LocalAuthentication` with `LAContext`. Verify availability with `canEvaluatePolicy` before prompting.
3. **Encrypt files** — Use `Data.WritingOptions.completeFileProtection` when saving to disk.
4. **Keep ATS enabled** — Never disable App Transport Security globally in `Info.plist`.
5. **Pin certificates** — Use `ServerTrustManager` or `TrustKit` for production apps to prevent MITM attacks.
6. **Strip sensitive logs** — Ensure PII and tokens are removed from logs in Release builds.

### Keychain Storage Example

```swift
func storeToken(_ token: String, for account: String) throws {
    let data = Data(token.utf8)
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: account,
        kSecValueData as String: data,
        kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
    ]
    let status = SecItemAdd(query as CFDictionary, nil)
    guard status == errSecSuccess else { throw KeychainError.unhandledError(status) }
}
```

### Biometric Authentication Example

```swift
let context = LAContext()
var error: NSError?
guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
    // Handle unavailable biometrics
    return
}
context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
                       localizedReason: "Authenticate to access your account") { success, error in
    // Handle result on MainActor
}
```

## Anti-Patterns

- ❌ Secrets in `UserDefaults` — always use Keychain
- ❌ Unhandled `LAError` — check for `userCancel`, `authenticationFailed`, etc.
- ❌ PII/token logging in Release builds — strip sensitive data from all log output

## References

- [Keychain & Biometrics Implementation](references/implementation.md)

## Related Topics

- common/security-standards
- architecture
