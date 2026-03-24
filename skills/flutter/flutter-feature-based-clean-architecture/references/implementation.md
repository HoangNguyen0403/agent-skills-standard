# Feature-Based Clean Architecture Implementation Examples

## Cross-Feature Import Rule

```dart
// CORRECT: Import only domain types from another feature
import 'package:app/features/auth/domain/entities/user.dart';

// WRONG: Never import data or presentation from another feature
// import 'package:app/features/auth/data/models/user_dto.dart';
```
