# FCM in a bare React Native app

Create Firebase projects/configurations for the intended environments and add the native Firebase configuration files: `GoogleService-Info.plist` for iOS and `google-services.json` for Android, with appropriate build variants. Install the React Native Firebase messaging package and complete its native setup, including APNs credentials/capabilities and Android notification channel configuration.

Request notification permission at an intentional point in onboarding or after explaining the value. On iOS, request authorization and register for remote notifications; on Android 13+, request `POST_NOTIFICATIONS` at runtime. Register a device token or FCM registration token with the backend over an authenticated channel, handle token refresh, and remove/rotate tokens on logout as appropriate.

Handle messages in foreground, background, and terminated states according to platform rules. Configure notification channels, foreground presentation, notification tap handling, and data payload validation. Test permissions, token refresh, force-quit behavior, background delivery limits, multiple environments, and a real device. Never put secrets or sensitive data in notification payloads, and do not assume delivery is guaranteed.

