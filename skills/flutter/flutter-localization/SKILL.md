---
name: flutter-localization
description: Add multi-language support using easy_localization with CSV or JSON assets. Use when implementing localization or translations in Flutter.
metadata:
  triggers:
    files:
    - '**/assets/translations/*.json'
    - '**/assets/langs/*.csv'
    - 'main.dart'
    keywords:
    - localization
    - multi-language
    - translation
    - tr()
    - easy_localization
    - sheet_loader
---
# Localization

## **Priority: P1 (STANDARD)**


## Format Selection

- **CSV** (Recommended for teams with translators): Google Sheets compatibility via `sheet_loader_localization`. Store in `assets/langs/`.
- **JSON** (Developer-friendly): Nested structure support with IDE validation. Store in `assets/translations/`.

## Structure

```text
# CSV Format (Google Sheets workflow)
assets/langs/langs.csv

# OR JSON Format (nested keys)
assets/translations/
├── en.json
└── vi.json
```

## Implementation Workflow

1. **Initialize** — Call `await EasyLocalization.ensureInitialized()` before `runApp`.
2. **Wrap root** — Wrap app with `EasyLocalization` widget specifying supported locales and path.
3. **Translate strings** — Use `.tr()` extension on keys (e.g., `'welcome'.tr()`).
4. **Switch locale** — Change via `context.setLocale(Locale('vi'))`.
5. **Handle plurals** — Use `plural()` for quantity-dependent strings.
6. **Sync translations** — Use `sheet_loader_localization` to auto-generate CSV/JSON from Google Sheets.

### Bootstrap & Usage Examples

See [implementation examples](references/implementation.md) for bootstrap setup and translation usage patterns.

## Anti-Patterns

- **No Hardcoded Strings**: Always use translation keys from assets
- **No Manual Localization Calls**: Use `easy_localization` `.tr()` extension
- **No Mismatched Keys**: Ensure keys identical across all locale-specific files

## Reference & Examples

For setup and Google Sheets automation:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

idiomatic-flutter | widgets