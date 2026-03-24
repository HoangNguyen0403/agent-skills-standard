---
name: react-native-platform-specific
description: "Handle iOS and Android differences using Platform API and native modules in React Native. Use when handling platform-specific behavior or integrating native modules in React Native. (triggers: **/*.tsx, **/*.ts, **/*.ios.*, **/*.android.*, Platform, Platform.select, native-module, ios, android)"
---

# React Native Platform-Specific Code

## **Priority: P1 (OPERATIONAL)**

## Split Platform-Specific Files

Use `.ios.` and `.android.` for platform-specific files:

```text
Button.tsx          # Shared
Button.ios.tsx      # iOS-specific
Button.android.tsx  # Android-specific
```

React Native automatically picks the right file:

- **iOS**: Button.ios.tsx then Button.tsx (fallback)
- **Android**: Button.android.tsx then Button.tsx (fallback)

## Apply Platform Branching Inline

Use `Platform.select` or `Platform.OS` for small differences within a shared file:

```tsx
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  shadow: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
    android: { elevation: 4 },
    default: {},
  }),
});
```

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
