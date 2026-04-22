---
name: android-notifications
description: Integrate push notifications using Firebase Cloud Messaging and NotificationCompat on Android. Use when setting up FCM, creating notification channels, or handling local notifications.
metadata:
  triggers:
    files:
    - '**/*Notification*.kt'
    - '**/MainActivity.kt'
    keywords:
    - FirebaseMessaging
    - NotificationCompat
    - NotificationChannel
    - FCM
---
# Android Notifications

## **Priority: P2 (OPTIONAL)**


## Implementation Guidelines

- **Channels**: Create **`NotificationChannel`** with unique ID (required for **API 26+**). Notifications without valid channel **silently dropped**. Use **`NotificationCompat`** for backwards compatibility.
- **Permissions**: **Explicitly request `POST_NOTIFICATIONS`** on **Android 13+ (API 33)**. Avoid requesting system permission on **app launch**; show **priming dialog** first to explain benefit.
- **Service**: Implement **`FirebaseMessagingService`** with **`onMessageReceived`** and **`onNewToken`** for background push handling. Declare service in **`AndroidManifest`** with `MESSAGING_EVENT` intent action.
- **Flow**: Handle **notification taps in both `onCreate` and `onNewIntent`** using **`PendingIntent`**. Pass data between activities via `Intent` extras.
- **Payload**: Limit notification payload to essential IDs. Perform **background data fetching** via WorkManager if more data needed.

## Anti-Patterns

- **No Missing Channel**: Notifications fail silently without channels on API 26+.
- **No Unconditional Requests**: Don't spam permission dialog on first launch.
- **No Missing Manifest**: Service must declared with `MESSAGING_EVENT` action.

## References

- [Implementation Details](references/implementation.md)