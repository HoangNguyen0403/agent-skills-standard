# Runtime ViewModel parameters

For a parameter known only when the ViewModel is created, use assisted injection rather than field injection:

```kotlin
@HiltViewModel(assistedFactory = ProductViewModel.Factory::class)
class ProductViewModel @AssistedInject constructor(
    private val repository: ProductRepository,
    @Assisted private val productId: String
) : ViewModel() {

    @AssistedFactory
    interface Factory {
        fun create(productId: String): ProductViewModel
    }
}
```

Pass the runtime value through the generated assisted factory at the call site (for example, with the `creationCallback` of Compose `hiltViewModel`):

```kotlin
val viewModel: ProductViewModel = hiltViewModel(
    creationCallback = { factory: ProductViewModel.Factory ->
        factory.create(productId)
    }
)
```

Hilt supplies `ProductRepository`; the caller supplies `productId`. If the ID is a Navigation argument, a `@HiltViewModel` with an injected `SavedStateHandle` is often preferable because the argument is restored automatically:

```kotlin
@HiltViewModel
class ProductViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: ProductRepository
) : ViewModel() {
    private val productId: String = checkNotNull(savedStateHandle["productId"])
}
```

