# `@Binds` versus `@Provides`

Use `@Binds` when Hilt only needs an interface-to-implementation mapping and the implementation has an `@Inject` constructor:

```kotlin
class ProductRepositoryImpl @Inject constructor(
    private val api: ProductApi
) : ProductRepository

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    @Singleton
    abstract fun bindProductRepository(
        impl: ProductRepositoryImpl
    ): ProductRepository
}
```

Use `@Provides` when the object must be constructed with a builder or factory, comes from a third-party library, needs configuration or custom logic, or cannot have an `@Inject` constructor:

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
}
```

In short, `@Binds` declares an existing implementation for an abstraction; `@Provides` contains the code that creates the object. A `@Binds` method must be abstract, take one implementation parameter, and return the bound abstraction. Scopes such as `@Singleton` can be applied to either binding when the dependency should be shared in that component.

