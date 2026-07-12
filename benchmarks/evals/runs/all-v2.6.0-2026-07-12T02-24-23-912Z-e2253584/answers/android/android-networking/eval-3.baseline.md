# Retrofit methods that are not `suspend`

Yes. A Retrofit service method does not have to be a `suspend` function. The traditional form returns `Call<T>` and can be used with either an asynchronous callback or a synchronous `execute()` call:

```kotlin
interface UserApi {
    @GET("users/me")
    fun currentUser(): Call<User>
}

userApi.currentUser().enqueue(object : Callback<User> {
    override fun onResponse(call: Call<User>, response: Response<User>) {
        if (response.isSuccessful) {
            val user = response.body()
            // Update state on the appropriate application scope.
        } else {
            // Handle the HTTP error and, if useful, parse errorBody().
        }
    }

    override fun onFailure(call: Call<User>, error: Throwable) {
        // Network failure, cancellation, or a conversion failure.
    }
})
```

`enqueue()` is asynchronous and is safe to call from the main thread because the network work is performed by OkHttp. `execute()` blocks the calling thread, so it must never run on the Android main thread; it is normally used only from a worker thread. A `Call` can be canceled, and callbacks should account for cancellation and lifecycle ownership so a response is not delivered to a destroyed screen.

With Kotlin coroutines, `suspend` is usually the cleaner modern choice:

```kotlin
interface UserApi {
    @GET("users/me")
    suspend fun currentUser(): User

    // Use Response<User> when the caller needs status codes and headers.
    @GET("users/me")
    suspend fun currentUserResponse(): Response<User>
}
```

Call the suspend method from a lifecycle-aware scope such as `viewModelScope`, and map HTTP failures, connectivity failures, cancellation, and serialization failures into the app's state model. Retrofit suspending calls do not make a request synchronous; they suspend the coroutine while OkHttp performs the work and resume it with the result or exception.

Choose `Call<T>` when the existing codebase uses callbacks, when a library integration requires that API, or when you specifically want Retrofit's callback model. Choose `suspend` when the project already uses coroutines and structured concurrency. The important rule is not the keyword: never perform blocking network I/O on the main thread, and make cancellation and error handling explicit.

