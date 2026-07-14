Common iOS security anti-patterns to avoid:

- Storing tokens, passwords, or PII in `UserDefaults` instead of Keychain (`SecItemAdd` / `SecItemUpdate`).
- Skipping biometric prechecks and error handling, such as not calling `canEvaluatePolicy` first or ignoring `LAError` cases like `userCancel` and `authenticationFailed`.
- Writing sensitive files without iOS data protection, instead of using options like `.completeFileProtection`.
- Disabling App Transport Security broadly to make networking “easier,” which weakens transport security.
- Shipping without certificate pinning for high-trust production traffic where MITM resistance matters.
- Logging tokens, PII, session IDs, or auth flow details in production logs.
- Treating biometrics as secret storage by themselves; biometrics should gate access, while secrets still belong in secure storage.
- Leaving fallback and release behavior inconsistent, for example protecting debug paths but exposing sensitive data in release logging or disk writes.

In short: keep secrets in Keychain, validate and handle biometric flows correctly, protect files at rest, keep ATS on, avoid leaking data in logs, and harden network trust where appropriate.

