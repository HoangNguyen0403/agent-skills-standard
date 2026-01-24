---
name: React Native Deployment
description: OTA updates with CodePush, EAS Build, and release configurations.
metadata:
  labels: [react-native, deployment, codepush, expo, eas]
  triggers:
    files: ['app.json', 'eas.json', 'android/app/build.gradle', 'ios/**']
    keywords: [deployment, codepush, eas, release, build, fastlane]
---

# React Native Deployment

## **Priority: P2 (MAINTENANCE)**

## Over-The-Air (OTA) Updates

### CodePush (Microsoft)

- **JS-Only Updates**: Update JS bundle without app store review.
- **Staging/Production**: Use separate deployments.
- **Install**: `npm install react-native-code-push`
- **Limitations**: Cannot update native code (Obj-C, Java, Swift, Kotlin).

### EAS Update (Expo)

- **Expo Projects**: Built-in OTA updates.
- **Install**: `expo install expo-updates`
- **Channels**: Separate channels for dev, staging, production.

## Build Configurations

### Expo (EAS Build)

```json
{
  "build": {
    "development": { "developmentClient": true },
    "preview": { "distribution": "internal" },
    "production": { "autoIncrement": true }
  }
}
```

```bash
eas build --platform ios --profile production
```

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

## Reference & Examples

See [references/codepush-setup.md](references/codepush-setup.md) for CodePush integration, EAS profiles, and Fastlane release scripts.

## Related Topics

common/git-collaboration | security
