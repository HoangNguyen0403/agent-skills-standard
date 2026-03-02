# Widget Key Standards — Reference

## File Layout

```text
lib/core/keys/
├── app_widget_keys.dart              ← single barrel; always import this
└── authenticate/
    └── login_widget_keys.dart        ← LoginWidgetKeys
```

## Adding Keys for a New Screen

1. Create `lib/core/keys/<feature>/<screen>_widget_keys.dart`
2. Add one `export` line in `app_widget_keys.dart`
3. No other changes needed.

## WidgetKeys Class Pattern

```dart
// lib/core/keys/authenticate/login_widget_keys.dart
import 'package:flutter/material.dart';

abstract final class LoginWidgetKeys {
  static const emailField          = Key('authenticate.login.emailField');
  static const passwordField       = Key('authenticate.login.passwordField');
  static const submitButton        = Key('authenticate.login.submitButton');
  static const forgotPasswordButton = Key('authenticate.login.forgotPasswordButton');
  static const signUpLink          = Key('authenticate.login.signUpLink');
}
```

Key string format: `<feature>.<screen>.<element>` — readable in failure output.

## Barrel Export (app_widget_keys.dart)

```dart
// lib/core/keys/app_widget_keys.dart
export 'authenticate/login_widget_keys.dart';
// export 'child/child_widget_keys.dart';    ← add one line per new screen
```

## Usage

```dart
// ✅ In widget
EmailField(key: LoginWidgetKeys.emailField, ...)

// ✅ In robot / test
find.byKey(LoginWidgetKeys.emailField)

// ❌ Never inline
find.byKey(const Key('login_email_field'))
```
