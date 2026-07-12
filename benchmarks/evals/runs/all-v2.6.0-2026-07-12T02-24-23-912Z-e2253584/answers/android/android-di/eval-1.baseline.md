# Provide a singleton Retrofit instance with Hilt

Install a module in `SingletonComponent`, provide the `Retrofit` instance, and scope the provider with `@Singleton`:

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides
    @Singleton
    fun provideRetrofit(): Retrofit =
        Retrofit.Builder()
            .baseUrl("https://api.example.com/") // Retrofit requires a trailing slash
            .addConverterFactory(MoshiConverterFactory.create())
            .build()

    @Provides
    @Singleton
    fun provideProductApi(retrofit: Retrofit): ProductApi =
        retrofit.create(ProductApi::class.java)
}
```

`SingletonComponent` lives for the lifetime of the application, so every injection of `Retrofit` receives the same instance. Inject it through a constructor in a repository or other class:

```kotlin
class ProductRepository @Inject constructor(
    private val api: ProductApi
)
```

Make sure the application class is annotated with `@HiltAndroidApp` and that the module is in a source set processed by Hilt.

