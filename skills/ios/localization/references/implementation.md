# iOS Localization & Asset Implementation

## Modern Localization (iOS 15+)

```swift
// 1. Basic Localization
let welcome = String(localized: "welcome_message", defaultValue: "Welcome to our app!")

// 2. Localized with arguments
let itemsCount = 5
let status = String(localized: "items_count_\(itemsCount)", defaultValue: "\(itemsCount) items found")

// 3. Date & Currency Formatting
let dateString = Date().formatted(date: .long, time: .omitted)
let price = 49.99
let priceString = price.formatted(.currency(code: "USD"))
```

## Programmatic Image Access

```swift
// POSITIVE: Type-safe access using SF Symbols and Asset Catalog
let icon = UIImage(systemName: "house.fill")
let logo = UIImage(named: "AppLogo") // Ensure this matches an image in xcassets
```

## Folder Namespacing (Best Practice)

In `Assets.xcassets`:

- Create folder `Icons`
- Right-click > _Provides Namespace_
- Access via: `UIImage(named: "Icons/Search")`
