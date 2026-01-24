---
name: React Native Platform-Specific Code
description: Handling iOS and Android differences with Platform API and native modules.
metadata:
  labels: [react-native, platform, ios, android, native-modules]
  triggers:
    files: ['**/*.tsx', '**/*.ts', '**/*.ios.*', '**/*.android.*']
    keywords: [Platform, Platform.select, native-module, ios, android]
---

# React Native Platform-Specific Code

## **Priority: P1 (OPERATIONAL)**

## Platform Detection

```tsx
import { Platform } from 'react-native';

// Simple Check
if (Platform.OS === 'ios') {
  // iOS-specific code
}

// Object Selection
const styles = Platform.select({
  ios: { paddingTop: 20 },
  android: { paddingTop: 0 },
  default: { paddingTop: 10 }, // Fallback
});
```

## File Extensions

Use `.ios.` and `.android.` for platform-specific files:

```text
Button.tsx          # Shared
Button.ios.tsx      # iOS-specific
Button.android.tsx  # Android-specific
```

React Native automatically picks the right file:

- **iOS**: Button.ios.tsx → Button.tsx (fallback)
- **Android**: Button.android.tsx → Button.tsx (fallback)

## Native Modules

- **Expo**: Use Expo modules when available (`expo-*` packages).
- **Bare RN**: Use community modules (`@react-native-community/*`).
- **Custom**: Write native modules in Swift/Kotlin when needed.

## Anti-Patterns

- **No Excessive Branching**: Extract to separate files if logic diverges.
- **No Hardcoded Version Checks**: Use feature detection.
- **No Ignoring Android**: Test on both platforms.

## Reference & Examples

See [references/native-modules.md](references/native-modules.md) for Native Bridge (iOS/Android), Expo JSI Modules, and SafeArea handling.

## Related Topics

components | styling
