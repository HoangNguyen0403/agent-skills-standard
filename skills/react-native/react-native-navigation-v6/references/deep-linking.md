# React Native Navigation Reference

Deep linking configuration and advanced navigation patterns.

## Deep Linking Configuration

### Universal Links Setup

**iOS (Info.plist)**:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>myapp</string>
    </array>
  </dict>
</array>
```

**Android (AndroidManifest.xml)**:

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https"
        android:host="myapp.com"
        android:pathPrefix="/product" />
</intent-filter>
```

### React Navigation Linking Config

```tsx
import { LinkingOptions } from '@react-navigation/native';

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['myapp://', 'https://myapp.com'],
  config: {
    screens: {
      Home: 'home',
      Profile: {
        path: 'user/:userId',
        parse: {
          userId: (userId) => `${userId}`,
        },
      },
      Product: {
        path: 'product/:id',
        parse: {
          id: (id) => parseInt(id, 10),
        },
      },
      NotFound: '*', // Catch-all for 404
    },
  },
};

function App() {
  return (
    <NavigationContainer linking={linking}>
      <RootNavigator />
    </NavigationContainer>
  );
}
```

**Test Deep Links**:

```bash
# iOS Simulator
xcrun simctl openurl booted "myapp://product/123"

# Android
adb shell am start -W -a android.intent.action.VIEW \
  -d "myapp://product/123" \
  com.myapp
```

## Nested Navigators Example

```tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name='Home' component={HomeScreen} />
      <Tab.Screen name='Search' component={SearchScreen} />
      <Tab.Screen name='Profile' component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Root Stack (with modals)
function RootNavigator() {
  return (
    <Stack.Navigator>
      {/* Main App */}
      <Stack.Screen
        name='MainTabs'
        component={MainTabs}
        options={{ headerShown: false }}
      />

      {/* Modal Screens */}
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen name='Settings' component={SettingsScreen} />
        <Stack.Screen name='CreatePost' component={CreatePostScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
```

## Navigation State Persistence

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';

const PERSISTENCE_KEY = 'NAVIGATION_STATE_V1';

function App() {
  const [isReady, setIsReady] = useState(false);
  const [initialState, setInitialState] = useState();

  useEffect(() => {
    // Restore navigation state
    const restoreState = async () => {
      try {
        const savedStateString = await AsyncStorage.getItem(PERSISTENCE_KEY);
        const state = savedStateString
          ? JSON.parse(savedStateString)
          : undefined;
        setInitialState(state);
      } finally {
        setIsReady(true);
      }
    };

    if (!isReady) {
      restoreState();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <NavigationContainer
      initialState={initialState}
      onStateChange={(state) =>
        AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state))
      }
    >
      <RootNavigator />
    </NavigationContainer>
  );
}
```

## Screen Options Patterns

```tsx
// Global options
<Stack.Navigator
  screenOptions={{
    headerStyle: { backgroundColor: '#007AFF' },
    headerTintColor: '#fff',
    headerBackTitleVisible: false,
  }}
>
  {/* Per-screen override */}
  <Stack.Screen
    name="Profile"
    component={ProfileScreen}
    options={{
      headerTitle: 'My Profile',
      headerRight: () => <Button title="Edit" onPress={...} />,
    }}
  />

  {/* Dynamic options from params */}
  <Stack.Screen
    name="Product"
    component={ProductScreen}
    options={({ route }) => ({
      headerTitle: route.params.name,
    })}
  />
</Stack.Navigator>
```
