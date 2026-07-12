```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'shows a loading spinner while processing, then displays success message',
    (WidgetTester tester) async {
      await tester.pumpWidget(const MaterialApp(home: CheckoutButtonDemo()));

      expect(find.byType(CircularProgressIndicator), findsNothing);
      expect(find.text('Success!'), findsNothing);

      await tester.tap(find.text('Checkout'));
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Success!'), findsNothing);

      await tester.pump(const Duration(seconds: 2));

      expect(find.byType(CircularProgressIndicator), findsNothing);
      expect(find.text('Success!'), findsOneWidget);
    },
  );
}

class CheckoutButtonDemo extends StatefulWidget {
  const CheckoutButtonDemo({super.key});

  @override
  State<CheckoutButtonDemo> createState() => _CheckoutButtonDemoState();
}

class _CheckoutButtonDemoState extends State<CheckoutButtonDemo> {
  bool _isLoading = false;
  bool _isSuccess = false;

  Future<void> _processCheckout() async {
    setState(() {
      _isLoading = true;
      _isSuccess = false;
    });

    await Future<void>.delayed(const Duration(seconds: 2));

    setState(() {
      _isLoading = false;
      _isSuccess = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: _isLoading
            ? const CircularProgressIndicator()
            : _isSuccess
                ? const Text('Success!')
                : ElevatedButton(
                    onPressed: _processCheckout,
                    child: const Text('Checkout'),
                  ),
      ),
    );
  }
}
```

