For a small difference in a shared component, use Platform.select or a guarded Platform.OS branch:

const paddingTop = Platform.select({ ios: 24, android: 12, default: 12 });

Keep the shared style in StyleSheet.create and use the platform value only for the actual difference. Prefer feature detection over hardcoded OS-version checks, and verify the result on both platforms.



