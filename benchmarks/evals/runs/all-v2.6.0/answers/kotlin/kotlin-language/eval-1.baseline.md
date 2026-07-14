In Kotlin, replace `!!` with null-safe handling:

```kotlin
val length = value?.length              // nullable result
val length = value?.length ?: 0         // fallback
value?.let { process(it) }              // execute only when non-null
val required = value ?: error("Missing value") // fail explicitly
```

If null truly indicates a programmer error, use an explicit check:

```kotlin
val required = requireNotNull(value) { "value is required" }
```

Assuming `value` is nullable, prefer `?.`, `?:`, `let`, or `requireNotNull` according to the intended behavior.
