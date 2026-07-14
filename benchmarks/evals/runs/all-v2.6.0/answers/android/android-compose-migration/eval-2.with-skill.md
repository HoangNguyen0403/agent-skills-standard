# Hosting Compose in an existing Fragment

For incremental migration, keep the Fragment and replace one XML region with a `ComposeView`. If the XML already contains a Compose container, configure it in `onViewCreated`:

```kotlin
override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
    super.onViewCreated(view, savedInstanceState)

    binding.composeContent.apply {
        setViewCompositionStrategy(
            ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed
        )
        setContent {
            AppTheme {
                DetailsScreen(
                    state = viewModel.uiState.collectAsStateWithLifecycle().value,
                    onAction = viewModel::onAction,
                )
            }
        }
    }
}
```

The XML container can be as small as:

```xml
<androidx.compose.ui.platform.ComposeView
    android:id="@+id/composeContent"
    android:layout_width="match_parent"
    android:layout_height="wrap_content" />
```

Alternatively, return a `ComposeView` directly from `onCreateView` when the entire Fragment view is the migrated surface:

```kotlin
override fun onCreateView(
    inflater: LayoutInflater,
    container: ViewGroup?,
    savedInstanceState: Bundle?,
): View = ComposeView(requireContext()).apply {
    setViewCompositionStrategy(
        ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed
    )
    setContent { AppTheme { DetailsScreen(/* state and callbacks */) } }
}
```

Keep business state in the existing `ViewModel` and pass state/callbacks into the Composable. Use `AndroidView` only for legacy Views that remain inside a Compose hierarchy, and mutate the existing View in `update` rather than creating a new one. Add a `@Preview`, compare against the XML baseline, and run `./gradlew build`. The lifecycle composition strategy is required to avoid retaining the Fragment’s view after its view lifecycle is destroyed.

