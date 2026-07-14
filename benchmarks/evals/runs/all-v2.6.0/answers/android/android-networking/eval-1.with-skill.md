# Retrofit client with authentication

Use Retrofit 2 on top of OkHttp 4. Put authentication in an OkHttp interceptor, configure Kotlinx Serialization explicitly as the JSON converter, and keep HTTP/error interpretation in a repository rather than in the API interface.

```kotlin
// Dependencies (use versions compatible with the project)
implementation("com.squareup.retrofit2:retrofit:<version>")
implementation("com.squareup.okhttp3:okhttp:<version>")
implementation("com.squareup.okhttp3:logging-interceptor:<version>")
implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:<version>")
implementation("com.jakewharton.retrofit:retrofit2-kotlinx-serialization-converter:<version>")
```

Define a token provider and inject a Bearer token on every request that has one:

```kotlin
fun interface TokenProvider {
    fun accessToken(): String?
}

class AuthInterceptor(
    private val tokenProvider: TokenProvider,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = tokenProvider.accessToken()
        val request = chain.request().newBuilder().apply {
            if (!token.isNullOrBlank()) {
                header("Authorization", "Bearer $token")
            }
        }.build()

        return chain.proceed(request)
    }
}
```

Build the client and Retrofit instance. Logging is enabled only for debug builds, and the authorization header is redacted. For a sensitive production domain, replace the example pin with the real, operationally managed certificate pins and rotate them safely.

```kotlin
private val json = Json {
    ignoreUnknownKeys = true
}

private val productionPinner = CertificatePinner.Builder()
    .add("api.example.com", "sha256/<base64-certificate-pin>")
    .build()

fun provideOkHttpClient(tokenProvider: TokenProvider): OkHttpClient {
    val logging = HttpLoggingInterceptor().apply {
        redactHeader("Authorization")
        level = if (BuildConfig.DEBUG) {
            HttpLoggingInterceptor.Level.BODY
        } else {
            HttpLoggingInterceptor.Level.NONE
        }
    }

    val builder = OkHttpClient.Builder()
        .addInterceptor(AuthInterceptor(tokenProvider))
        .addInterceptor(logging)

    if (!BuildConfig.DEBUG) {
        builder.certificatePinner(productionPinner)
    }

    return builder.build()
}

fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit =
    Retrofit.Builder()
        .baseUrl(BuildConfig.API_URL) // must end with '/'
        .client(okHttpClient)
        .addConverterFactory(
            json.asConverterFactory("application/json".toMediaType())
        )
        .build()
```

Keep the API interface declarative and make every network method `suspend`:

```kotlin
interface UserApi {
    @GET("users/{id}")
    suspend fun getUser(@Path("id") id: String): UserDto
}
```

Handle HTTP and transport failures in the repository. A small result type prevents callers from having to depend on Retrofit exceptions:

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

Do not put token refresh, response branching, or blocking `execute()` calls in the Retrofit interface. Also preserve coroutine cancellation if the repository catches broad exceptions.

