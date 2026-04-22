---
name: android-security
description: Secure data encryption, network configuration, and permissions in Android apps. Use when handling API keys, auth tokens, certificate pinning, EncryptedSharedPreferences, or securing exported components.
metadata:
  triggers:
    files:
    - 'network_security_config.xml'
    - 'AndroidManifest.xml'
    keywords:
    - EncryptedSharedPreferences
    - cleartextTrafficPermitted
    - intent-filter
    - api key
    - token storage
    - certificate pinning
    - root detection
    - secure storage
---
# Android Security Standards

## **Priority: P0 (CRITICAL)**

## Implementation Guidelines

### Data Storage

- **Secrets**: NEVER store API keys in code. Use `EncryptedSharedPreferences` for sensitive local data (Tokens).
- **Keystore**: Use Android Keystore System for cryptographic keys.

### Network

- **HTTPS**: Enforce HTTPS via `network_security_config.xml` (`cleartextTrafficPermitted="false"`).
- **Pinning**: Consider Certificate Pinning for high-security apps.

### Component Export

- **Exported**: Explicitly set `android:exported="false"` for Activities/Receivers unless intended for external use.

## Anti-Patterns

- **No Sensitive Logs**: Strip logs in Release builds.
- **No Homebrew Root Detection**: Use Play Integrity API instead.
- **No Raw URL String Concatenation**: Use `Uri.Builder` or `HttpUrl` (OkHttp) to prevent parameter injection.

## References

- [Setup Examples](references/implementation.md)
- [common/common-security-standards] — shared OWASP baselines
- [android/android-legacy-security] — Intent, WebView, and FileProvider hardening