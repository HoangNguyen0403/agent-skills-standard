Use `FirebaseMessaging.instance.getInitialMessage()` during app startup. That is the API that tells you whether the app was cold-started from a notification tap while terminated.

Example:

```dart
final navigatorKey = GlobalKey<NavigatorState>();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  runApp(MyApp(navigatorKey: navigatorKey));

  final initialMessage = await FirebaseMessaging.instance.getInitialMessage();
  if (initialMessage != null) {
    _handleNotificationNavigation(initialMessage.data);
  }
}

void _handleNotificationNavigation(Map<String, dynamic> data) {
  final orderId = data['orderId'];
  if (orderId is! String || orderId.isEmpty) return;

  navigatorKey.currentState?.pushNamed(
    '/order-details',
    arguments: orderId,
  );
}
```

You should also handle the other app states:

```dart
FirebaseMessaging.onMessageOpenedApp.listen((message) {
  _handleNotificationNavigation(message.data);
});
```

Key points:

- Use `getInitialMessage()` for the terminated state.
- Validate the payload before navigating, for example make sure `orderId` exists and is valid.
- Register your route/navigation setup before trying to push.
- If you support foreground notifications too, use `flutter_local_notifications` for display, but terminated-launch navigation still comes from `getInitialMessage()`.

