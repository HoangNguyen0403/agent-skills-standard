Usually no — if those files are inside the same Dart package, prefer relative imports instead of `package:myapp/...` imports.

Example:

```dart
import '../models/user.dart';
import 'formatters.dart';
```

Prefer that over:

```dart
import 'package:myapp/models/user.dart';
import 'package:myapp/utils/formatters.dart';
```

Why:

- relative imports make it obvious the dependency is local to the same package
- they avoid mixing external-style and internal-style imports
- they match the style rule: do not use package imports within the same package

Use `package:` imports for code coming from other packages, including public dependencies:

```dart
import 'package:collection/collection.dart';
import 'package:flutter/material.dart';
```

A good rule of thumb:

- same package, nearby source file: use relative import
- different package: use `package:` import

Also keep imports organized and clean:

- remove unused imports
- avoid duplicate paths to the same library
- keep local relative imports separate from external package imports if your formatter/lints expect grouping

So if your file currently uses `package:myapp/...` everywhere for internal files, I would treat that as a style issue and convert those intra-package imports to relative ones.

