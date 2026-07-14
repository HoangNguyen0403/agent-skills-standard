Override it at the root `ProviderScope` in your test using the provider’s override API.

```dart
testWidgets('uses mocked repository', (tester) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        userRepositoryProvider.overrideWithValue(FakeUserRepository()),
      ],
      child: const MyApp(),
    ),
  );

  // assertions...
});
```

For notifier-based providers, use the matching override method (`overrideWith`, `overrideWithValue`, etc.) depending on the provider type. This keeps providers global and swaps dependencies cleanly for the test.

