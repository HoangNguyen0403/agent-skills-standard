# Kotlin Best Practices — Examples

## Backing Property Pattern

```kotlin
class ProductViewModel : ViewModel() {
    // Private mutable — internal mutations only
    private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
    // Public immutable — exposed to UI
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    private val _products = MutableStateFlow<List<Product>>(emptyList())
    val products: StateFlow<List<Product>> = _products.asStateFlow()
}
```

## Scope Functions — Correct Usage

```kotlin
// apply: configure an object (returns object)
val request = HttpRequest().apply {
    method = "POST"
    timeout = 30_000
    headers["Authorization"] = "Bearer $token"
}

// let: null-safe transformation (returns result)
val uppercased = name?.let { it.uppercase() } ?: "ANONYMOUS"

// also: side effect without breaking chain (returns object)
val user = userRepo.findById(id)
    .also { logger.info("Fetched user: ${it?.id}") }

// run: scoped computation (returns result)
val summary = user.run {
    "${name} has ${orders.size} orders totalling ${orders.sumOf { it.total }}"
}
```

## Read-Only Collection Exposure

```kotlin
class CartRepository {
    // Internal mutable, external read-only
    private val _items = mutableListOf<CartItem>()
    val items: List<CartItem> get() = _items

    fun add(item: CartItem) {
        _items.add(item)
    }
}
```

## runCatching for Error Handling

```kotlin
fun fetchUser(id: String): Result<User> = runCatching {
    api.getUser(id)
}.onFailure { e ->
    logger.error("Failed to fetch user $id", e)
}
```
