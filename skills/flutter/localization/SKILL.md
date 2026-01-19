---
name: Flutter Localization
description: Standards for multi-language support using easy_localization and JSON/CSV assets.
metadata:
  labels: [localization, l10n, i18n, easy_localization]
  triggers:
    files: ['**/assets/translations/*.json', 'main.dart']
    keywords:
      [localization, multi-language, translation, tr(), easy_localization]
---

# Localization

## **Priority: P1 (STANDARD)**

Consistent multi-language support using `easy_localization`.

## Structure

```text
assets/
└── translations/
    ├── en.json
    └── vi.json
```

## Implementation Guidelines

- **Bootstrap**: Wrap root with `EasyLocalization`. Always use `await EasyLocalization.ensureInitialized()`.
- **Format**: Default to JSON. Store in `assets/translations/`.
- **Lookup**: Use `.tr()` extension on strings.
- **Locale**: Change via `context.setLocale(Locale('code'))`.
- **Params**: Use `{}` in JSON; pass via `tr(args: [...])`.
- **Counting**: Use `plural()` for quantities.
- **Sheets**: Sync via `sheet_loader_localization` from Google Sheets for Online file storage to JSON/CSV.

## Anti-Patterns

- **Hardcoding**: No raw strings in UI; use keys.
- **Manual L10n**: Avoid standard `Localizations.of`; use GetX or `easy_localization` context methods.
- **Desync**: Keep keys identical across all locale files.

## Reference & Examples

For setup and Google Sheets automation:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

idiomatic-flutter | widgets
