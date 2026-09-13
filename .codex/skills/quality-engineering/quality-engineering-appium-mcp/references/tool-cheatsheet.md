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

### Create remote session (LambdaTest)

The URL must match the server's `REMOTE_SERVER_URL_ALLOW_REGEX` env or the create call is refused.

```jsonc
// mcp__appium-mcp__appium_session_management
{
  "action": "create",
  "remoteServerUrl": "https://${LAMBDATEST_USERNAME}:${LAMBDATEST_ACCESSKEY}@mobile-hub.lambdatest.com/wd/hub",
  "platform": "android",
  "capabilities": {
    /* see lambdatest-cloud-setup.md */
  },
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
