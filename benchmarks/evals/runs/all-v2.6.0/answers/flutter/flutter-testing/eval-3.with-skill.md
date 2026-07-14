Add `integration_test/orders_integration_test.dart`:

```dart
import 'package:patrol/patrol.dart';

import 'robots/orders_robot.dart';
import 'helpers/integration_auth_helper.dart';

patrolTest(
  'should show first order card when logged in and opening orders tab',
  ($) async {
    final robot = OrdersRobot($.tester);

    // Uses configured test credentials.
    await IntegrationAuthHelper.loginOrSkip($);

    await robot.tapOrdersTab();
    await robot.expectFirstOrderVisible();
  },
);
```

Assumptions:

- `IntegrationAuthHelper.loginOrSkip($)` performs login with configured test credentials.
- `OrdersRobot` provides `tapOrdersTab()` and `expectFirstOrderVisible()`.
- The robot uses `WidgetKeys` and contains all `find.*`/`expect()` calls; none remain in the test body.
- Native interactions, if login requires them, stay inside the helper via `$.native.*`.
