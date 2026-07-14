Use a DAO method whose return type is a Kotlin `Flow`. Room observes the tables referenced by the query, runs the query once for the initial value, and re-runs it when an invalidating write occurs.

```kotlin
@Entity(tableName = "products")
data class Product(
    @PrimaryKey val id: Long,
    val name: String,
    val priceCents: Int,
    val inStock: Boolean
)

@Dao
interface ProductDao {
    @Query("SELECT * FROM products ORDER BY name")
    fun observeProducts(): Flow<List<Product>>

    @Query("SELECT * FROM products WHERE id = :id")
    fun observeProduct(id: Long): Flow<Product?>

    @Upsert
    suspend fun upsert(product: Product)

    @Query("DELETE FROM products WHERE id = :id")
    suspend fun deleteById(id: Long)
}

@Database(entities = [Product::class], version = 1, exportSchema = true)
abstract class AppDatabase : RoomDatabase() {
    abstract fun productDao(): ProductDao
}
```

Create the database as a singleton, then expose the DAO through a repository. Do not collect the flow on the main thread yourself; Room's suspend and Flow APIs are designed to perform database work asynchronously.

```kotlin
class ProductRepository(private val dao: ProductDao) {
    val products: Flow<List<Product>> = dao.observeProducts()

    suspend fun save(product: Product) = dao.upsert(product)
}

class ProductViewModel(repository: ProductRepository) : ViewModel() {
    val products: StateFlow<List<Product>> = repository.products
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = emptyList()
        )
}
```

With Compose, collect it using a lifecycle-aware collector, for example `products.collectAsStateWithLifecycle()`. In a Fragment, use `repeatOnLifecycle` and collect inside the launched block.

Any successful insert, update, upsert, or delete that changes the `products` table invalidates the query and causes a new list to be emitted. If a query joins several tables, Room observes all tables referenced by that query. For a multi-step change that must appear atomically, perform the writes in a DAO method annotated with `@Transaction`. Add migrations when the schema changes; do not use destructive migration in production unless losing local data is acceptable.

