# Flutter Notification Implementation

## 1. Setup Dependencies

```yaml
dependencies:
  firebase_messaging: ^14.7.0
  flutter_local_notifications: ^16.3.0
```

## 2. Initialization & Permission

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  final messaging = FirebaseMessaging.instance;
  // Request permission
  await messaging.requestPermission(
    alert: true, badge: true, sound: true,
  );

  final token = await messaging.getToken();
  runApp(MyApp());
}
```

## 3. Notification Handling Service

```dart
class NotificationService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _local = FlutterLocalNotificationsPlugin();

  Future<void> initialize() async {
    // 1. Init Local Notifications
    await _local.initialize(
      InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      ),
      onDidReceiveNotificationResponse: _onTap, // Foreground tap
    );

    // 2. Foreground Stream
    FirebaseMessaging.onMessage.listen(_showLocal);

    // 3. Background/Terminated -> Opened
    FirebaseMessaging.onMessageOpenedApp.listen(_handleTap);

    // 4. Terminated -> Launched
    final initialMsg = await _messaging.getInitialMessage();
    if (initialMsg != null) _handleTap(initialMsg);
  }

  void _showLocal(RemoteMessage msg) {
    _local.show(
      msg.hashCode,
      msg.notification?.title,
      msg.notification?.body,
      NotificationDetails(
        android: AndroidNotificationDetails('default', 'Default',
            importance: Importance.max, priority: Priority.high),
        iOS: DarwinNotificationDetails(),
      ),
      payload: jsonEncode(msg.data),
    );
  }

  void _handleTap(RemoteMessage msg) {
    // Navigate based on payload
  }
}
```

## 4. Permission Priming (Recommended)

Explain benefits before system dialog:

```dart
Future<void> requestPermission(BuildContext context) async {
  final userAgreed = await showDialog<bool>(...); // Show explanation dialog
  if (userAgreed == true) {
    await FirebaseMessaging.instance.requestPermission();
  }
}
```

## 5. iOS Badge Management

```dart
_local.resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()
    ?.setApplicationIconBadgeNumber(0); // Clear badge
```
