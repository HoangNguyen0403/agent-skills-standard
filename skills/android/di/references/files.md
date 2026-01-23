# Hilt Dependency Injection Implementation

## Setup (Application)

```kotlin
@HiltAndroidApp
class MyApplication : Application()
```

## Module Template

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideRetrofit(okHttp: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl("https://api.example.com")
            .client(okHttp)
            .addConverterFactory(MoshiConverterFactory.create())
            .build()
    }
}
```

## Scoping

| Annotation                | Component        | Lifecycle       |
| :------------------------ | :--------------- | :-------------- |
| `@Singleton`              | Application      | Entire App      |
| `@ActivityRetainedScoped` | ActivityRetained | Config Changes  |
| `@ViewModelScoped`        | ViewModel        | Screen Lifetime |

## Interfaces Binding

```kotlin
@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    abstract fun bindRepo(impl: FeedRepositoryImpl): FeedRepository
}
```
