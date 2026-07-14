First inspect the state with `appium_screenshot` and `appium_get_source`/hierarchy. Then use `appium_alert`:

- Tap `accept` if notifications are required for the test flow and the permission reason is expected.
- Tap `dismiss` if notifications are out of scope or the popup is unexpected.

Do not blindly tap before checking the alert state.
