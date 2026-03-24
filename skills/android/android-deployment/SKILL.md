---
name: android-deployment
description: "Configure App Distribution — Signing, Obfuscation, and App Bundles for Android. Use when configuring Release build types, setting up signing configs, enabling R8/ProGuard minification, adding ProGuard keep rules, or preparing an .aab for Play Store submission. (triggers: build.gradle.kts, proguard-rules.pro, signingConfigs, proguard, minifyEnabled, isMinifyEnabled, isShrinkResources, .aab, releaseKeystore)"
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
