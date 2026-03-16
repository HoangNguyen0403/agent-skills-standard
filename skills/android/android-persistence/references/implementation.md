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
