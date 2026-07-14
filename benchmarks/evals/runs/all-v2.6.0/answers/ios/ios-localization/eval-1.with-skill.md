For modern iOS apps, the best-practice path is:

- Use String Catalogs (`.stringcatalog`) in Xcode 15+ as the source of truth for UI text. They give you visual editing, pluralization support, and better missing-translation checks.
- Prefer modern localization APIs like `String(localized:)` or `LocalizedStringResource` instead of older `NSLocalizedString` for new code.
- Keep `Base` localization complete first, then add additional languages on top of that.
- Use built-in pluralization in String Catalogs rather than custom singular/plural branching in code.
- Format user-facing values with locale-aware APIs:
  - dates with `Date.FormatStyle`
  - numbers/currency with `.formatted(...)` or `NumberFormatter`
- Store images and icons in `.xcassets`, not as loose files. Enable namespacing when helpful, and prefer SF Symbols for common system icons.
- Avoid placeholder or partial translations before shipping; aim for full coverage.

Example:

```swift
struct CheckoutView: View {
    let total: Decimal

    var body: some View {
        VStack(alignment: .leading) {
            Text(String(localized: "checkout.title"))
            Text(total.formatted(.currency(code: Locale.current.currency?.identifier ?? "USD")))
        }
    }
}
```

If you need broader compatibility with older iOS versions, you can still use `.strings` files, but for current projects String Catalogs are the preferred approach.

