---
name: android-architecture
description: "Apply Clean Architecture layering, modularization, and Unidirectional Data Flow in Android projects. Use when setting up Android project structure, placing code in Clean Architecture layers, configuring feature/core modules, or implementing UDF patterns. (triggers: build.gradle.kts, settings.gradle.kts, clean-architecture, module, layers, domain, UDF, unidirectional, feature module, core module, presentation layer, data layer)"
---

# Android Architecture Standards

## **Priority: P0 (CRITICAL)**

## 1. Layer Your Project (Clean Architecture)

- **Domain**: Pure Kotlin (No Android deps). Contains UseCases and Models.
- **Data**: Repository impl, DataSources (API/DB). Maps DTO -> Domain.
- **UI**: ViewModel + Composable. Maps Domain -> UiState.

See [structure & examples](references/implementation.md) for Clean Architecture layer examples.

## 2. Modularize by Feature and Core

- **Feature Modules**: `:feature:home`, `:feature:profile`.
- **Core Modules**: `:core:ui` (Design System), `:core:network`, `:core:database`.
- **App Module**: DI Root and Navigation Guard.

See [structure & examples](references/implementation.md) for module configuration.

## 3. Enforce Unidirectional Data Flow (UDF)

- **Events**: UI -> ViewModel (user actions flow UP).
- **State**: ViewModel -> UI (`StateFlow<UiState>` flows DOWN).

## 4. Verify Jetpack Compose Integration

- **Hosting**: Use `setContent` in Activity (No XML Layouts).
- **State**: Hoist state to ViewModel using `collectAsStateWithLifecycle`.
- **Recomposition**: Ensure Composable parameters are `@Stable` or `@Immutable`.
- **Navigation**: Use Compose Navigation with Type-Safe destinations.

## Anti-Patterns

- **No Logic in Activity**: Host Navigation only.
- **No Repo in UI**: Access data exclusively via ViewModel.
- **No Context in Domain**: Keep Logic Pure.

## References

- [Structure & Examples](references/implementation.md)
- [Jetpack Compose Best Practices](references/compose-standards.md)
