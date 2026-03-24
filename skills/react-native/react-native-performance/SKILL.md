---
name: react-native-performance
description: "Optimize React Native rendering for smooth 60fps mobile experiences. Use when optimizing React Native app performance, reducing re-renders, or fixing frame drops. (triggers: **/*.tsx, **/*.ts, FlatList, memo, useMemo, useCallback, performance, optimization)"
---

# React Native Performance

## **Priority: P0 (CRITICAL)**

## Tune FlatList for 60fps

- **`windowSize`**: **Reduce to 5-10** for memory-heavy lists (default 21). **`initialNumToRender`** should cover the first viewport.
- **`getItemLayout`**: Provide for **fixed-height items**. Skips runtime measurement.
- **`removeClippedSubviews`**: Enable for **Android** (default true) to offload clipped items.
- **`maxToRenderPerBatch`**: Limit to **5-10 items per frame** to prevent JS thread blockage.
- **`keyExtractor`**: Use **stable unique IDs**, never array index.

```tsx
const ITEM_HEIGHT = 72;

const renderItem = useCallback(({ item }: { item: Product }) => (
  <ProductCard product={item} />
), []);

<FlatList
  data={products}
  renderItem={renderItem}
  keyExtractor={(item) => item.id}
  getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
  windowSize={7}
  maxToRenderPerBatch={5}
  initialNumToRender={10}
  removeClippedSubviews
/>
```

## Accelerate Core Rendering

- **The Engine**: Ensure **Hermes engine** is enabled (default in 0.7x). Verify via `global.HermesInternal`.
- **Animations**: Use **Native Driver (`useNativeDriver: true`)** or **Reanimated 3** for GPU-accelerated 60fps animations.
- **Re-renders**: Use **`React.memo`** and **`useMemo`** for expensive props. **Profile via Flipper** (React DevTools) for flamegraphs.
- **Network**: Batch API calls. Use **React Query/Zustand** to prevent unnecessary screen refreshes.
- **Images**: Use **`react-native-fast-image`** for caching and priority. Avoid large PNGs; use **WebP**.

## Reduce Bundle and Startup Time

- **Hermes**: Enable for faster startup (default in RN 0.70+).
- **Tree Shaking**: Remove unused imports.
- **ProGuard/R8**: Enable code shrinking on Android.
- **Lazy Screens**: Use `lazy` prop for stack screens (enabled by default).

## Anti-Patterns

- **No ScrollView for Large Lists**: Use FlatList.
- **No Inline Styles**: Use `StyleSheet.create` (optimized).
- **No console.log in Production**: Strip with babel plugin.

## References

See [references/optimization-guide.md](references/optimization-guide.md) for FlatList configuration, memoization rules, and bundle analysis.
