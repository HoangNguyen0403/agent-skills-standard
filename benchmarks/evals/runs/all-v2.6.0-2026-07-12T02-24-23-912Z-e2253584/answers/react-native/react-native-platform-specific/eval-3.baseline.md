# Accessing an iOS-only native module

Guard access at runtime and provide a safe Android fallback. Prefer a platform-specific wrapper:

```tsx
// iosOnlyFeature.ios.ts
import {NativeModules} from 'react-native';
export const iosOnlyFeature = NativeModules.IOSOnlyFeature;

// iosOnlyFeature.android.ts
export const iosOnlyFeature = null;
```

Import the wrapper rather than referencing the iOS module throughout the app. Check for a missing module and expose a typed capability such as `isSupported`; do not call it on Android. If the module is a TurboModule, define its typed spec and register/configure it in the iOS native project, then rebuild the app after native changes. Keep the UI’s unsupported state explicit, handle native errors, and test an actual iOS build plus the Android fallback. Do not assume a JavaScript `Platform.OS` check alone prevents a missing native import from being evaluated.

