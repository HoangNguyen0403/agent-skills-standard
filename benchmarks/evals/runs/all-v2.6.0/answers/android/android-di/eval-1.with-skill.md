# Singleton Retrofit with Hilt

Install the module in `SingletonComponent` and scope the provider with `@Singleton`:

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides
    @Singleton
    fun provideRetrofit(): Retrofit =
        Retrofit.Builder()
            .baseUrl("https://api.example.com/")
            .addConverterFactory(MoshiConverterFactory.create())
            .build()

    @Provides
    @Singleton
    fun provideApi(retrofit: Retrofit): ProductApi =
        retrofit.create(ProductApi::class.java)
}
```

Annotate the application with `@HiltAndroidApp`, and annotate Android entry points such as activities and fragments with `@AndroidEntryPoint`. Hilt then creates one `Retrofit` instance in the application-wide singleton component and reuses it wherever `Retrofit` or `ProductApi` is constructor-injected.

```kotlin
class ProductRepository @Inject constructor(
    private val api: ProductApi
)
```

Use a distinct qualifier if the app needs multiple Retrofit instances or base URLs.

