Use a `ProviderContainer` or `ProviderScope` with `overrides`.

```dart
final container = ProviderContainer(
  overrides: [
    apiClientProvider.overrideWithValue(FakeApiClient()),
  ],
);
```

In widget tests:

```dart
await tester.pumpWidget(
  ProviderScope(
    overrides: [
      apiClientProvider.overrideWithValue(FakeApiClient()),
    ],
    child: MyApp(),
  ),
);
```

This replaces the real provider with a fake or mock for the test.

