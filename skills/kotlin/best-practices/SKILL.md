---
name: Kotlin Best Practices
description: Core patterns for robust Kotlin code (Scope Functions, Backing Properties).
metadata:
  labels: [kotlin, best-practices, clean-code]
  triggers:
    files: ['**/*.kt']
    keywords: [apply, let, run, also, with, backing property, collection]
---

# Kotlin Best Practices

## **Priority: P1 (HIGH)**

Engineering standards for clean, maintainable Kotlin systems.

## Implementation Guidelines

- **Scope Functions**:
  - `apply`: Object configuration (returns object).
  - `also`: Side effects validation/logging (returns object).
  - `let`: Null checks (`?.let`) or mapping (returns result).
  - `run`: Object configuration and mapping (returns result).
  - `with`: Grouping multiple method calls on an object (returns result).
- **Backing Properties**: Use `_prop` (private mutable) and `prop` (public immutable) pattern for encapsulation.
- **Collections**: Expose `List`/`Map` (read-only interfaces) publicly, keep `MutableList` internal.
- **Single Expression**: Use `runCatching` for simple error handling over `try/catch` blocks.
- **Visibility**: Default to `private` or `internal`. Minimize `public` surface area.
- **Top-Level**: Prefer top-level functions/constants over implementation-less `object` singletons.

## Anti-Patterns

- **Nesting Scope Functions**: Avoid nesting `let`/`apply` more than 2 levels deep. It destroys readability.
- **Mutable Public Props**: Avoid `public var`. Use `private set` or backing properties.
- **Global Mutable State**: Avoid top-level mutable variables.

## Code

```kotlin
// Backing Property Pattern
class ViewModel {
    private val _uiState = MutableStateFlow(UiState.Loading)
    val uiState: StateFlow<UiState> = _uiState.asStateFlow() // Read-only

    fun load() {
        // apply for config
        val user = User().apply {
            name = "John"
            age = 30
        }

        // runCatching
        runCatching { api.fetch() }
            .onSuccess { _uiState.value = UiState.Success(it) }
            .onFailure { logger.error(it) }
    }
}
```

## Related Topics

language | coroutines
