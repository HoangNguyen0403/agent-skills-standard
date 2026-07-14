---
name: kotlin-language
description: Write idiomatic Kotlin 1.9+ with null safety, sealed classes, data classes, extension functions, delegates, collections, inline/reified generics, and expression syntax. Use for Kotlin language constructs, Java-to-Kotlin migration, lazy delegates, data classes, backing properties, or inline/reified generics; keep language constructs in scope even inside response models, and defer coroutine configuration, Android Context/framework, Retrofit/OkHttp client setup, and other library-specific recipes.
metadata:
  triggers:
    files:
      - "**/*.kt"
      - "**/*.kts"
    keywords:
      - val
      - var
      - "?."
      - "?:"
      - "!!"
      - data class
      - sealed
      - when
      - extension
      - lazy
      - lateinit
      - object
---

# Kotlin Language Patterns

## **Priority: P0 (CRITICAL)**

## Implementation Guidelines

- **Immutability**: Use `val` by default. Only use `var` if mutation required locally.
- **Null Safety**: Use `?` for nullable types. Use safe call `?.` and Elvis `?:` over `!!`.
- **Expressions**: Prefer expression bodies `fun foo() = ...` for one-liners. Use `if`/`try` as expressions.
- **Classes**: Use `data class` for DTOs. Use `sealed interface/class` for state hierarchies (e.g., `Success`, `Error`, `Loading`). Access members as computed property rather than function.
- **Extension Functions**: Prefer over utility classes (`StringUtil`). Keep private/internal if module-specific.
- **Named Arguments**: Use for clarity, especially with booleans or multiple same-type params.
- **String Templates**: Use `"$var"` over concatenation. Use `""` for multiline strings (SQL/JSON).

## Anti-Patterns

- **No !! Operator**: Never use in production; prefer safe calls or requireNotNull.
- **No Java-isms**: Use properties not get/set; prefer top-level functions over companion object statics.
- **No Lateinit Abuse**: Prefer nullable types or lazy delegates instead.
- **No Silenced Errors**: Never swallow exceptions without logging or handling.

## References

- [Sealed Class, When Expression & Extension Examples](references/example.md)


## Canonical response anchors

- Additional task-grounded exact anchors: data class
