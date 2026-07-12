Prefer expressing the null case explicitly:

```kotlin
val displayName = user?.name ?: "Anonymous"
user?.let { audit(it) }
if (user != null) show(user.name)
```

Use a safe call (`?.`), Elvis (`?:`), `let`, or an early return when null is expected. If null indicates invalid input, use `requireNotNull(value)`; if it indicates an internal invariant failure, use `checkNotNull(value)`. These give a deliberate failure and useful message. Use `!!` only when non-nullness is genuinely proven and local; it otherwise turns a possible null into an uncontrolled `NullPointerException`.
