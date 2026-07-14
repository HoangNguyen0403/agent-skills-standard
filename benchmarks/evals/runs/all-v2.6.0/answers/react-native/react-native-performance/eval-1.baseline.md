# Optimizing a slow FlatList

Profile first and determine whether the bottleneck is row rendering, image work, JavaScript, or layout. Then apply the relevant changes:

- Keep `renderItem`, callbacks, and item keys stable; use `keyExtractor` with stable IDs.
- Memoize row components with `React.memo` and pass primitive/stable props.
- Keep rows small and avoid expensive calculations or inline-created component types.
- Tune `initialNumToRender`, `maxToRenderPerBatch`, `updateCellsBatchingPeriod`, and `windowSize` based on measurement; do not blindly minimize them.
- Provide `getItemLayout` for fixed-height rows and avoid nesting virtualized lists in a `ScrollView`.
- Resize/compress images and avoid rendering large off-screen content.
- Use pagination/infinite loading instead of putting every record in memory when possible.

Use the React Native performance monitor, Flipper/Hermes profiling, and release-mode testing on representative devices. Verify that optimizations preserve accessibility, refresh behavior, and list state. `removeClippedSubviews` can help in some cases but has platform/layout tradeoffs, so test it rather than treating it as a universal fix.

