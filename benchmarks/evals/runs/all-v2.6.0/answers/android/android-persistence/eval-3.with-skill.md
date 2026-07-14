# Answer

Technically a ViewModel can receive a `@Entity`, but it should not make the entity part of the UI contract. Keep Room entities simple and map them to domain or UI models in the repository. This prevents database column names, annotations, persistence-only fields, and schema changes from leaking into the ViewModel and composables/views.

```kotlin
@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey val id: String,
    val name: String,
    val priceCents: Long,
)

data class Product(
    val id: String,
    val displayName: String,
    val formattedPrice: String,
)

@Dao
interface ProductDao {
    @Query("SELECT * FROM products ORDER BY name")
    fun observeProducts(): Flow<List<ProductEntity>>
}

class ProductRepository(
    private val dao: ProductDao,
) {
    fun observeProducts(): Flow<List<Product>> =
        dao.observeProducts().map { rows ->
            rows.map { row ->
                Product(
                    id = row.id,
                    displayName = row.name,
                    formattedPrice = formatPrice(row.priceCents),
                )
            }
        }
}

@HiltViewModel
class ProductViewModel @Inject constructor(
    repository: ProductRepository,
) : ViewModel() {
    val products: StateFlow<List<Product>> = repository.observeProducts()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = emptyList(),
        )
}
```

The DAO may use `Flow<List<ProductEntity>>` because it is the persistence boundary, but the repository should own conversion in both directions. UI writes should send a domain command/model to the repository, which maps it to an entity and calls a `suspend` DAO method.

