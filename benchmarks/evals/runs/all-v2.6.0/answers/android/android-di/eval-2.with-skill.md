# `@Binds` versus `@Provides`

Use `@Binds` when an implementation already has an `@Inject` constructor and should be exposed as an interface or superclass. The module is abstract and the binding method has one parameter:

```kotlin
interface ProductRepository

class DefaultProductRepository @Inject constructor(
    private val api: ProductApi
) : ProductRepository

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    @Singleton
    abstract fun bindProductRepository(
        implementation: DefaultProductRepository
    ): ProductRepository
}
```

Use `@Provides` when constructing a type requires builder or factory logic, when the type is from a third-party library and cannot be annotated, or when you need to transform/configure values. Retrofit, OkHttp, and API clients are typical `@Provides` bindings.

Prefer constructor injection first, then `@Binds` for interface mappings, and `@Provides` only for construction Hilt cannot express through an injectable constructor. Every module should explicitly declare its Hilt component with `@InstallIn`; add a scope such as `@Singleton` only when the lifetime should match that component.

