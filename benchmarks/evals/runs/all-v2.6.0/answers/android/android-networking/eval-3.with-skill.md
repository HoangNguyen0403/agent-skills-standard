# Retrofit methods should be `suspend`

For this networking standard, no: every Retrofit API call must be a `suspend` function. A non-suspend method such as `Call<UserDto>` or a direct `execute()` call permits a blocking or inconsistent calling pattern and violates the rule that API calls are coroutine-friendly and non-blocking.

Declare only the endpoint in the API interface:

```kotlin
interface UserApi {
    @GET("users/{id}")
    suspend fun getUser(@Path("id") id: String): UserDto
}
```

Then invoke it from a coroutine, for example `viewModelScope.launch`. Retrofit/OkHttp performs the network operation without requiring the caller to block the UI thread, and coroutine cancellation can cancel the request. Do not wrap the call in `runBlocking` or replace it with `Call.execute()`.

Interpret failures in the repository and expose a stable result to the rest of the app:

```kotlin
sealed interface NetworkResult<out T> {
    data class Success<T>(val data: T) : NetworkResult<T>
    data class Error(val code: Int, val message: String?) : NetworkResult<Nothing>
    data class Exception(val cause: Throwable) : NetworkResult<Nothing>
}

class UserRepository(
    private val api: UserApi,
) {
    suspend fun getUser(id: String): NetworkResult<UserDto> = try {
        NetworkResult.Success(api.getUser(id))
    } catch (error: HttpException) {
        NetworkResult.Error(error.code(), error.message())
    } catch (error: IOException) {
        NetworkResult.Exception(error)
    }
}
```

If the existing method is non-suspend, change the declaration and update callers to launch/await it from a coroutine. Keep authentication and logging in OkHttp interceptors, and keep endpoint declarations free of repository/business logic. For the networking stack as a whole, use Retrofit 2, OkHttp 4, and Kotlinx Serialization with an explicit `application/json` converter.

