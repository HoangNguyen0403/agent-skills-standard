```dart
testWidgets('shows loading spinner, then success message', (tester) async {
  final checkout = Completer<void>();

  await tester.pumpWidget(
    MaterialApp(
      home: CheckoutButton(
        onCheckout: () => checkout.future,
      ),
    ),
  );

  await tester.tap(find.byType(ElevatedButton));
  await tester.pump();

  expect(find.byType(CircularProgressIndicator), findsOneWidget);

  checkout.complete();
  await tester.pumpAndSettle();

  expect(find.text('Checkout successful'), findsOneWidget);
});
```

Assumes `CheckoutButton` accepts an `onCheckout` callback and displays `Checkout successful` after completion.
