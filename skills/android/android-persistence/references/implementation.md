# Persistence Implementation (Room)

## Database Setup

```kotlin
@Database(entities = [PostEntity::class], version = 1)
abstract class AppDatabase : RoomDatabase() {
    abstract fun dao(): FeedDao
}
```

## DAO (Coroutines)

```kotlin
@Dao
interface FeedDao {
    @Query("SELECT * FROM posts")
    fun getAll(): Flow<List<PostEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(posts: List<PostEntity>)
}
```

## Type Converters (e.g., Dates)

```kotlin
class DateConverter {
    @TypeConverter
    fun fromTimestamp(value: Long?): Date? = value?.let { Date(it) }

    @TypeConverter
    fun dateToTimestamp(date: Date?): Long? = date?.time
}
```

## UserDao with Transactions

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

## DataStore Migration

```kotlin
val Context.settingsDataStore by preferencesDataStore(name = "settings")

// Read
val darkMode: Flow<Boolean> = settingsDataStore.data
    .map { prefs -> prefs[DARK_MODE_KEY] ?: false }
```
