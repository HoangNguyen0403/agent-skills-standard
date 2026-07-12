Here’s an integration test that logs in with test credentials, opens the orders tab, and checks that the first order card is visible:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:my_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('logs in and shows first order card on orders tab', (tester) async {
    app.main();
    await tester.pumpAndSettle();

    final emailField = find.byKey(const Key('login_email'));
    final passwordField = find.byKey(const Key('login_password'));
    final loginButton = find.byKey(const Key('login_button'));

    await tester.enterText(emailField, 'testuser@example.com');
    await tester.enterText(passwordField, 'password123');
    await tester.tap(loginButton);
    await tester.pumpAndSettle();

    final ordersTab = find.byKey(const Key('orders_tab'));
    await tester.tap(ordersTab);
    await tester.pumpAndSettle();

    final firstOrderCard = find.byKey(const Key('order_card_0'));
    expect(firstOrderCard, findsOneWidget);
  });
}
```

