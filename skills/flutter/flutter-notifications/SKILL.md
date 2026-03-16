---
name: flutter-notifications
description: "Push and local notifications for Flutter using FCM and flutter_local_notifications. Use when integrating push or local notifications in Flutter apps. (triggers: **/*notification*.dart, **/main.dart, FirebaseMessaging, FlutterLocalNotificationsPlugin, FCM, notification, push)"
---

# Flutter Notifications

## **Priority: P1 (OPERATIONAL)**

Push and local notifications interactions.

## Guidelines

- **Stack**: Use `firebase_messaging` (Push) + `flutter_local_notifications` (Local/Foreground).
- **Lifecycle**: Handle all 3 states explicitly: Foreground, Background, Terminated.
- **Permissions**: Prime users with a custom dialog explaining benefits _before_ system request.
- **Navigation**: Validate notification payload data strictly before navigating.
- **Badges**: Manually clear iOS app badges when visiting relevant screens.

[Implementation Details](references/implementation.md)

## Anti-Patterns

- **No Unconditional Permission**: Don't ask on startup without context.
- **No Missing State Handlers**: Forgetting `getInitialMessage()` breaks "open from terminated".
- **No Forgotten Badge Clear**: Leaving notifications un-cleared frustrates users.
- **No Direct Navigation**: Parsing JSON payloads without validation leads to crashes.

## Related Topics

flutter-navigation | mobile-ux-core | firebase/fcm
