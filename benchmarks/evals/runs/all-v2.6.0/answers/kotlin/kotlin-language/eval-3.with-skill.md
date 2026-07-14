```kotlin
sealed interface Result<out T> {
    data class Success<T>(val data: T) : Result<T>

    data class Failure(val message: String) : Result<Nothing>
}
```

Use an exhaustive `when`:

```kotlin
fun display(result: Result<String>) = when (result) {
    is Result.Success -> result.data
    is Result.Failure -> "Error: ${result.message}"
}
```

`sealed interface` models the fixed state hierarchy, while `data class` provides value semantics and readable properties. `Result<out T>` allows `Failure` to work with any result type without nullable values or `!!`.
