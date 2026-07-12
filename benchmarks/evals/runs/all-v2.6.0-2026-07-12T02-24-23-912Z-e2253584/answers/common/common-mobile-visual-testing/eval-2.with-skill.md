# Handling an “Allow Notifications” system popup

First inspect the alert hierarchy and screenshot with `appium_alert`/the UI source; do not blindly tap. Confirm that it is the expected operating-system permission prompt and that its app context matches the test.

- If notification permission is required for the scenario, accept it and record the resulting permission state. Verify that the popup disappears, the app returns to the expected screen, and notifications can be exercised without an overlay blocking app controls.
- If permission is not part of the scenario, dismiss or deny it so the test can continue deterministically, and record that choice. Do not silently grant permissions that would change the behavior under test.
- If the alert is unexpected, obscures the UI, or lacks the expected buttons, capture a screenshot and hierarchy evidence, then stop and report it rather than tapping by coordinates.

After handling the popup, re-snapshot the screen and continue the relevant flow. Test the denied/limited state if it is a supported product path, including the app's explanation or settings recovery path. Reset permissions between runs when isolation requires it.
