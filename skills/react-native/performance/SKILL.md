---
name: React Native Performance
description: Optimization strategies for smooth 60fps mobile apps.
metadata:
  labels: [react-native, performance, optimization, flatlist]
  triggers:
    files: ['**/*.tsx', '**/*.ts']
    keywords: [FlatList, memo, useMemo, useCallback, performance, optimization]
---

# React Native Performance

## **Priority: P0 (CRITICAL)**

## FlatList Optimization

- **windowSize**: Reduce to 5-10 for long lists (default 21).
- **getItemLayout**: Provide for fixed-height items. Skips measurement.
- **removeClippedSubviews**: Enable for Android (default true).
- **maxToRenderPerBatch**: Limit to 5-10 items per frame.
- **keyExtractor**: Use stable unique IDs, never index.
- **Avoid Anonymous Functions**: Define `renderItem` outside component or use `useCallback`.

## React Optimization

- **React.memo**: Wrap presentational components to prevent re-renders.
- **useMemo**: Cache expensive calculations.
- **useCallback**: Stabilize function refs for child props.
- **Avoid Inline Objects**: Extract to constants or `useMemo`.

## Navigation

- **Lazy Screens**: Use `lazy` prop for stack screens (enabled by default).
- **Avoid Listeners**: Remove navigation event listeners in cleanup.

## Images

- **Image Caching**: Use `react-native-fast-image` for network images.
- **Resize**: Provide `resizeMode` and fixed dimensions.
- **Format**: Use WebP for smaller size.

## Bundle Size

- **Hermes**: Enable for faster startup (default in RN 0.70+).
- **Tree Shaking**: Remove unused imports.
- **ProGuard/R8**: Enable code shrinking on Android.

## Anti-Patterns

- **No ScrollView for Large Lists**: Use FlatList.
- **No Inline Styles**: Use `StyleSheet.create` (optimized).
- **No console.log in Production**: Strip with babel plugin.

## Reference & Examples

See [references/optimization-guide.md](references/optimization-guide.md) for FlatList configuration, memoization rules, and bundle analysis.

## Related Topics

react/performance | common/performance-engineering
