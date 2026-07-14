In a bare app, install and configure @react-native-firebase/messaging, including the Firebase files, Android notification channel, and iOS APNs capability and provisioning. Request notification permission after a short rationale rather than unconditionally on launch.

Register handlers for all lifecycle states: onMessage for foreground, onNotificationOpenedApp for background opens, and getInitialNotification for a quit-state launch. Normalize and validate payload data before turning it into navigation or domain actions, and ensure the navigator is ready before navigating.



