# Feature Folder Structure

A complete blueprint for a single feature directory (e.g., `lib/features/authentication/`).

```text
lib/features/authentication/
├── domain/
│   ├── entities/
│   │   └── auth_user.dart
│   ├── repositories/
│   │   └── i_auth_repository.dart
│   └── use_cases/
│       └── login_use_case.dart
├── data/
│   ├── data_sources/
│   │   ├── auth_remote_data_source.dart
│   │   └── auth_local_data_source.dart
│   ├── dtos/
│   │   └── user_dto.dart
│   └── repositories/
│       └── auth_repository_impl.dart
└── presentation/
    ├── blocs/
    │   └── auth/
    ├── pages/
    │   ├── login_page.dart
    │   └── profile_page.dart
    └── widgets/
        └── auth_form.dart
```

## **Key Constraints**

1. **Barrel Files**: Use `authentication.dart` at the feature root to export ONLY the domain layer.
2. **Sub-directories**: Do not create more levels than shown above unless the feature has 20+ files.
3. **Mappers**: Should be kept in the `data/` layer, typically as extensions on DTOs.
