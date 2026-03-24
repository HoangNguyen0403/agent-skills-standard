---
name: ios-localization
description: "Implement String Catalogs, L10n workflows, and asset management for iOS. Use when adding multi-language support using iOS String Catalogs or L10n workflows. (triggers: **/*.stringcatalog, **/*.xcassets, **/*.strings, LocalizedStringResource, NSLocalizedString, String(localized:))"
---

# iOS Localization & Assets

## **Priority: P1**

## Implementation Workflow

1. **Use String Catalogs** — Adopt `.stringcatalog` files in Xcode 15+ for visual editing and compile-time missing translation checks.
2. **Prefer modern APIs** — Use `String(localized: "key")` or `LocalizedStringResource` instead of `NSLocalizedString`.
3. **Handle pluralization** — Use String Catalogs' built-in pluralization instead of custom code logic.
4. **Format with locale** — Use `Formatted` API for dates, numbers, and currencies to respect user locale.
5. **Organize assets** — Use `.xcassets` with "Provides Namespace" enabled. Prefer SF Symbols for standard icons.
6. **Complete Base localization** — Ensure `Base` is complete before adding other languages.

### Localization Usage Example

```swift
// Modern String Catalog approach (Xcode 15+)
Text(String(localized: "welcome_message"))

// With interpolation
Text(String(localized: "greeting \(userName)"))

// Locale-aware formatting
Text(price.formatted(.currency(code: "USD")))
Text(date.formatted(.dateTime.month().day().year()))
```

### Asset Catalog Best Practices

```swift
// Use SF Symbols for standard icons
Image(systemName: "heart.fill")

// Use Asset Catalog with namespaces
Image("Icons/profileAvatar")
```

## Anti-Patterns

- ❌ Manual currency symbol concatenation — use `NumberFormatter` or `.formatted(.currency)`
- ❌ Loose png/jpg files in repo — always use Asset Catalogs
- ❌ Placeholder strings left in String Catalogs — ensure 100% translation coverage

## References

- [L10n & Asset Organization](references/implementation.md)
