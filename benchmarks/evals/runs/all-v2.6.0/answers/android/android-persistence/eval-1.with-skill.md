# Answer

Return a `Flow` from the DAO query. Room tracks the tables referenced by the query and re-runs it when those tables are invalidated, so callers receive the initial rows and later updates without manually refreshing.

```kotlin
@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey val id: String,
    val name: String,
    val priceCents: Long,
)

@Dao
interface ProductDao {
    @Query("SELECT * FROM products ORDER BY name")
    fun observeProducts(): Flow<List<ProductEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(product: ProductEntity)

    @Query("DELETE FROM products WHERE id = :id")
    suspend fun deleteById(id: String)
}

@Database(entities = [ProductEntity::class], version = 1)
abstract class AppDatabase : RoomDatabase() {
    abstract fun productDao(): ProductDao
}
```

Expose the DAO through a repository and map entities to domain models there rather than exposing database rows to the UI:

```kotlin
class ProductRepository(
    private val dao: ProductDao,
) {
    fun observeProducts(): Flow<List<Product>> =
        dao.observeProducts()
            .map { rows -> rows.map { Product(it.id, it.name, it.priceCents) } }
            .flowOn(Dispatchers.IO)
}
```

The database should be a singleton (normally provided through Hilt), and writes should remain `suspend`. Do not enable `allowMainThreadQueries`; Room performs database work asynchronously, while `flowOn(Dispatchers.IO)` makes the repository’s upstream collection boundary explicit.

