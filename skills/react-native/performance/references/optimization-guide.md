# React Native Performance Reference

Advanced optimization techniques and detailed examples.

## FlatList Advanced Optimization

```tsx
import { FlatList, View, Text } from 'react-native';

const ITEM_HEIGHT = 80;

function OptimizedList({ data }: { data: Item[] }) {
  // Fixed height allows skipping measurement
  const getItemLayout = (data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  });

  // Extract render function to prevent recreation
  const renderItem = useCallback(({ item }) => <ItemCard item={item} />, []);

  // Stable key extractor
  const keyExtractor = useCallback((item) => item.id.toString(), []);

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      // Performance props
      windowSize={10} // Render 10 items outside viewport
      maxToRenderPerBatch={5} // Render 5 items per frame
      updateCellsBatchingPeriod={50} // 50ms batching
      removeClippedSubviews={true} // Android optimization
      initialNumToRender={10} // Initial render count
    />
  );
}
```

## React.memo with Props Comparison

```tsx
import { memo } from 'react';

type Props = { user: User; onPress: () => void };

// Shallow comparison (default)
const UserCard = memo(function UserCard({ user, onPress }: Props) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text>{user.name}</Text>
    </TouchableOpacity>
  );
});

// Custom comparison
const UserCardCustom = memo(
  function UserCard({ user, onPress }: Props) {
    return (
      <TouchableOpacity onPress={onPress}>
        <Text>{user.name}</Text>
      </TouchableOpacity>
    );
  },
  (prevProps, nextProps) => {
    // Return true if props are equal (skip render)
    return (
      prevProps.user.id === nextProps.user.id &&
      prevProps.user.updatedAt === nextProps.user.updatedAt
    );
  },
);
```

## useMemo and useCallback

```tsx
function ProductList({ products, category }) {
  // Expensive calculation - memoize
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => p.category === category)
      .sort((a, b) => b.price - a.price);
  }, [products, category]);

  // Stabilize function reference for memo'd child
  const handlePress = useCallback(
    (productId: string) => {
      navigation.navigate('Product', { id: productId });
    },
    [navigation],
  );

  return (
    <FlatList
      data={filteredProducts}
      renderItem={({ item }) => (
        <ProductCard product={item} onPress={handlePress} />
      )}
    />
  );
}
```

## Image Optimization with Fast Image

```tsx
import FastImage from 'react-native-fast-image';

function Avatar({ uri, size = 50 }: Props) {
  return (
    <FastImage
      source={{
        uri,
        priority: FastImage.priority.normal,
        cache: FastImage.cacheControl.immutable,
      }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      resizeMode={FastImage.resizeMode.cover}
    />
  );
}

// Preload images
FastImage.preload([
  { uri: 'https://example.com/avatar1.jpg' },
  { uri: 'https://example.com/avatar2.jpg' },
]);
```

## Bundle Size Analysis

```bash
# React Native CLI
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res

# Analyze with source-map-explorer
npm install -g source-map-explorer
source-map-explorer android/app/src/main/assets/index.android.bundle.map
```

## Hermes Configuration

```js
// android/app/build.gradle
project.ext.react = [
    enableHermes: true,  // Enable Hermes
]

// metro.config.js
module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true, // Lazy loading
      },
    }),
  },
};
```

## Strip console.log in Production

```js
// babel.config.js
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: ['react-native-reanimated/plugin'],
  env: {
    production: {
      plugins: ['transform-remove-console'], // Strip console.log
    },
  },
};
```

```bash
npm install --save-dev babel-plugin-transform-remove-console
```
