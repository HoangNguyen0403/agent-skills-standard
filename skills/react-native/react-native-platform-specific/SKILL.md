---
name: react-native-platform-specific
description: Resolve iOS and Android differences using Platform API and native modules in React Native. Use when handling platform-specific behavior or integrating native modules in React Native.
metadata:
  triggers:
    files:
      - '**/*.tsx'
      - '**/*.ts'
      - '**/*.ios.*'
      - '**/*.android.*'
    keywords:
      - Platform
      - Platform.select
      - native-module
      - ios
      - android
---

# React Native Platform-Specific Code

## **Priority: P1 (OPERATIONAL)**

## Split Platform-Specific Files

Use `.ios.` and `.android.` for platform-specific files:

See [native modules reference](references/native-modules.md) for platform-specific file naming, `Platform.select` usage, and native bridge examples.

React Native automatically picks right file:

- **iOS**: Button.ios.tsx then Button.tsx (fallback)
- **Android**: Button.android.tsx then Button.tsx (fallback)

## Apply Platform Branching Inline

Use `Platform.select` or `Platform.OS` for small differences within shared file.

## Integrate Native Modules

- **Expo**: Use Expo modules when available (`expo-*` packages).
- **Bare RN**: Use community modules (`@react-native-community/*`).
- **Custom**: Write native modules in Swift/Kotlin when needed.

## Anti-Patterns

- **No Excessive Branching**: Extract to separate files if logic diverges significantly.
- **No Hardcoded Version Checks**: Use feature detection.
- **No Ignoring Android**: Test on both platforms.

## References

See [references/native-modules.md](references/native-modules.md) for Platform detection examples, Native Bridge (iOS/Android), Expo JSI Modules, and SafeArea handling.
