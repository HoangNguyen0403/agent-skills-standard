# Deployment Reference

Release automation and versioning strategies.

## CodePush Integration

### Standard Setup

```tsx
import codePush from 'react-native-code-push';

const codePushOptions = {
  checkFrequency: codePush.CheckFrequency.ON_APP_RESUME,
  installMode: codePush.InstallMode.ON_NEXT_RESUME,
};

function App() {
  return <Root />;
}

export default codePush(codePushOptions)(App);
```

### Manual Update Check

```tsx
const checkUpdate = async () => {
  const update = await codePush.checkForUpdate();
  if (update) {
    setUpdateAvailable(true);
    await codePush.sync({
      updateDialog: true,
      installMode: codePush.InstallMode.IMMEDIATE,
    });
  }
};
```

## EAS Build Profiles

```json
// eas.json
{
  "build": {
    "staging": {
      "releaseChannel": "staging",
      "env": {
        "API_URL": "https://staging-api.example.com"
      }
    },
    "production": {
      "releaseChannel": "production",
      "autoIncrement": true,
      "env": {
        "API_URL": "https://api.example.com"
      }
    }
  }
}
```

## Fastlane Automation

### iOS Release Lane

```ruby
# fastlane/Fastfile
desc "Deploy a new version to the App Store"
lane :release do
  increment_build_number(xcodeproj: "MyApp.xcodeproj")
  build_app(scheme: "MyApp")
  upload_to_testflight
  upload_to_app_store
end
```

## Versioning Strategy

| Type                  | Bump  | Trigger   |
| --------------------- | ----- | --------- |
| **TS/JS Change**      | Patch | CodePush  |
| **Native Dependency** | Minor | App Store |
| **New Native API**    | Major | App Store |

**Bumping Script**:

```bash
# Bump version and set git tag
npm version patch
# Push to CodePush
appcenter codepush release-react -a User/MyApp -d Production
```
