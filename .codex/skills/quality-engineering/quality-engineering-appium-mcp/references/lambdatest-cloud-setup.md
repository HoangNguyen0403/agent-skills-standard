# LambdaTest Real Device Cloud — Generic Setup

Reference for the `appium-mcp` skill. Project-agnostic.

## Endpoint

```text
remoteServerUrl: https://${LAMBDATEST_USERNAME}:${LAMBDATEST_ACCESSKEY}@mobile-hub.lambdatest.com/wd/hub
```

The userinfo segment carries credentials — do not log this URL; treat it like a bearer token.

## Capabilities template (Android skeleton)

```jsonc
{
  "platformName": "Android",
  "appium:automationName": "UiAutomator2",
  "appium:deviceName": "<from project-context.md>",
  "appium:platformVersion": "<from project-context.md>",
  "appium:app": "lt://APP<your-uploaded-app-id>",
  "appium:appPackage": "<your.app.package>",
  "appium:appActivity": "<your.app.MainActivity>",
  "appium:autoGrantPermissions": true,
  "appium:noReset": false,
  "appium:newCommandTimeout": 600,
  "lt:options": {
    "build": "<grouping label, e.g. ticket id>",
    "name": "<per-session label>",
    "isRealMobile": true,
    "visual": true,
    "video": true,
    "console": true,
    "deviceLog": true,
    "network": false,
    "idleTimeout": 600,
    "queueTimeout": 600,
  },
}
```

iOS: change `platformName` to `iOS`, `automationName` to `XCUITest`, replace `appPackage`/`appActivity` with `appium:bundleId`.

## App upload (one-time per build)

```bash
curl -u "$LAMBDATEST_USERNAME:$LAMBDATEST_ACCESSKEY" \
  -X POST https://manual-api.lambdatest.com/app/upload/realDevice \
  -F "appFile=@./your-app.aab" \
  -F "name=your-app-<short-tag>" \
  -F "custom_id=your-app-<release-id>"
```

Returns JSON with `app_url: "lt://APP..."`. Pass that as `appium:app`.

## .aab → device .apk conversion (Android-only gotcha)

LambdaTest converts `.aab` to device-specific APKs and **re-signs with their internal cert**.
- **SHA-pinned services** (Firebase Auth, App Check, Maps API) may reject the LambdaTest-signed APK.
- **Mitigation**: register LambdaTest's debug SHA in your allowed-signature list.

## Session lifecycle

1. **Create**: `appium_session_management action=create`.
2. **Identify session id**: Store for video/log pull.
3. **Use**: tools per `tool-cheatsheet.md`.
4. **Delete**: `appium_session_management action=delete`. **MANDATORY**.

## Cost notes

- Meting starts when first command lands.
- typical session: 3–8 min.
- LambdaTest auto-records video — pull via REST `GET /automation/api/v1/sessions/<sessionId>`.
