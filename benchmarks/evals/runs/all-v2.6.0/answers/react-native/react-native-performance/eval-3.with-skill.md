Use a caching image implementation such as react-native-fast-image where its tradeoffs fit the app, and serve appropriately sized WebP assets instead of large PNGs. Give images known dimensions to reduce layout work and avoid decoding oversized originals.

For image-heavy lists, combine image caching with a tuned FlatList, memoized rows, stable keys, and incremental loading. Measure memory, cache hit behavior, startup, and scroll frame rate on representative devices; caching alone will not fix a JS-rendering bottleneck.



