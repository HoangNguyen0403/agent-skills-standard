---
name: Android Notifications
description: Push notifications for Android using Firebase Cloud Messaging and NotificationCompat.
metadata:
  labels: [android, fcm, notifications, push, notification-channels]
  triggers:
    files: ['**/*Notification*.kt', '**/MainActivity.kt']
    keywords: [FirebaseMessaging, NotificationCompat, NotificationChannel, FCM]
---

# Android Notifications

## **Priority: P2 (OPTIONAL)**

Push notifications using Firebase Cloud Messaging.

## Guidelines

- **Service**: Implement `FirebaseMessagingService` for handling background messages.
- **Channels**: Must create `NotificationChannel` for Android 8.0+ compatibility.
- **Permissions**: Request `POST_NOTIFICATIONS` explicitly on Android 13+.
- **Intents**: Handle notification taps in both `onCreate` and `onNewIntent`.
- **Priming**: Show benefit dialog before requesting system permissions.

[Implementation Details](references/implementation.md)

## Anti-Patterns

- **No Missing Channel**: Notifications fail silently without channels on API 26+.
- **No Unconditional Requests**: Don't spam permission dialog on first launch.
- **No Missing Manifest**: Service must be declared with `MESSAGING_EVENT` action.

## Related Topics

android-navigation | android-design-system | mobile-ux-core
