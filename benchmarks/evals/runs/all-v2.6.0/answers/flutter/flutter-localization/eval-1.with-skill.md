Use `easy_localization` with CSV assets, since your translators work in Google Sheets.

Recommended setup:

- Store translations in `assets/langs/langs.csv`
- Support `en` and `vi`
- Initialize with `await EasyLocalization.ensureInitialized()` before `runApp`
- Wrap the app with `EasyLocalization`
- Use translation keys in UI with `.tr()`
- Switch language with `context.setLocale(const Locale('vi'))`
- If you sync from Google Sheets, use `sheet_loader_localization`

Example shape:

```dart
await EasyLocalization.ensureInitialized();

runApp(
  EasyLocalization(
    supportedLocales: const [Locale('en'), Locale('vi')],
    path: 'assets/langs',
    fallbackLocale: const Locale('en'),
    child: const MyApp(),
  ),
);
```

In widgets:

```dart
Text('welcome'.tr())
```

This keeps English and Vietnamese translations manageable for both developers and translators.

