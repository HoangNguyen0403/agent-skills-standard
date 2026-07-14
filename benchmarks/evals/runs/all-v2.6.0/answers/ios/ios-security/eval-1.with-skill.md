For iOS security best practices, focus on a few non-negotiables:

- Store tokens, credentials, and PII in the Keychain using `SecItemAdd`, `SecItemUpdate`, and `SecItemDelete` with `kSecClassGenericPassword`. Do not store secrets in `UserDefaults`.
- Use biometrics through `LocalAuthentication` and `LAContext`. Check `canEvaluatePolicy` before prompting, and handle cases like `userCancel` and `authenticationFailed`.
- Protect files written to disk with `Data.WritingOptions.completeFileProtection`.
- Keep App Transport Security enabled. Do not disable ATS globally in your app configuration.
- Use certificate pinning in production, such as with `ServerTrustManager` or `TrustKit`, to reduce MITM risk.
- Remove sensitive values like tokens, credentials, and PII from logs, especially in Release builds.

The main anti-patterns to avoid are storing secrets in `UserDefaults`, ignoring biometric error handling, and logging sensitive data.

