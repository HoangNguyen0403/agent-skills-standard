Use an OTA system only for JavaScript and asset changes. Expo projects can use expo-updates with separate development, staging, and production channels; bare React Native projects can use CodePush with separate deployments. Neither can safely deliver native Objective-C, Swift, Java, Kotlin, or other native changes, which require a store release.

Gate updates by release channel, publish from CI, and verify the artifact and rollback strategy before production. For EAS, a production update is published with the production branch/channel; for CodePush, publish to staging first and promote after validation. Never put update credentials or other secrets in the app bundle.



