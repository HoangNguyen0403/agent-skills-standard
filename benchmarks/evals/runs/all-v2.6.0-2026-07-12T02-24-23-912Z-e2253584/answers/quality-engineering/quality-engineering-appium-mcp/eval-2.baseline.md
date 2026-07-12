Inspect the app hierarchy first and prefer a stable accessibility identifier or semantic label for the Flutter button. For example, expose `Submit` as a Flutter `Semantics` label or key, then locate it with Appium using accessibility-id (or the platform text selector) and call the element click action.

Do not rely on screen coordinates. If the button is not found, verify that Flutter semantics are enabled, the element is visible and enabled, and that the test is on the expected screen. A successful click should be followed by an assertion on the resulting screen or state.
