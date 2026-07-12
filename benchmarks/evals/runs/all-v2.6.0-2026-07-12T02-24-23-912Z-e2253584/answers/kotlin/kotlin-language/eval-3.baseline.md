For a domain result with a success value or failure details, use a sealed hierarchy so callers must handle both cases:

```kotlin
sealed interface Outcome<out T> {
    data class Success<T>(val value: T) : Outcome<T>
    data class Failure(val message: String, val cause: Throwable? = null) : Outcome<Nothing>
}
```

Consumers can use an exhaustive `when` over `Success` and `Failure`, without exceptions being hidden in the type. Kotlin's standard `Result<T>` is also appropriate when the failure is naturally represented by a `Throwable`; use a domain-specific sealed type when callers need structured error categories or messages.
