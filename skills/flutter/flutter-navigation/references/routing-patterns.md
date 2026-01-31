# Flutter Navigation Patterns

## 1. GoRouter Setup (Recommended)

```dart
// pubspec.yaml
dependencies:
  go_router: ^13.0.0

// router.dart
final router = GoRouter(
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => HomePage(),
      routes: [
        GoRoute(
          path: 'product/:id',
          builder: (context, state) => ProductPage(
            productId: state.pathParameters['id']!,
          ),
        ),
      ],
    ),
  ],
  redirect: (context, state) {
    // Auth logic here
    return null;
  },
);

// main.dart
MaterialApp.router(
  routerConfig: router,
)
```

## 2. Deep Linking Configuration

### AndroidManifest.xml

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="myapp" />
  <data android:scheme="https" android:host="example.com" />
</intent-filter>
```

### Info.plist

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

## 3. Handling Deep Links

```dart
GoRoute(
  path: '/product/:id',
  redirect: (context, state) async {
    final id = state.pathParameters['id'];
    final exists = await productService.exists(id);
    if (!exists) return '/';
    return null;
  },
  builder: (context, state) => ProductPage(
    productId: state.pathParameters['id']!,
  ),
)
```

## 4. Tab Navigation (State Preservation)

Use `IndexedStack` to keep `Navigator` states alive:

```dart
Scaffold(
  body: IndexedStack(
    index: _selectedIndex,
    children: [
      Navigator(onGenerateRoute: ...),
      Navigator(onGenerateRoute: ...),
    ],
  ),
  bottomNavigationBar: BottomNavigationBar(...),
);
```

## 5. Named Routes (Legacy)

```dart
MaterialApp(
  routes: {
    '/': (context) => HomePage(),
  },
  onGenerateRoute: (settings) {
    if (settings.name == '/product') {
      final args = settings.arguments as ProductArgs;
      return MaterialPageRoute(builder: (_) => ProductPage(productId: args.id));
    }
    return null;
  },
)
```
