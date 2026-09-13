# Mobile Driver Ladder — Appium MCP local, then cloud, then declared degradation

Take the first rung that works. Say which rung you used in the walkthrough (`driver:` line).

## Rungs

| Rung | Driver | When | Evidence dir |
| --- | --- | --- | --- |
| 0 | `sh scripts/preflight.sh` | Always. Prints `MODE: local`, `local,remote`, `remote`, or `none`. Exit 0 usable, 2 nothing usable. | — |
| 1 | Appium MCP, embedded drivers, local device | `MODE` contains `local`. `select_device` (Android) or `prepare_ios_simulator` (iOS), then `appium_session_management create`. | `.appium-mcp/<session>/` |
| 2 | Appium MCP, `remoteServerUrl` on a device cloud | `MODE` contains `remote`. URL must match `REMOTE_SERVER_URL_ALLOW_REGEX` or the server refuses it. | same dir; `video.url` from the cloud |
| 3 | Exported evidence | `MODE: none`. Ask for screenshots or a cloud recording link from a human run; label them human-provided. | wherever the user put them |
| 4 | `BLOCKED (driver: appium)` | Nothing exported. Continue other lanes; never invent a verdict. | — |

## Prerequisites by rung

| Item | Rung 1 Android | Rung 1 iOS | Rung 2 cloud |
| --- | --- | --- | --- |
| Node 22+ | required | required | required |
| JDK 8+ | required | — | — |
| `ANDROID_HOME` + `platform-tools/adb` + emulator or USB device | required | — | — |
| macOS + Xcode + Command Line Tools + `xcrun simctl` | — | required | — |
| Cloud credentials in env (`LAMBDATEST_USERNAME` …) | — | — | required |
| `REMOTE_SERVER_URL_ALLOW_REGEX` | — | — | required |

Nothing is installed by the skill. Missing items print as `INSTALL:` lines from the preflight.
`docs/ui-automation-drivers.md` carries the full install matrix and the `.mcp.json` snippet.

## Server registration

```json
{
  "mcpServers": {
    "appium": {
      "command": "npx",
      "args": ["-y", "appium-mcp@latest"],
      "env": {
        "ANDROID_HOME": "/absolute/path/to/Android/sdk",
        "NO_UI": "true",
        "AI_VISION_ENABLED": "false",
        "REMOTE_SERVER_URL_ALLOW_REGEX": "^https://[^@]+@mobile-hub\\.lambdatest\\.com/wd/hub$"
      }
    }
  }
}
```

- `NO_UI=true` — default. Skips the built-in UI; fewer tokens, faster. Screenshots then come back as data the agent must save to the evidence dir itself.
- `AI_VISION_ENABLED=true` — only when `appium_find_element` fails on a Flutter or canvas screen. Costs vision tokens per call.
- Tool names surface as `mcp__<server-key>__appium_*`; `<server-key>` is the user's choice (`appium` in this snippet, `appium-mcp` in the cheatsheet). Do not hard-code the prefix in reports.

## Canonical tools

`select_device` · `prepare_ios_simulator` · `appium_session_management` · `appium_find_element` ·
`appium_gesture` · `appium_set_value` · `appium_mobile_keyboard` · `appium_alert` ·
`appium_screenshot` · `appium_get_page_source` · `appium_get_window_size` ·
`appium_mobile_performance_data` · `appium_app_lifecycle` · `appium_mobile_device_control` ·
`generate_locators` · `appium_generate_tests`.

`generate_locators` and `appium_generate_tests` are inputs to `test-loop` step 4 (Generate);
they produce candidate code that still goes through `specialist-integration-test-generator`
and the selector ladder in `quality-engineering-selector-stability`.

## Evidence layout

`.appium-mcp/<session>/` with:

- `<AC|step>-<before|after>.png` — navigation shots at the project `maxWidth` budget, verdict shots full resolution
- `<label>.source.xml` — `appium_get_page_source` output backing an assertion
- `perf.json` — `appium_mobile_performance_data` sample for the QoS check
- `video.url` — cloud recording link pulled after `delete`

## Security boundary

Appium MCP is a local single-user server or a trusted CI job. Never expose it as a shared
service. The cloud `remoteServerUrl` carries credentials in the userinfo segment; keep it out of
logs, reports and tool arguments echoed back to chat.

## Degradation rules

- `MODE: none` with cloud creds but no `REMOTE_SERVER_URL_ALLOW_REGEX`: report the missing env line, stay on rung 3.
- Rung 3 evidence is labelled `human-provided` in the AC trace and can support PASS only for the checks it actually shows.
- Rung 4 text is exactly `BLOCKED (driver: appium)` so `verify-work` and `test-loop` can route it.
