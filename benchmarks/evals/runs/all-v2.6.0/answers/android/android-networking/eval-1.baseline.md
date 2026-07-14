# Retrofit authentication setup in Android

Use Retrofit for the API contract and an OkHttp interceptor for authentication. The interceptor can attach the current access token to every request without duplicating header code in each endpoint.

```kotlin
// build.gradle.kts
dependencies {
    implementation("com.squareup.retrofit2:retrofit:<version>")
    implementation("com.squareup.retrofit2:converter-moshi:<version>")
    implementation("com.squareup.okhttp3:logging-interceptor:<version>") // debug builds only
}
```

```kotlin
interface UserApi {
    @GET("users/me")
    suspend fun currentUser(): User

    @POST("auth/refresh")
    suspend fun refresh(@Body request: RefreshRequest): TokenResponse
}

class BearerTokenInterceptor(
    private val tokenStore: TokenStore
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = tokenStore.accessToken()
        val request = chain.request().newBuilder()
            .apply {
                if (token != null) {
                    header("Authorization", "Bearer $token")
                }
            }
            .build()

        return chain.proceed(request)
    }
}

val httpClient = OkHttpClient.Builder()
    .addInterceptor(BearerTokenInterceptor(tokenStore))
    .apply {
        if (BuildConfig.DEBUG) {
            addInterceptor(HttpLoggingInterceptor().apply {
                // Never log Authorization headers or response bodies containing secrets.
                level = HttpLoggingInterceptor.Level.BASIC
            })
        }
    }
    .build()

val retrofit = Retrofit.Builder()
    .baseUrl("https://api.example.com/") // must end with '/'
    .client(httpClient)
    .addConverterFactory(MoshiConverterFactory.create())
    .build()

val userApi = retrofit.create(UserApi::class.java)
```

For a simple application, this is enough: store the token after login, and have `TokenStore` return it for subsequent requests. Keep the token in a protected storage mechanism such as encrypted preferences or a secure keystore-backed implementation, and use HTTPS.

If access tokens expire, add an OkHttp `Authenticator` rather than trying to refresh inside the ordinary interceptor. The authenticator is invoked after a `401`; it should refresh the token, update the store, and rebuild the failed request with the new token. It must guard against infinite retry loops and coordinate concurrent refreshes so several simultaneous `401` responses do not each perform a refresh. If refresh fails, clear the session and require login again. For a small app, a repository or API client can also handle `401` responses explicitly, but the same retry and concurrency rules apply.

Do not put a long-lived access token directly in source code, query parameters, or logs. Inject the Retrofit service through the app's dependency-injection setup, and keep authentication policy in the networking layer so it is consistently applied and testable.

