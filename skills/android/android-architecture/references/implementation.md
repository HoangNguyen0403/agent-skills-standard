# Android Architecture Implementation

## Module Structure (Multi-Module)

```text
root
├── app/               # DI Assembly, Navigation
├── core/
│   ├── network/       # Retrofit, OkHttp
│   ├── database/      # Room, DAO
│   ├── ui/            # Theme, Common Components
│   └── common/        # Extensions, Result wrappers
├── feature/
│   ├── home/          # UI + ViewModel + Domain (optional)
│   └── profile/
```

## Clean Architecture Layers

### Domain Layer (Pure Kotlin)

```kotlin
// feature/domain/usecase/GetFeedUseCase.kt
class GetFeedUseCase @Inject constructor(
    private val repository: FeedRepository
) {
    operator fun invoke(): Flow<Result<List<Post>>> = repository.getFeed()
}
```

### Data Layer (Implementation)

```kotlin
// feature/data/repository/FeedRepositoryImpl.kt
class FeedRepositoryImpl @Inject constructor(
    private val api: FeedApi,
    private val dao: FeedDao
) : FeedRepository {
    override fun getFeed() = flow {
        emit(dao.getAll()) // Cache
        val remote = api.fetch()
        dao.insert(remote) // Source of Truth
        emit(dao.getAll())
    }.map { Result.Success(it) }
}
```

## Domain Layer UseCase (Pure Kotlin)

```kotlin
// Domain layer — pure Kotlin, no Android imports
class GetUserUseCase @Inject constructor(
    private val repo: UserRepository
) {
    suspend operator fun invoke(id: String): User = repo.getUser(id)
}
```

## Module Configuration

```kotlin
// settings.gradle.kts
include(":app", ":feature:home", ":feature:profile")
include(":core:ui", ":core:network", ":core:database")
```
