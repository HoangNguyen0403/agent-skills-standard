---
name: android-di
description: "Standards for Hilt Setup, Scoping, and Modules. Use when setting up Hilt dependency injection, component scoping, or modules in Android. (triggers: **/*Module.kt, **/*Component.kt, @HiltAndroidApp, @Inject, @Provides, @Binds)"
---

# Android Dependency Injection (Hilt)

## **Priority: P0**

## Implementation Guidelines

### Setup

- **App**: Must annotate `Application` class with `@HiltAndroidApp`.
- **Entries**: Annotate Activities/Fragments with `@AndroidEntryPoint`.

### Modules

- **Binding**: Use `@Binds` (abstract class) over `@Provides` when possible (smaller generated code).
- **InstallIn**: Be explicit (`SingletonComponent`, `ViewModelComponent`).

### Construction

- **Constructor Injection**: Prefer over Field Injection (`@Inject constructor(...)`).
- **Assisted Injection**: Use for runtime parameters (`@AssistedInject`).

## Anti-Patterns

- **No Manual Dagger Components**: Use Hilt — it generates all the wiring.
- **No Field Injection in Logic**: Use constructor injection; field injection only in Android components.

## References

- [Module Templates](references/files.md)
