---
name: android-deployment
description: Configure release signing, R8 obfuscation, and App Bundle publishing for Android. Use when setting up signing configs, enabling minification, adding ProGuard keep rules, or preparing for Play Store submission.
metadata:
  triggers:
    files:
    - 'build.gradle.kts'
    - 'proguard-rules.pro'
    keywords:
    - signingConfigs
    - proguard
    - minifyEnabled
    - isMinifyEnabled
    - isShrinkResources
    - .aab
    - releaseKeystore
---
# Android Deployment Standards

## **Priority: P0**

## Implementation Guidelines

### Build Configuration

- **Minification**: Always enable `isMinifyEnabled = true` and `isShrinkResources = true` for Release builds (R8).
- **Format**: Publish using **App Bundles (.aab)** for Play Store optimization.
- **Signing**: NEVER commit keystores or passwords. Use Environment Variables / Secrets.

### Proguard / R8

- **Rules**: Keep rules minimal. Use annotations (`@Keep`) for reflection-heavy classes instead of broad wildcard rules.
- **Mapping**: Upload `mapping.txt` to Play Console for crash de-obfuscation.

## Anti-Patterns

- **No debuggable=true in Release**: Breaks obfuscation and exposes internal logic.
- **No Secrets in Repo**: Use local.properties or CI environment variables.

## References

- [Signing & R8](references/implementation.md)