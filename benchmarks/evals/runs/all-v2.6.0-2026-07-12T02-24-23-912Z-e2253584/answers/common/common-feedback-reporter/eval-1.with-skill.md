🚨 SKILL VIOLATION DETECTED
Skill:        common-feedback-reporter (with applicable Flutter skill)
File:         lib/user_name.dart:1-7
Rule:         No hardcoded colors; use the app theme for presentation colors.
Violation:    The planned widget uses `Colors.blue` directly for the text color.
Fix:          Use a theme-derived color, for example:
              `final color = Theme.of(context).colorScheme.primary;`
              `return Text(userName, style: TextStyle(color: color));`
Auto-fixed:   YES
Root Cause:   MISSING_COVERAGE
User Intent:  Display the user's name with a blue appearance.
Skill Gap:   The Flutter skill should explicitly show how to express a semantic blue role through `ColorScheme` and how to handle a custom blue when the theme has no matching role. This would preserve the requested appearance without encouraging hardcoded colors.
Co-skills:    none

Corrected widget:

```dart
import 'package:flutter/material.dart';

class UserName extends StatelessWidget {
  const UserName({super.key, required this.userName});

  final String userName;

  @override
  Widget build(BuildContext context) {
    return Text(
      userName,
      style: TextStyle(color: Theme.of(context).colorScheme.primary),
    );
  }
}
```
