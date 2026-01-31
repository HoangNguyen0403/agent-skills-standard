# React Native Navigation Patterns

## 1. Type-Safe Stack

```typescript
import { createNativeStackNavigator } from '@react-navigation/native-stack';

type RootStackList = {
  Home: undefined;
  Product: { productId: string };
};

const Stack = createNativeStackNavigator<RootStackList>();

function App() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Product" component={ProductScreen} />
    </Stack.Navigator>
  );
}
// Usage: navigation.navigate('Product', { productId: '123' });
```

## 2. Deep Linking Configuration

```typescript
const linking = {
  prefixes: ['myapp://', 'https://example.com'],
  config: {
    screens: {
      Product: {
        path: 'product/:id',
        parse: { id: (id) => id },
      },
      Profile: 'profile/:username',
    },
  },
};

<NavigationContainer linking={linking}>{/*...*/}</NavigationContainer>
```

## 3. Platform Setup

**Android (AndroidManifest.xml)**

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="myapp" />
  <data android:scheme="https" android:host="example.com" />
</intent-filter>
```

**iOS (Info.plist)**

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array><string>myapp</string></array>
  </dict>
</array>
```

## 4. Parameter Validation

```typescript
function ProductScreen({ route, navigation }: Props) {
  const { productId } = route.params;
  const { data, error } = useProduct(productId);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', 'Not found');
      navigation.goBack();
    }
  }, [error]);
}
```
