# Feature-Based Clean Architecture Implementation Examples

## Feature Directory Example

```text
lib/features/orders/
├── domain/
│   ├── entities/order.dart
│   ├── failures/order_failure.dart
│   └── repositories/i_order_repository.dart
├── data/
│   ├── models/order_dto.dart
│   ├── data_sources/order_remote_data_source.dart
│   └── repositories/order_repository_impl.dart
└── presentation/
    ├── bloc/order_bloc.dart
    └── pages/order_list_page.dart
```

## Cross-Feature Import Rule

```dart
// CORRECT: Import only domain types from another feature
import 'package:app/features/auth/domain/entities/user.dart';

// WRONG: Never import data or presentation from another feature
// import 'package:app/features/auth/data/models/user_dto.dart';
```
