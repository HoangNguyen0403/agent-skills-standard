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
