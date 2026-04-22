---
name: ios-localization
description: Implement String Catalogs, L10n workflows, and asset management for iOS. Use when adding multi-language support using iOS String Catalogs or L10n workflows.
metadata:
  triggers:
    files:
    - '**/*.stringcatalog'
    - '**/*.xcassets'
    - '**/*.strings'
    keywords:
    - LocalizedStringResource
    - NSLocalizedString
    - String(localized:)
---
# iOS Localization & Assets

## **Priority: P1**

## Implementation Workflow

1. **Use String Catalogs** — Adopt `.stringcatalog` files in Xcode 15+ for visual editing and compile-time missing translation checks.
2. **Prefer modern APIs** — Use `String(localized: "key")` or `LocalizedStringResource` instead of `NSLocalizedString`.
3. **Handle pluralization** — Use String Catalogs' built-in pluralization instead of custom code logic.
4. **Format with locale** — Use `Formatted` API for dates, numbers, and currencies to respect user locale.
5. **Organize assets** — Use `.xcassets` with "Provides Namespace" enabled. Prefer SF Symbols for standard icons.
6. **Complete Base localization** — Ensure `Base` complete before adding other languages.

See [localization and asset catalog examples](references/implementation.md)

## Anti-Patterns

- **No Manual Currency Formatting**: Use `NumberFormatter` or `.formatted(.currency)`
- **No Loose Asset Files**: Always use Asset Catalogs (`.xcassets`)
- **No Placeholder Strings**: Ensure 100% translation coverage before commit

## References

- [L10n & Asset Organization](references/implementation.md)