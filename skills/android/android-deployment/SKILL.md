---
name: android-deployment
description: "Standards for App Distribution (Signing, Obfuscation, App Bundles). Use when signing, obfuscating, or building Android App Bundles for distribution. (triggers: build.gradle.kts, proguard-rules.pro, signingConfigs, proguard, minifyEnabled, .aab)"
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

- **Debug in Release**: `**No Debug Flags**: Ensure debuggable = false.`
- **Hardcoded Secrets**: `**No Secrets in Repo**: Use local.properties or Env Vars.`

## References

- [Signing & R8](references/implementation.md)
