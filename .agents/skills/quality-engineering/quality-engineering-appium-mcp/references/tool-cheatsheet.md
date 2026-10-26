# appium-mcp Tool Cheatsheet

Copy-paste argument shapes for the most-used `mcp__appium-mcp__*` tools.

Prefix `mcp__appium-mcp__` assumes the server key `appium-mcp`; if the user registered it as `appium`, the prefix is `mcp__appium__`.

## Device selection (local rung)

```jsonc
// mcp__appium-mcp__select_device
{ "platform": "android" }                          // lists adb devices/emulators, picks one
{ "platform": "android", "udid": "emulator-5554" }

// mcp__appium-mcp__prepare_ios_simulator
{ "deviceName": "iPhone 15" }                      // boots simulator if needed (macOS only)
```

## Session lifecycle

### Create session (Explicit Reset Semantics)

```jsonc
// mcp__appium-mcp__appium_session_management
// 1. Clean Install Scenario (AC-26) — fullReset=true, ungranted permissions:
{
  "action": "create",
  "platform": "android",
  "capabilities": {
    "appium:app": "/path/to/app-release.apk",
    "appium:fullReset": true,
    "appium:noReset": false,
    "appium:autoGrantPermissions": false // NEVER auto-grant when testing permission flows (AC-24)
  }
}

// 2. Upgrade / Migration Scenario (AC-26) — the session does NOT install the candidate.
// With noReset:true and the package already installed, the driver skips the `app` capability,
// so a different app path here proves nothing. Install and VERIFY the candidate first:
//
//   a) adb install -r /path/to/app-v1-release.apk        # supported prior build
//   b) launch v1, seed synthetic session + DB + secure storage
//   c) adb install -r /path/to/app-v2-release.apk        # in-place upgrade, same signing key
//   d) adb shell dumpsys package <pkg> | grep -E 'versionName|versionCode|lastUpdateTime'
//      -> must show v2 before you attach the session; otherwise BLOCKED
//
// iOS: install the candidate .app/.ipa over the prior build (same signing identity),
// then confirm the installed bundle version before attaching the session.
{
  "action": "create",
  "platform": "android",
  "capabilities": {
    "appium:noReset": true,                          // preserves the seeded prior-state data; install happened in (c)
    "appium:udid": "<device-serial-from-step-(d)>",  // the device you verified the candidate on
    "appium:appPackage": "com.example.app",          // AUT selection: supplied explicitly, since noReset installs nothing
    "appium:appActivity": ".MainActivity"            // launch entry for the installed candidate
  }
}
// iOS equivalent: keep noReset-style state preservation and pass the installed
// bundleId (XCUITest driver) instead of relying on a stale `app` path.
// Signing/entitlement mismatch blocks the in-place upgrade — report BLOCKED (artifact: signing),
// never flip reset flags to obtain a passing run.

// 3. Remote Cloud Session (LambdaTest) — URL must match REMOTE_SERVER_URL_ALLOW_REGEX:
{
  "action": "create",
  "remoteServerUrl": "https://${LAMBDATEST_USERNAME}:${LAMBDATEST_ACCESSKEY}@mobile-hub.lambdatest.com/wd/hub",
  "platform": "android",
  "capabilities": {
    /* see lambdatest-cloud-setup.md */
  }
}
```
### List / select / delete

```jsonc
{ "action": "list" }                              // all sessions + ownership
{ "action": "select", "sessionId": "<id>" }       // switch active
{ "action": "delete", "sessionId": "<id>" }       // teardown — always call
```

## Element interaction

### Find native dialog element

```jsonc
// mcp__appium-mcp__appium_find_element
{
  "strategy": "accessibility id",   // > "id" > "-android uiautomator" > "xpath"
  "selector": "Allow"
}
```

### Tap / swipe / scroll

```jsonc
// mcp__appium-mcp__appium_gesture
{ "action": "tap", "x": 740, "y": 1810 }
{ "action": "tap", "elementUUID": "<uuid>" }
{ "action": "long_press", "x": 540, "y": 1200, "duration": 800 }
{ "action": "swipe", "from": {"x": 900, "y": 1300}, "to": {"x": 180, "y": 1300} }
```

### Text input

```jsonc
// mcp__appium-mcp__appium_set_value
{ "elementUUID": "<uuid>", "text": "hello@example.com" }

// mcp__appium-mcp__appium_mobile_keyboard
{ "action": "hide" }                              // dismiss soft keyboard
```

### Read / alert

```jsonc
// mcp__appium-mcp__appium_alert
{ "action": "accept" }      // OK / Allow on system alerts
{ "action": "dismiss" }
```

## Page source (assertion backing)

```jsonc
// mcp__appium-mcp__appium_get_page_source
{}                                                // XML hierarchy; save as <label>.source.xml
```

## Screen capture

```jsonc
// mcp__appium-mcp__appium_screenshot
{}                                                // full screen
{ "elementUUID": "<uuid>" }                       // crop to one element
```

## App lifecycle

```jsonc
// mcp__appium-mcp__appium_app_lifecycle
{ "action": "activate",     "bundleId": "com.example.app" }
{ "action": "terminate",    "bundleId": "com.example.app" }
{ "action": "deep_link",    "url": "yourscheme://path/to/screen" }
{ "action": "background",   "duration": 5 }
```

## Device control

```jsonc
// mcp__appium-mcp__appium_mobile_device_control
{ "action": "open_notifications" }                // Android only

// mcp__appium-mcp__appium_geolocation
{ "action": "set", "latitude": 10.762, "longitude": 106.660 }   // Ho Chi Minh
```

## Test generation (feeds test-loop step 4)

```jsonc
// mcp__appium-mcp__generate_locators
{ "elementUUID": "<uuid>" }                       // ranked: accessibility id > id > uiautomator > xpath

// mcp__appium-mcp__appium_generate_tests
{ "description": "login with valid credentials then open profile", "framework": "webdriverio" }
```

Output is candidate code only; it still goes through `specialist-integration-test-generator` and the selector ladder.
