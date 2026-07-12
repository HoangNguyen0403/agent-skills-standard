Common anti-patterns to avoid in iOS localization:

- Using `NSLocalizedString` in new code instead of modern APIs like `String(localized:)` or `LocalizedStringResource`
- Manually handling pluralization in app logic instead of using String Catalog plural support
- Manually formatting currency, dates, or numbers instead of locale-aware formatting APIs
- Storing loose image/string assets outside `.xcassets`
- Leaving placeholder or partially translated strings in the app
- Adding secondary languages before the `Base` localization is complete

Good practice is to use String Catalogs, locale-aware formatting, and asset catalogs so localization stays safer and easier to maintain.

