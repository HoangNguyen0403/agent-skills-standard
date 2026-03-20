---
name: android-architecture
description: "Standards for Clean Architecture, Modularization, and Unidirectional Data Flow. Use when anyone sets up Android project structure, asks where code belongs in Clean Architecture layers, discusses modularization (feature/core modules), or questions UDF (events up, state down). (triggers: build.gradle.kts, settings.gradle.kts, clean-architecture, module, layers, domain, UDF, unidirectional, feature module, core module, presentation layer, data layer)"
---

# Android Architecture Standards

## **Priority: P0 (CRITICAL)**

## Implementation Guidelines

### Layering (Clean Architecture)

- **Domain**: Pure Kotlin (No Android deps). Contains UseCases/Models.
- **Data**: Repository impl, DataSources (API/DB). Maps DTO -> Domain.
- **UI**: ViewModel + Composable. Maps Domain -> UiState.

### Modularization

- **Feature Modules**: `:feature:home`, `:feature:profile`.
- **Core Modules**: `:core:ui` (Design System), `:core:network`, `:core:database`.
- **App Module**: DI Root and Navigation Guard.

### Unidirectional Data Flow (UDF)

- **Events**: UI -> ViewModel (Events).
- **State**: ViewModel -> UI (StateFlow<UiState>).

### Jetpack Compose

- **Hosting**: Are you using `setContent` in Activity? (No XML Layouts)
- **State**: Is state hoisted to ViewModel using `collectAsStateWithLifecycle`?
- **Unidirectional**: Are events passed UP and state passed DOWN?
- **Recomposition**: Are Composables stable? (Check for unstable types in parameters)
- **Navigation**: Is `Compose Navigation` using Type-Safe destinations?

## Anti-Patterns

- **No Logic in Activity**: Host Navigation only.
- **No Repo in UI**: Access data exclusively via ViewModel.
- **No Context in Domain**: Keep Logic Pure.

## References

- [Structure & Examples](references/implementation.md)
- [Jetpack Compose Best Practices](references/compose-standards.md)
