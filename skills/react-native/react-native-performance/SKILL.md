---
name: react-native-performance
description: 'Optimization strategies for smooth 60fps mobile apps. Use when optimizing React Native app performance, reducing re-renders, or fixing frame drops. (triggers: **/*.tsx, **/*.ts, FlatList, memo, useMemo, useCallback, performance, optimization)'
---

# React Native Performance

## **Priority: P0 (CRITICAL)**

## FlatList (60fps List) Optimization

- **`windowSize`**: **Reduce to 5-10** for memory-heavy lists (default 21). **`initialNumToRender`** should cover the first viewport.
- **`getItemLayout`**: Provide for **fixed-height items**. Skips runtime measurement.
- **`removeClippedSubviews`**: Enable for **Android** (default true) to offload clipped items.
- **`maxToRenderPerBatch`**: Limit to **5-10 items per frame** to prevent JS thread blockage.
- **`keyExtractor`**: Use **stable unique IDs**, never arrays index.
- **Function Refs**: Define **`renderItem` outside component** or wrap in **`useCallback`**.

## React Native Core Performance

- **The Engine**: Ensure **Hermes engine** is enabled (default in 0.7x). Verify via `global.HermesInternal`.
- **Animations**: Use **Native Driver (`useNativeDriver: true`)** or **Reanimated 3** for GPU-accelerated 60fps animations.
- **Re-renders**: Use **`React.memo`** and **`useMemo`** for expensive props. **Profile via Flipper** (React DevTools) for flamegraphs.
- **Network**: Batch API calls. Use **React Query/Zustand** to prevent unnecessary screen refreshes.
- **Images**: Use **`react-native-fast-image`** for caching and priority. Avoid large PNGs; use **WebP**.
- **Bundle Size**: Prune unused dependencies. Use **ProGuard/R8 (Android)** and **Fastlane** for builds.

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

## References

See [references/optimization-guide.md](references/optimization-guide.md) for FlatList configuration, memoization rules, and bundle analysis.
