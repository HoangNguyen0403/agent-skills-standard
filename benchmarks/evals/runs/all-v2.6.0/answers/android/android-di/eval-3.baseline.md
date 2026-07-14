# Inject a runtime value into a Hilt ViewModel

For a value that is genuinely supplied at ViewModel creation time, use Hilt assisted injection. Mark the runtime parameter with `@Assisted`, declare an assisted factory, and reference that factory from `@HiltViewModel`:

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

Create it with the runtime value through the `CreationExtras` callback:

```kotlin
private val viewModel: ProductViewModel by viewModels {
    defaultViewModelCreationExtras
        .withCreationCallback<ProductViewModel.Factory> { factory ->
            factory.create(productId)
        }
}
```

Here `productId` is supplied by the screen, while `ProductRepository` is still resolved by Hilt. The assisted value is not a Hilt-provided singleton and should not be put in a module.

If the ID is a Navigation argument or otherwise belongs to saved screen state, prefer `SavedStateHandle` instead:

```kotlin
@HiltViewModel
class ProductViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: ProductRepository
) : ViewModel() {
    private val productId: String = checkNotNull(savedStateHandle["productId"])
}
```

Navigation supplies that argument through the ViewModel creation extras, and `SavedStateHandle` also supports state restoration. Use assisted injection for a creation-time parameter that is not part of saved/navigation state.

