Use `let` when you want the value as `it` and need the lambda result, commonly for a null-safe transform or a short value-scoped operation:

```kotlin
val length = name?.let { it.length }
```

Use `apply` when configuring an object and want the original object back. Its receiver is `this`:

```kotlin
val request = Request().apply {
    method = "GET"
    timeoutMs = 5_000
}
```

Use `run` when you want a receiver as `this` but need the lambda's computed result, such as a scoped calculation. The nullable form `value?.run { ... }` is also useful. Choose based on the return value and receiver style, and avoid nesting scope functions when ordinary code is clearer.
