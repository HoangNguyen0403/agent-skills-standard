A quick start for iOS localization:

1. Enable localization in Xcode:
   - Select your project
   - Open the Info tab
   - Add languages under Localizations

2. Put user-facing strings in `Localizable.strings`.

Example:

`en.lproj/Localizable.strings`
```strings
"welcome_title" = "Welcome";
```

`es.lproj/Localizable.strings`
```strings
"welcome_title" = "Bienvenido";
```

3. Read strings in code with `NSLocalizedString`:

```swift
titleLabel.text = NSLocalizedString("welcome_title", comment: "Welcome screen title")
```

4. For SwiftUI:

```swift
Text("welcome_title")
```

5. Test by changing the app language in the simulator or device settings.

