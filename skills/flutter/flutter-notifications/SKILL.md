---
name: flutter-notifications
description: Integrate push and local notifications using FCM and flutter_local_notifications. Use when adding push or local notification support to Flutter apps.
metadata:
  triggers:
    files:
    - '**/*notification*.dart'
    - '**/main.dart'
    keywords:
    - FirebaseMessaging
    - FlutterLocalNotificationsPlugin
    - FCM
    - notification
    - push
---
# Flutter Notifications

## **Priority: P1 (OPERATIONAL)**


## Implementation Workflow

1. **Set up packages** — Add `firebase_messaging` (Push) and `flutter_local_notifications` (Local/Foreground).
2. **Request permission** — Prime users with custom dialog explaining benefits _before_ system prompt.
3. **Handle all lifecycle states** — Implement handlers for Foreground, Background, and Terminated states.
4. **Validate payloads** — Strictly validate notification data before navigating to screens.
5. **Clear badges** — Manually clear iOS app badges when visiting relevant screens.

### Lifecycle Handlers Example

See [implementation examples](references/implementation.md) for foreground, background, and terminated state notification handling.

[Implementation Details](references/implementation.md)

## Anti-Patterns

- **No Early Permission Popups**: Show primer dialog explaining value first
- **No Missing `getInitialMessage()`**: Always handle "open from terminated" startup state
- **No Uncleared Badges**: Manually clear notification badges upon related screen visits
- **No Unvalidated Payloads**: Validate all JSON data before navigating on click

## Related Topics

flutter-navigation | mobile-ux-core | firebase/fcm