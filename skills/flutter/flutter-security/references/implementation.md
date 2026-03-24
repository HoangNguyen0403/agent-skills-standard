# Mobile Security Implementation Examples

## Secure Storage

```dart
final secureStorage = const FlutterSecureStorage();

// Store token securely
await secureStorage.write(key: 'auth_token', value: token);

// Read token
final token = await secureStorage.read(key: 'auth_token');
```

## Release Build Command

```bash
flutter build appbundle \
  --obfuscate \
  --split-debug-info=build/debug-info \
  --dart-define=API_URL=$API_URL
```
