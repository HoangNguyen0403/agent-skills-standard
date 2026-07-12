```dart
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get_it/get_it.dart';
import 'package:mocktail/mocktail.dart';

import 'package:my_app/core/keys/widget_keys.dart';
import 'package:my_app/features/checkout/presentation/bloc/checkout_bloc.dart';
import 'package:my_app/features/checkout/presentation/bloc/checkout_event.dart';
import 'package:my_app/features/checkout/presentation/bloc/checkout_state.dart';
import 'package:my_app/features/checkout/presentation/checkout_screen.dart';

import '../shared/test_wrapper.dart';

class MockCheckoutBloc extends MockBloc<CheckoutEvent, CheckoutState>
    implements CheckoutBloc {}

class CheckoutRobot {
  CheckoutRobot(this.tester);

  final WidgetTester tester;

  Finder get _checkoutButton =>
      find.byKey(WidgetKeys.checkoutButton);
  Finder get _loadingSpinner =>
      find.byKey(WidgetKeys.checkoutLoadingSpinner);
  Finder get _successMessage =>
      find.byKey(WidgetKeys.checkoutSuccessMessage);

  Future<void> pumpScreen({
    required CheckoutBloc bloc,
    bool settle = true,
  }) async {
    await tester.pumpLocalizedWidget(
      BlocProvider<CheckoutBloc>.value(
        value: bloc,
        child: const CheckoutScreen(),
      ),
    );

    if (settle) {
      await tester.pumpAndSettle();
    }
  }

  Future<void> tapCheckoutButton() async {
    await tester.tap(_checkoutButton);
    await tester.pump();
  }

  void expectLoadingSpinnerVisible() {
    expect(_loadingSpinner, findsOneWidget);
  }

  void expectLoadingSpinnerNotVisible() {
    expect(_loadingSpinner, findsNothing);
  }

  void expectSuccessMessageVisible() {
    expect(_successMessage, findsOneWidget);
  }

  void expectSuccessMessageNotVisible() {
    expect(_successMessage, findsNothing);
  }
}

void main() {
  late MockCheckoutBloc checkoutBloc;
  late CheckoutRobot robot;

  setUpAll(() async {
    TestWrapper.init();
    registerFallbackValue(const CheckoutPressed());
    checkoutBloc = MockCheckoutBloc();
    GetIt.I.registerSingleton<CheckoutBloc>(checkoutBloc);
  });

  setUp(() {
    when(() => checkoutBloc.state).thenReturn(const CheckoutInitial());
    whenListen(
      checkoutBloc,
      Stream<CheckoutState>.fromIterable(const [
        CheckoutLoading(),
        CheckoutSuccess(),
      ]),
      initialState: const CheckoutInitial(),
    );
  });

  tearDownAll(() async {
    await GetIt.I.reset();
  });

  testWidgets(
    'should show loading spinner then success message when checkout is processing',
    (tester) async {
      // Arrange
      robot = CheckoutRobot(tester);
      await robot.pumpScreen(bloc: checkoutBloc, settle: false);
      robot.expectLoadingSpinnerNotVisible();
      robot.expectSuccessMessageNotVisible();

      // Act
      await robot.tapCheckoutButton();
      await tester.pump();

      // Assert
      robot.expectLoadingSpinnerVisible();
      robot.expectSuccessMessageNotVisible();

      await tester.pump();
      robot.expectLoadingSpinnerNotVisible();
      robot.expectSuccessMessageVisible();
    },
  );
}
```

