# Kotlin 2.4 — Gated Language Features

Reference for projects whose compiler, Kotlin Gradle Plugin (KGP), Gradle/AGP, compiler plugins and JVM target are already on **Kotlin 2.4.0+**. Nothing here belongs in default guidance for an older `languageVersion`.

## Compatibility preflight

Before emitting any 2.4 feature:

1. `kotlin("jvm")` / KGP version is ≥ 2.4.0 for every module that compiles the file.
2. `languageVersion` and `apiVersion` allow the feature; `-progressive` or explicit opt-in flags are recorded in the build.
3. Gradle, AGP (Android), compiler plugins (Compose, KSP, kapt, serialization) and the JVM target all support the same compiler.
4. stdlib is aligned with the compiler; a newer stdlib alone does not enable syntax.

## Explicit backing fields (stable in 2.4.0)

An alternative to the `_state`/`asStateFlow()` pair when the class wants a stored mutable field with a read-only public view and no hand-written getter:

```kotlin
// Kotlin 2.4+ only
class ProductViewModel : ViewModel() {
    val uiState: StateFlow<UiState>
        field = MutableStateFlow<UiState>(UiState.Loading)
}
```

Contract preserved: callers see `StateFlow` (read-only), the class keeps the mutable instance. Use it only where the existing backing-property idiom (`private val _state` + `val state = _state.asStateFlow()`) already exists or was being introduced — it is a declaration alternative, not a rewrite mandate.

## Context parameters (stable in 2.4.0, with exclusions)

A contextual dependency can replace threading an ambient service through every call:

```kotlin
// Kotlin 2.4+ — stable for ordinary parameters
context(logger: Logger)
fun process(order: Order) {
    logger.info("processing ${order.id}")
}
```

Stable guarantee excludes explicit context arguments and callable references that bind context. Treat those as unavailable unless the exact compiler behavior was verified.

## Deferred / experimental — do not emit by default

- **Collection literals** are still Experimental in 2.4: they need the experimental compiler option declared in the 2.4 release notes, not merely a source annotation. Verify the exact flag for the pinned compiler, and do not put them in shared guidance or migrate existing call sites.
- Experimental explicit context arguments, callable references with context, and any feature marked `@Experimental` in the 2.4 release notes.
- Mass rewrites, blanket version uplift, or raising `languageVersion` for a consumer that has not been checked against the preflight.

## Verification

- Old-consumer case: a 1.9/2.0 module still receives the `_state`/`asStateFlow()` idiom and compiles.
- New-consumer case: a 2.4 fixture compiles the explicit-backing-field class and keeps external read-only access with internal mutation.
- Opt-in-off case: with experimental flags off, no collection literal or experimental context argument is emitted.
