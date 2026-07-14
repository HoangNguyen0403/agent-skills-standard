# Choosing JSON serialization with Retrofit

For a Kotlin Android application, Moshi is a strong default with Retrofit. It has a small, focused API, good Kotlin support, and an official Retrofit converter:

```kotlin
implementation("com.squareup.retrofit2:converter-moshi:<retrofit-version>")
implementation("com.squareup.moshi:moshi-kotlin:<moshi-version>")
```

```kotlin
@JsonClass(generateAdapter = true)
data class User(
    @Json(name = "user_id") val id: String,
    val displayName: String
)

val retrofit = Retrofit.Builder()
    .baseUrl("https://api.example.com/")
    .addConverterFactory(MoshiConverterFactory.create())
    .build()
```

Use Moshi's generated adapters for application models where possible. They avoid much of the reflection overhead and make model/converter errors more visible at build time. Configure explicit field names, nullability, date formats, and custom adapters for API quirks instead of relying on accidental defaults.

The best choice can depend on the project:

- Use `kotlinx.serialization` when the project already standardizes on Kotlin serialization, shares models with Kotlin Multiplatform, or wants compiler-generated serializers. Retrofit needs a compatible Kotlin serialization converter, and the serialization plugin plus `@Serializable` models must be configured.
- Use Moshi when the app is Android/Kotlin focused and wants straightforward Retrofit integration and Kotlin-friendly generated adapters.
- Use Gson when an existing codebase already depends heavily on it or needs its mature, permissive behavior. It remains usable, but it is generally less Kotlin-aware than Moshi and can hide problems around nullability or default values.

Do not register multiple JSON converter factories and expect Retrofit to choose based on the endpoint. Retrofit asks factories in order, and the first one that can handle a type wins; an incorrectly ordered or overly broad converter can produce surprising behavior. Pick one primary JSON converter, then add scalar or other narrowly scoped converters as needed.

Whichever library is selected, model the server contract deliberately: distinguish absent, `null`, and default values when the API does, handle unknown enum values if the backend can add them, and test malformed responses, renamed fields, and error-body parsing. The converter does not validate that the server response has the business meaning the app expects, so response and domain validation still belong in the data/repository layer.

