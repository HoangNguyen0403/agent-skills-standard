```dart
import 'package:flutter/material.dart';

class UserNameText extends StatelessWidget {
  const UserNameText({
    super.key,
    required this.name,
  });

  final String name;

  @override
  Widget build(BuildContext context) {
    return Text(
      name,
      style: const TextStyle(color: Colors.blue),
    );
  }
}
```

Use it as `UserNameText(name: user.name)`. The required parameter keeps the widget explicit and reusable; `const` is preserved where the input and style are compile-time constants.
