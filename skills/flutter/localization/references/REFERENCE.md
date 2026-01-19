# Localization Reference

## Easy Localization Setup

Basic implementation in `main.dart`.

```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();

  runApp(
    EasyLocalization(
      supportedLocales: const [Locale('en'), Locale('vi')],
      path: 'assets/translations', // <-- Path to translations
      fallbackLocale: const Locale('en'),
      child: const MyApp(),
    ),
  );
}
```

## JSON Translation Format

Default format for project assets.

```json
// en.json
{
  "app_title": "My App",
  "welcome": "Welcome, {}!",
  "items_count": {
    "zero": "No items",
    "one": "{} item",
    "other": "{} items"
  }
}
```

## Google Sheets Integration

Use `sheet_loader_localization` to fetch and generate localizations from Google Sheets.

1. Add to `pubspec.yaml` under `dev_dependencies`.
2. Configure sheets URL/ID in `pubspec.yaml` or separate config.
3. Run `flutter pub run sheet_loader_localization:main`.

See [Sheet Loader Example](sheet-loader.md).
