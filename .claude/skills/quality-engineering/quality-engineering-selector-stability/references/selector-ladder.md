# Selector Ladder — Per-Tool Code

## Web (Playwright)

```ts
// 1st choice
page.getByRole('button', { name: 'Submit' });
page.getByLabel('Email address');
// 2nd choice (no accessible role/label available)
page.getByTestId('checkout-submit-button');
// Never
page.locator('//div[3]/button'); // XPath
page.locator('.btn-primary-xk21'); // generated class
```

## Mobile (Appium)

```
// 1st choice (Accessibility ID / Identifier — literal automation id, NOT the screen-reader label)
~checkout-submit-button
// 2nd choice — traditional Android XML resource ID (package-prefixed, underscores)
android=new UiSelector().resourceId("com.app:id/checkout_submit_button")
// 2nd choice — Jetpack Compose testTag, only after testTagsAsResourceId is enabled (see below);
// the exported value is the LITERAL tag, with no package prefix
android=new UiSelector().resourceId("checkout-submit-button")
// Never
//android.widget.Button[3]     // XPath
```

Mobile locator verification: dump the page source and read the element's actual `resource-id` / `name` attribute before choosing a strategy. Drivers differ in whether they require a package-qualified resource ID or accept the literal exported tag; if a literal tag fails to match, use the value observed in the source rather than guessing. Driver auto-completion of resource IDs is version-dependent — verify against the installed driver version.

## Mobile Stack Implementations (Test ID vs A11y Separation)

> [!IMPORTANT]
> Setting `accessibilityLabel`, `contentDescription`, or `Semantics` populates the accessibility tree. Component tests asserting these attributes check tree metadata only; they do NOT prove actual TalkBack/VoiceOver audio announcements or device gesture focus order.
### 1. iOS (SwiftUI & UIKit)
```swift
// SwiftUI: .accessibilityIdentifier is for automation; .accessibilityLabel is for VoiceOver
Button("Submit Order") {
    viewModel.submit()
}
.accessibilityIdentifier("checkout-submit-button") // Appium: ~checkout-submit-button
.accessibilityLabel("Submit order for 3 items")    // VoiceOver reads this
```

### 2. Android (Jetpack Compose)
```kotlin
// Compose tags are NOT visible to UiAutomator/Appium by default.
// Enable export once on a node that covers the subtree, then the literal tag
// is exposed as the native resource-id.
ComposeView(context).apply {
    setContent {
        Box(Modifier.semantics { testTagsAsResourceId = true }) {   // export switch
            Button(
                onClick = { viewModel.submit() },
                modifier = Modifier
                    .testTag("checkout-submit-button")              // automation id
                    .semantics { contentDescription = "Submit order" } // TalkBack label, distinct
            ) {
                Text("Submit Order")
            }
        }
    }
}
// Native driver locator for the exported tag (literal, no package prefix):
//   android=new UiSelector().resourceId("checkout-submit-button")
//   Appium: By.res("checkout-submit-button")
// If the installed driver requires a package-qualified id, read the value from
// the page source instead of guessing; do not reuse contentDescription as the locator.
```

### 3. Flutter
```dart
// Use Key with WidgetKeys constants for widget tests, integration_test, and Patrol
ElevatedButton(
    key: WidgetKeys.checkoutSubmitButton,
    onPressed: () => viewModel.submit(),
    child: const Text('Submit Order'),
)
```

### 4. React Native
```tsx
// testID is for Detox/Appium; accessibilityLabel is for screen readers
<TouchableOpacity
  testID="checkout-submit-button"
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Submit order"
  onPress={handleSubmit}
>
  <Text>Submit Order</Text>
</TouchableOpacity>
```

## Maestro (YAML)

```yaml
- tapOn:
    id: "checkout-submit-button"
# Never: point-based taps, text: on translated strings
```
