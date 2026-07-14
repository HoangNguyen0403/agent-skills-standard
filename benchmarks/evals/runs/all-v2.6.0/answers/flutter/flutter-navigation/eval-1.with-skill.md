Use `go_router` with a typed route constant and platform deep-link config so the app can resolve `ourapp://orders/123` directly into the order detail screen.

```yaml
# pubspec.yaml
dependencies:
  go_router: ^14.2.0
```

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

abstract final class Routes {
  static const orderDetail = '/orders/:orderId';
}

final router = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: Routes.orderDetail,
      redirect: (context, state) {
        final orderId = state.pathParameters['orderId'];
        if (orderId == null || orderId.isEmpty) return '/';
        return null;
      },
      builder: (context, state) {
        final orderId = state.pathParameters['orderId']!;
        return OrderDetailScreen(orderId: orderId);
      },
    ),
  ],
);

void main() {
  runApp(MyApp(router: router));
}

class MyApp extends StatelessWidget {
  const MyApp({super.key, required this.router});

  final GoRouter router;

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      routerConfig: router,
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: Text('Home')));
  }
}

class OrderDetailScreen extends StatelessWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Order Detail')),
      body: Center(child: Text('Order: $orderId')),
    );
  }
}
```

Android intent filter:

```xml
<activity
    android:name=".MainActivity"
    android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="ourapp" android:host="orders" />
    </intent-filter>
</activity>
```

iOS URL scheme in `Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>ourapp</string>
    </array>
  </dict>
</array>
```

When the push notification opens `ourapp://orders/123`, `go_router` maps it to `/orders/123`, validates `orderId`, and renders `OrderDetailScreen(orderId: '123')`.

