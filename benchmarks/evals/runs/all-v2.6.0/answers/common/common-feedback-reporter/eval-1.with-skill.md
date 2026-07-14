🚨 SKILL VIATION DETECTED  
Skill:        common-feedback-reporter  
File:         user_name.dart:1–5  
Rule:         No hardcoded colors; use the theme.  
Violation:    `Text(name, style: const TextStyle(color: Colors.blue))`  
Fix:          `Text(name, style: TextStyle(color: Theme.of(context).colorScheme.primary))`  
Auto-fixed:   YES  
Root Cause:   PATTERN_MISMATCH  
User Intent:  Display the user's name in blue text.  
Skill Gap:   none; the guidance already specifies the themed-color replacement.  
Co-skills:    none  

```dart
import 'package:flutter/material.dart';

class UserName extends StatelessWidget {
  const UserName({
    super.key,
    required this.name,
  });

  final String name;

  @override
  Widget build(BuildContext context) {
    return Text(
      name,
      style: TextStyle(
        color: Theme.of(context).colorScheme.primary,
      ),
    );
  }
}
```

Assumption: the app theme’s `colorScheme.primary` is configured as blue.
