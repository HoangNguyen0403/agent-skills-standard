Handle the launch payload during app startup.

When the user taps a push notification from a terminated state, the app starts fresh, so you need to:

1. Read the initial notification / launch message when the app boots.
2. Extract the order ID from the payload.
3. Delay navigation until your app and navigator are ready.
4. Navigate to the order details screen.

Typical flow:

```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  final initialMessage = await FirebaseMessaging.instance.getInitialMessage();

  runApp(MyApp(initialMessage: initialMessage));
}
```

Then after the app is mounted:

```dart
class MyApp extends StatefulWidget {
  final RemoteMessage? initialMessage;

  const MyApp({super.key, this.initialMessage});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  final navigatorKey = GlobalKey<NavigatorState>();

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final data = widget.initialMessage?.data;
      final orderId = data?['orderId'];

      if (orderId != null) {
        navigatorKey.currentState?.pushNamed(
          '/order-details',
          arguments: orderId,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey,
      routes: {
        '/order-details': (_) => const OrderDetailsScreen(),
      },
    );
  }
}
```

If you're using another notification package, the idea is the same: check whether the app was launched from a notification, parse the payload, then route after initialization is complete.

