---
name: flutter-notifications
description: "Integrate push and local notifications using FCM and flutter_local_notifications. Use when adding push or local notifications to Flutter apps. (triggers: **/*notification*.dart, **/main.dart, FirebaseMessaging, FlutterLocalNotificationsPlugin, FCM, notification, push)"
---

# Flutter Notifications

## **Priority: P1 (OPERATIONAL)**

Push and local notification handling using `firebase_messaging` and `flutter_local_notifications`.

## Implementation Workflow

1. **Set up packages** — Add `firebase_messaging` (Push) and `flutter_local_notifications` (Local/Foreground).
2. **Request permission** — Prime users with a custom dialog explaining benefits _before_ the system prompt.
3. **Handle all lifecycle states** — Implement handlers for Foreground, Background, and Terminated states.
4. **Validate payloads** — Strictly validate notification data before navigating to screens.
5. **Clear badges** — Manually clear iOS app badges when visiting relevant screens.

### Lifecycle Handlers Example

See [implementation examples](references/implementation.md) for foreground, background, and terminated state notification handling.

[Implementation Details](references/implementation.md)

## Anti-Patterns

- ❌ Requesting permission on startup without context — show a primer dialog first
- ❌ Missing `getInitialMessage()` handler — breaks "open from terminated" state
- ❌ Leaving badges un-cleared — frustrates users; clear on relevant screen visits
- ❌ Navigating from raw JSON payloads without validation — causes crashes on malformed data

## Related Topics

flutter-navigation | mobile-ux-core | firebase/fcm
