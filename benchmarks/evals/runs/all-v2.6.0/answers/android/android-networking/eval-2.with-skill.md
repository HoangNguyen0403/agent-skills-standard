# JSON serialization for Retrofit

Use Kotlinx Serialization with Retrofit. It is type-safe, works with Kotlin `@Serializable` models, and is the serialization standard for this Android networking setup. Configure its converter explicitly with the JSON media type; do not rely on an unspecified or raw converter factory.

Add the Kotlin serialization plugin and the JSON/converter dependencies using versions compatible with the project:

```kotlin
plugins {
    kotlin("plugin.serialization") version "<kotlin-version>"
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:<version>")
    implementation("com.squareup.retrofit2:retrofit:<version>")
    implementation("com.jakewharton.retrofit:retrofit2-kotlinx-serialization-converter:<version>")
}
```

Annotate DTOs with `@Serializable`. Use `@SerialName` whenever the JSON key differs from the Kotlin property name:

```kotlin
@Serializable
data class UserDto(
    @SerialName("user_id") val userId: String,
    @SerialName("display_name") val displayName: String,
)
```

Create one configured `Json` instance and pass it to Retrofit:

```kotlin
val json = Json {
    // Allows the server to add response fields without breaking old clients.
    ignoreUnknownKeys = true
}

val retrofit = Retrofit.Builder()
    .baseUrl(BuildConfig.API_URL) // must end with '/'
    .client(okHttpClient)
    .addConverterFactory(
        json.asConverterFactory("application/json".toMediaType())
    )
    .build()
```

The API interface remains a declaration-only boundary, for example:

```kotlin
interface UserApi {
    @GET("users/{id}")
    suspend fun getUser(@Path("id") id: String): UserDto
}
```

Keep status/error handling in the repository and return a `Result`-style wrapper there. Kotlinx Serialization controls JSON encoding/decoding; OkHttp still owns transport concerns such as authentication interceptors, logging, and certificate pinning.

