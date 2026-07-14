# Android Framework Map

Reviewed: 2026-07-09

Official sources:
- https://developer.android.com/develop
- https://developer.android.com/topic/architecture
- https://developer.android.com/jetpack/compose
- https://developer.android.com/topic/libraries/architecture/coroutines
- https://developer.android.com/guide/navigation

Notes:
- Treat Compose as the default UI toolkit unless the module is explicitly maintaining an XML view hierarchy.

## Default stance

- `android-architecture`: module boundaries, layering, unidirectional data flow.
- `android-compose`: default UI toolkit, recomposition rules.
- `android-state`: `StateFlow`/sealed `UiState`, `collectAsStateWithLifecycle`.
- `android-di`: Hilt module/scope conventions.
- `android-navigation-type-safe`: default navigation approach for new Compose screens.
- `android-testing`: instrumented + unit test conventions, `./gradlew test`.

## Compose vs legacy defaults

- New screens: Compose (`android-compose`) + type-safe Navigation (`android-navigation-type-safe` or `android-navigation-3` depending on target Nav version).
- Existing XML view hierarchies: `android-xml-views` for maintenance; use `android-compose-migration` when incrementally moving a screen to Compose rather than rewriting the whole module.
- Legacy skills (`android-legacy-navigation`, `android-legacy-security`, `android-legacy-state`) apply only to code that predates the current architecture guidance — do not use them as a template for new code.

## Runtime defaults

- One `StateFlow`/VM per screen; expose a single sealed UI-state type.
- Hilt for DI; avoid manual singleton graphs.
- `./gradlew test`, `./gradlew connectedAndroidTest`, `./gradlew lint` before calling a change verified.

## Smells that mean "load more skills"

- A Compose screen reads mutable fields directly off a ViewModel instead of collecting a `StateFlow`.
- Navigation arguments are passed as untyped strings/bundles instead of the type-safe API.
- New code copies patterns from an `android-legacy-*` skill instead of the current default.
- DI wiring is hand-rolled instead of going through Hilt modules.
