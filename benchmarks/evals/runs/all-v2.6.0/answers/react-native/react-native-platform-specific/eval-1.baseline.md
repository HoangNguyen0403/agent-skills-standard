# Platform-specific padding

Use `Platform.select` or a platform check in the style definition:

```tsx
const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.select({ios: 24, android: 16, default: 16}),
  },
});
```

If the difference is caused by safe areas, prefer `SafeAreaView` or `useSafeAreaInsets` from `react-native-safe-area-context` and add the inset to the design spacing rather than hardcoding device-specific status-bar values. Keep platform differences near the component/style boundary and document why they exist. Test notches, status-bar modes, orientation, and both platforms. Use `Platform.OS` only when the value cannot be expressed through a shared layout primitive; do not fork the whole component for a one-property difference.

