Use a localization key with a named placeholder, then pass the name dynamically.

```json
{
  "welcome_user": "Hello, {name}!"
}
```

```dart
final name = 'John';

Text(
  'welcome_user'.tr(namedArgs: {'name': name}),
);
```

