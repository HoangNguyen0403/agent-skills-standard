---
name: android-persistence
description: "Implement Room database schemas and DataStore preferences with proper async patterns in Android. Use when defining Room entities, DAOs, migrations, or replacing SharedPreferences with DataStore. (triggers: **/*Dao.kt, **/*Database.kt, **/*Entity.kt, @Dao, @Entity, RoomDatabase)"
---

# Android Persistence Standards

## **Priority: P0**

## 1. Configure Room Database

- Return `Flow<List<T>>` for queries, use `suspend` for Write/Insert.
- Keep `@Entity` data classes simple. Map to Domain models in Repository.
- Use `@Transaction` for multi-table queries (Relations).

```kotlin
@Dao
interface UserDao {
    @Query("SELECT * FROM users WHERE active = 1")
    fun observeActiveUsers(): Flow<List<UserEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(user: UserEntity)

    @Transaction
    @Query("SELECT * FROM users WHERE id = :userId")
    fun getUserWithPosts(userId: String): Flow<UserWithPosts>
}
```

## 2. Migrate to DataStore

- Replace `SharedPreferences` with `ProtoDataStore` (type-safe) or `PreferencesDataStore`.
- Inject singleton DataStore instance via Hilt.

```kotlin
val Context.settingsDataStore by preferencesDataStore(name = "settings")

// Read
val darkMode: Flow<Boolean> = settingsDataStore.data
    .map { prefs -> prefs[DARK_MODE_KEY] ?: false }
```

## Anti-Patterns

- **No IO on Main Thread**: Room handles dispatchers, but verify Flow is collected off-main.
- **No @Entity in UI Layer**: Map to Domain or UI models in Repository.

## References

- [DAO Templates](references/implementation.md)
