Use Kotlin null-safety instead of `!!`:

```kotlin
val name = user?.name ?: "Unknown"
```

- `?.` safely accesses nullable values.
- `?:` (Elvis) supplies a fallback or can throw:

```kotlin
val name = user?.name ?: error("User name is required")
```

- Use `requireNotNull(value)` when null indicates invalid input:

```kotlin
val name = requireNotNull(user.name) { "User name is required" }
```

Prefer nullable types, safe calls, and Elvis expressions; avoid `!!` in production.
