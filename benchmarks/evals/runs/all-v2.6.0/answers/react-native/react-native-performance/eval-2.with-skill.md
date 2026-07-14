Profile first with React DevTools or Flipper and determine whether the UI thread, JS thread, rendering, or network is responsible. Verify Hermes is enabled, remove unnecessary renders with React.memo, useMemo, and useCallback where they address measured work, and keep large collections in FlatList with stable keys.

Use the native animation driver or Reanimated 3 for animations, avoid heavy JS work on each frame, cache and resize images, and batch network requests. Strip production console logging and enable Android R8/ProGuard as appropriate. Test on a lower-end Android device and compare frame behavior after each change.



