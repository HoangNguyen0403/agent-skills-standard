# Kotlin Language — Examples

## Sealed Interface + When Expression

```kotlin
sealed interface UiState {
    data object Loading : UiState
    data class Success(val data: List<Product>) : UiState
    data class Error(val message: String) : UiState
}

// Exhaustive — compiler enforces all branches
fun render(state: UiState) = when (state) {
    UiState.Loading -> showLoading()
    is UiState.Success -> showData(state.data)   // Smart cast
    is UiState.Error -> showError(state.message)
}
```

## Null Safety

```kotlin
// Safe call + Elvis — preferred over !!
val city: String = user?.address?.city ?: "Unknown"

// requireNotNull for internal assertions
fun process(input: String?) {
    val value = requireNotNull(input) { "input must not be null" }
    // value is non-null String here
}

// Never use !! in production
// BAD: user!!.address!!.city  → NullPointerException at runtime
```

## Extension Functions

```kotlin
// Keep private if module-specific
private fun String.toSlug(): String =
    this.lowercase().trim().replace(Regex("[^a-z0-9]+"), "-")

// Extension on nullable type
fun String?.orDefault(default: String) = this?.takeIf { it.isNotBlank() } ?: default
```

## data class for DTOs

```kotlin
data class ProductDto(
    val id: String,
    val name: String,
    val price: Double,
    val category: String
) {
    // Named arguments prevent parameter order mistakes
    companion object {
        fun from(product: Product) = ProductDto(
            id = product.id,
            name = product.name,
            price = product.price,
            category = product.category.name
        )
    }
}
```
