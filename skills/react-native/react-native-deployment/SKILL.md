---
name: react-native-deployment
description: OTA updates with CodePush, EAS Build, and release configurations. Use when configuring OTA updates, EAS Build, or managing release configs for React Native.
metadata:
  triggers:
    files:
    - 'app.json'
    - 'eas.json'
    - 'android/app/build.gradle'
    - 'ios/**'
    keywords:
    - deployment
    - codepush
    - eas
    - release
    - build
    - fastlane
---
# React Native Deployment

## **Priority: P2 (MAINTENANCE)**

## Workflow: Ship Production Release with EAS Build

1. Configure `eas.json` with development, preview, and production profiles
2. Set environment variables in `.env.production`
3. Run `eas build --platform all --profile production`
4. Verify build artifact on EAS dashboard
5. Submit to stores: `eas submit --platform ios` / `eas submit --platform android`
6. For JS-only hotfixes, publish OTA: `eas update --branch production`

## Over-the-Air (OTA) Updates

### CodePush (Microsoft)

- **JS-Only Updates**: Update JS bundle without app store review.
- **Staging/Production**: Use separate deployments.
- **Install**: `npm install react-native-code-push`
- **Limitations**: Cannot update native code (Obj-C, Java, Swift, Kotlin).

### Expo Updates

- **Expo Projects**: Built-in OTA updates via channels (dev, staging, prod).
- **Install**: `expo install expo-updates`

## Build Configurations

### Expo (EAS Build)

See [deployment reference](references/codepush-setup.md) for EAS build profile configuration and CLI commands.

### React Native CLI

- **Android**: Use `productFlavors` in `build.gradle` (dev, staging, prod).
- **iOS**: Use Xcode schemes.
- **Fastlane**: Automate builds and uploads (`fastlane ios release`).

## Environment Management

- **react-native-config**: `.env` files for API URLs, keys.
- **Separate Configs**: `.env.dev`, `.env.staging`, `.env.production`.

## Anti-Patterns

- **No OTA for Native Changes**: Requires store release.
- **No Secrets in Code**: Use `.env` & CI secrets.
- **No Manual Builds**: Automate with CI/CD.

## References

See [references/codepush-setup.md](references/codepush-setup.md) for CodePush config, EAS profiles, and Fastlane automation.
