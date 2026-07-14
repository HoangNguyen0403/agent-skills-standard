```kotlin
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Failure(val errorMessage: String) : Result<Nothing>()
}
```

Usage:

```kotlin
fun fetchUser(): Result<User> =
    try {
        Result.Success(loadUser())
    } catch (e: Exception) {
        Result.Failure(e.message ?: "Unknown error")
    }

when (val result = fetchUser()) {
    is Result.Success -> println(result.data)
    is Result.Failure -> println(result.errorMessage)
}
```

`Result<out T>` is covariant, and `Failure` uses `Result<Nothing>` because it contains no success data.
