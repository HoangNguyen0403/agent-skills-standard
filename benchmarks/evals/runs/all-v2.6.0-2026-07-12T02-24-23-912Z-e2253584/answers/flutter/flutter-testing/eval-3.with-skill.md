```dart
import 'package:patrol/patrol.dart';

import '../helpers/integration_auth_helper.dart';
import '../robots/orders_robot.dart';

void main() {
  patrolTest(
    'should show first order card when logged in user opens orders tab',
    ($) async {
      final robot = OrdersRobot($.tester);

      await IntegrationAuthHelper.loginOrSkip($);

      await robot.openOrdersTab();

      await robot.expectFirstOrderVisible();
    },
  );
}
```

