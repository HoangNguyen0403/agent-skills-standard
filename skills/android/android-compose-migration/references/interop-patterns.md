# Compose Interop Patterns

## View → Composable Mapping

| XML View | Compose Equivalent |
|----------|-------------------|
| `LinearLayout (vertical)` | `Column` |
| `LinearLayout (horizontal)` | `Row` |
| `FrameLayout` | `Box` |
| `ConstraintLayout` | `ConstraintLayout` (Compose) or `Column`/`Row` |
| `RecyclerView` | `LazyColumn` / `LazyRow` |
| `TextView` | `Text` |
| `ImageView` | `Image` or `AsyncImage` (Coil) |
| `Button` | `Button` / `TextButton` / `OutlinedButton` |
| `EditText` | `TextField` / `OutlinedTextField` |

## Adding Compose in Views (ComposeView)

Use when migrating incrementally — host Compose inside an existing Fragment or Activity.

```kotlin
// In a Fragment
class MyFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        return ComposeView(requireContext()).apply {
            setViewCompositionStrategy(
                ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed
            )
            setContent {
                MyAppTheme {
                    MyComposableScreen()
                }
            }
        }
    }
}
```

### Important

- Always set `ViewCompositionStrategy` to avoid memory leaks.
- Use `DisposeOnViewTreeLifecycleDestroyed` for Fragments.
- Use `DisposeOnDetachedFromWindow` for RecyclerView items.

## Adding Views in Compose (AndroidView)

Use when a Compose screen needs a View that has no Compose equivalent yet.

```kotlin
@Composable
fun MapViewComposable(modifier: Modifier = Modifier) {
    AndroidView(
        factory = { context ->
            MapView(context).apply {
                // Initialize the View
            }
        },
        update = { mapView ->
            // Called on recomposition — update the View with new state
        },
        modifier = modifier
    )
}
```

### Important

- `factory` runs once. `update` runs on every recomposition.
- Do NOT create new View instances in `update` — only mutate the existing one.
- For complex Views, consider wrapping in a `remember` block.

## Sharing theme between XML and Compose

```kotlin
// Wrap Compose content with XML theme bridge
setContent {
    // MdcTheme bridges Material Components XML theme to Compose M3
    MdcTheme {
        MyComposableScreen()
    }
}
```

Requires: `com.google.android.material:compose-theme-adapter-3`
