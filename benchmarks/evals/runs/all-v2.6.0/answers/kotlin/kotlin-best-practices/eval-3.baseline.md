Usually return `List<T>` rather than `MutableList<T>` from a repository. This exposes the smallest contract and prevents callers from assuming they may mutate repository-owned state:

```kotlin
suspend fun loadItems(): List<Item> = dataSource.loadItems().toList()
```

Use `toList()` when the source is mutable or its lifetime is not controlled, so later source mutations cannot unexpectedly affect the caller. Kotlin's `List` is read-only rather than deeply immutable, so copy elements too if they are mutable. Return `MutableList` only when mutation is intentionally part of the API contract.
