---
name: Android Security
description: Standards for Data Encryption, Network Security, and Permissions
metadata:
  labels: [android, security, encryption]
  triggers:
    files: ['network_security_config.xml', 'AndroidManifest.xml']
    keywords:
      [
        'EncryptedSharedPreferences',
        'cleartextTrafficPermitted',
        'intent-filter',
      ]
options:
  - version: 1.0.0
---

# Android Security Standards

## **Priority: P0**

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

- **Logging**: `**No Sensitive Logs**: Strip logs in Release.`
- **Root Detection**: `**Avoid Homebrew**: Use Play Integrity API.`

## References

- [Setup Examples](references/implementation.md)
