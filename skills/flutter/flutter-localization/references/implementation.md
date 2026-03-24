# Localization Implementation Examples

## Bootstrap Example

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();
  runApp(
    EasyLocalization(
      supportedLocales: const [Locale('en'), Locale('vi')],
      path: 'assets/translations',
      child: const MyApp(),
    ),
  );
}
```

## Usage Example

```dart
Text('welcome'.tr()); // Simple lookup
Text('greeting'.tr(args: [userName])); // With parameters
Text(plural('items_count', itemCount)); // Pluralization
```
