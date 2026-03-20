---
name: dart-best-practices
description: "Dart code quality conventions: naming, const/final/var hierarchy, single quotes, trailing commas, collection idioms, tear-offs, and import organization. Use when writing new Dart code or reviewing for style violations — wrong import style, global variables, var misuse, anonymous lambdas where tear-offs fit, or missing trailing commas. (triggers: **/*.dart, naming, convention, trailing comma, import, tear-off)"
---

# Dart Best Practices

## **Priority: P1 (OPERATIONAL)**

Best practices for writing clean, maintainable Dart code.

- **Scoping**:
  - No global variables.
  - Private globals (if required) must start with `_`.
- **Immutability**: Use `const` > `final` > `var`.
- **Config**: Use `--dart-define` for secrets. Never hardcode API keys.
- **Naming**: Follow [effective-dart](https://dart.dev/guides/language/effective-dart) (PascalCase classes, camelCase members).
- **Strings**: Prefer single quotes; use double quotes only for interpolation needs.
- **Trailing Commas**: Always use trailing commas for multi-line literals/params.
- **Expression Bodies**: Prefer `=>` for single-expression functions/getters.
- **Collections**:
  - Use `.map`, `.where`, `.fold`, `.any` over manual loops when clarity improves.
  - Type empty collections (`<String>[]`, `<String, User>{}`) to avoid `dynamic`.
  - Use collection `if`/`for` and spread operators for composable lists/maps.
- **Async**: Always `await` futures unless intentionally fire-and-forget.

```dart
import 'models/user.dart'; // Good
import 'package:app/models/user.dart'; // Avoid local absolute
```


## Anti-Patterns

- ❌ `var result = fetchOrders()` — use `final` or an explicit type; `var` only for locally obvious types in short scopes
- ❌ `import 'package:myapp/features/orders/order_model.dart'` within the same package — use relative imports for intra-package files
- ❌ Top-level mutable `List<Order> cachedOrders = []` — no global mutable state; use DI or encapsulate in a class
- ❌ `list.forEach((item) => doSomething(item))` — prefer tear-offs: `list.forEach(doSomething)`
