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

## CSV Translation Format

Preferred for Google Sheets workflows and translator collaboration.

```csv
key,en,vi
welcome,Welcome!,Chào mừng!
login.button,Login,Đăng nhập
items_count.zero,No items,Không có mục nào
items_count.one,{} item,{} mục
items_count.other,{} items,{} mục
```

## JSON Translation Format

Preferred for nested structures and IDE validation.

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
