# Insertion Policy — Per-Framework Snippet

## React / Next.js

```tsx
<button data-testid="checkout-submit-button" onClick={onSubmit}>Submit</button>
```

## React Native

```tsx
<TouchableOpacity testID="checkout-submit-button" accessibilityLabel="Submit order">
```

## Flutter

```dart
Semantics(identifier: 'checkout-submit-button', child: ElevatedButton(...));
```

## SwiftUI

```swift
Button("Submit") { submit() }.accessibilityIdentifier("checkout-submit-button")
```

## Jetpack Compose

```kotlin
Button(onClick = onSubmit, modifier = Modifier.testTag("checkout-submit-button")) { Text("Submit") }
// Requires: semantics { testTagsAsResourceId = true } once per app root
```

## A11y side effects

`accessibilityIdentifier`/`testID` are invisible to screen readers by default —
adding them never changes what a screen reader announces. Do not repurpose
`accessibilityLabel`/`contentDescription` as a test id; those ARE read aloud.
