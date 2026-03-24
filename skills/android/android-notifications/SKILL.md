---
name: android-notifications
description: "Integrate push notifications on Android using Firebase Cloud Messaging and NotificationCompat. Use when integrating FCM or local notifications in Android apps. (triggers: **/*Notification*.kt, **/MainActivity.kt, FirebaseMessaging, NotificationCompat, NotificationChannel, FCM)"
---

# Android Notifications

## **Priority: P2 (OPTIONAL)**

Push notifications using Firebase Cloud Messaging.

## Implementation Guidelines

- **Channels**: Create **`NotificationChannel`** with a unique ID (required for **API 26+**). Notifications without a valid channel are **silently dropped**. Use **`NotificationCompat`** for backwards compatibility.
- **Permissions**: **Explicitly request `POST_NOTIFICATIONS`** on **Android 13+ (API 33)**. Avoid requesting system permission on **app launch**; show a **priming dialog** first to explain the benefit.
- **Service**: Implement **`FirebaseMessagingService`** with **`onMessageReceived`** and **`onNewToken`** for background push handling. Declare the service in **`AndroidManifest`** with the `MESSAGING_EVENT` intent action.
- **Flow**: Handle **notification taps in both `onCreate` and `onNewIntent`** using **`PendingIntent`**. Pass data between activities via `Intent` extras.
- **Payload**: Limit the notification payload to essential IDs. Perform **background data fetching** via WorkManager if more data is needed.

## Anti-Patterns

- **No Missing Channel**: Notifications fail silently without channels on API 26+.
- **No Unconditional Requests**: Don't spam permission dialog on first launch.
- **No Missing Manifest**: Service must be declared with `MESSAGING_EVENT` action.

## References

- [Implementation Details](references/implementation.md)
