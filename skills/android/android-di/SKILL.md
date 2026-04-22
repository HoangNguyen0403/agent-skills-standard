---
name: android-di
description: Configure Hilt dependency injection with proper scoping, modules, and constructor injection in Android. Use when setting up Hilt DI, defining modules, or configuring component scoping.
metadata:
  triggers:
    files:
    - '**/*Module.kt'
    - '**/*Component.kt'
    keywords:
    - "@HiltAndroidApp"
    - "@Inject"
    - "@Provides"
    - "@Binds"
---
# Android Dependency Injection (Hilt)

## **Priority: P0**

## 1. Bootstrap Hilt

- Annotate `Application` class with `@HiltAndroidApp`.
- Annotate Activities/Fragments with `@AndroidEntryPoint`.

See [module templates](references/files.md) for bootstrap and module examples.

## 2. Define Modules

- Use `@Binds` (abstract class) over `@Provides` when possible — generates smaller code.
- explicit with `@InstallIn` (`SingletonComponent`, `ViewModelComponent`).

See [module templates](references/files.md) for `@Binds` examples.

## 3. Prefer Constructor Injection

- Use `@Inject constructor(...)` over field injection.
- Use `@AssistedInject` for runtime parameters.

## Anti-Patterns

- **No Manual Dagger Components**: Use Hilt — it generates all wiring.
- **No Field Injection in Logic**: Use constructor injection; field injection only in Android framework classes.

## References

- [Module Templates](references/files.md)