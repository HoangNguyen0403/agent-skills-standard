Assumptions: `CheckoutScreen` receives `CheckoutBloc` through `BlocProvider`, `MockCheckoutBloc` is defined in `test/shared/`, and these `WidgetKeys` exist.

```dart
// test/checkout_button_test.dart
import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';
import 'package:mocktail/mocktail.dart';

import 'package:app/core/keys/widget_keys.dart';
import 'package:app/features/checkout/checkout_bloc.dart';
import 'package:app/features/checkout/checkout_screen.dart';
import 'package:app/test_utils/test_wrapper.dart';
import 'shared/mocks/mock_checkout_bloc.dart';
import 'robots/checkout_robot.dart';

void main() {
  late MockCheckoutBloc checkoutBloc;
  late StreamController<CheckoutState> states;

  setUpAll(() {
    TestWrapper.init();

    checkoutBloc = MockCheckoutBloc();
    GetIt.I.registerSingleton<CheckoutBloc>(checkoutBloc);
  });

  setUp(() {
    states = StreamController<CheckoutState>.broadcast();

    whenListen(
      checkoutBloc,
      states.stream,
      initialState: const CheckoutState.idle(),
    );

    when(() => checkoutBloc.state)
        .thenReturn(const CheckoutState.idle());
  });

  tearDown(() => states.close());

  group('Checkout button', () {
    testWidgets(
      'should show loading spinner then success message when checkout is submitted',
      (tester) async {
        // Arrange
        final robot = CheckoutRobot(tester);
        await robot.pumpScreen(bloc: checkoutBloc, settle: false);

        // Act
        await robot.tapCheckout();

        states.add(const CheckoutState.processing());
        await robot.pump();

        // Assert
        await robot.expectLoadingSpinnerVisible();
        await robot.expectSuccessMessageNotVisible();

        states.add(const CheckoutState.success());
        await robot.pump();

        await robot.expectLoadingSpinnerNotVisible();
        await robot.expectSuccessMessageVisible();
      },
    );
  });

  group('Edge cases', () {
    testWidgets(
      'should hide loading spinner and success message when checkout fails',
      (tester) async {
        final robot = CheckoutRobot(tester);
        await robot.pumpScreen(bloc: checkoutBloc, settle: false);

        states.add(const CheckoutState.failure());
        await robot.pump();

        await robot.expectLoadingSpinnerNotVisible();
        await robot.expectSuccessMessageNotVisible();
      },
    );
  });
}
```

```dart
// test/robots/checkout_robot.dart
import 'package:flutter_test/flutter_test.dart';

import 'package:app/core/keys/widget_keys.dart';
import 'package:app/features/checkout/checkout_bloc.dart';
import 'package:app/features/checkout/checkout_screen.dart';

class CheckoutRobot {
  CheckoutRobot(this.tester);

  final WidgetTester tester;

  Future<void> pumpScreen({
    required CheckoutBloc bloc,
    required bool settle,
  }) async {
    await tester.pumpLocalizedWidget(
      BlocProvider.value(
        value: bloc,
        child: const CheckoutScreen(),
      ),
    );

    if (settle) {
      await tester.pumpAndSettle();
    }
  }

  Future<void> tapCheckout() async {
    await tester.tap(find.byKey(WidgetKeys.checkoutButton));
    await tester.pump();
  }

  Future<void> pump() => tester.pump();

  Future<void> expectLoadingSpinnerVisible() async {
    expect(
      find.byKey(WidgetKeys.checkoutLoadingSpinner),
      findsOneWidget,
    );
  }

  Future<void> expectLoadingSpinnerNotVisible() async {
    expect(
      find.byKey(WidgetKeys.checkoutLoadingSpinner),
      findsNothing,
    );
  }

  Future<void> expectSuccessMessageVisible() async {
    expect(
      find.byKey(WidgetKeys.checkoutSuccessMessage),
      findsOneWidget,
    );
  }

  Future<void> expectSuccessMessageNotVisible() async {
    expect(
      find.byKey(WidgetKeys.checkoutSuccessMessage),
      findsNothing,
    );
  }
}
```
