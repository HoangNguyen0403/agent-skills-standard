Here’s a quick-start example using modern iOS localization with a String Catalog.

1. In Xcode, add a `Localizable.xcstrings` String Catalog.
2. Add a key like `welcome.title`.
3. Provide a Base value such as `Welcome`.
4. Add translations for each supported language.

SwiftUI:

```swift
import SwiftUI

struct WelcomeView: View {
    var body: some View {
        VStack(spacing: 12) {
            Text(String(localized: "welcome.title"))

            Text(
                Date.now.formatted(
                    date: .abbreviated,
                    time: .omitted
                )
            )
        }
        .padding()
    }
}
```

If you want interpolation, add a catalog entry like `greeting.message = Hello, %@` and use:

```swift
let name = "Ava"
let message = String(
    localized: "greeting.message",
    defaultValue: "Hello, %@"
)
let text = String(format: message, locale: .current, name)
```

A few good defaults:

- Use `String(localized:)` or `LocalizedStringResource` instead of `NSLocalizedString`.
- Keep Base localization complete before adding other languages.
- Put images in `.xcassets` rather than loose files.
- Use built-in locale-aware formatting for dates, numbers, and currency.
```

