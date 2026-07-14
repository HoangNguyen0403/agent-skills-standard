# Hosting Compose in an existing Fragment

Use a `ComposeView` in the Fragment's view hierarchy. It can be declared in the existing XML layout:

```xml
<androidx.compose.ui.platform.ComposeView
    android:id="@+id/composeContent"
    android:layout_width="match_parent"
    android:layout_height="wrap_content" />
```

Then set its content from `onViewCreated` and tie composition disposal to the Fragment view lifecycle:

```kotlin
override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
    super.onViewCreated(view, savedInstanceState)

    view.findViewById<ComposeView>(R.id.composeContent).apply {
        setViewCompositionStrategy(
            ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed
        )
        setContent {
            AppTheme {
                ProfileContent(
                    state = viewModel.uiState.collectAsStateWithLifecycle().value,
                    onAction = viewModel::onAction
                )
            }
        }
    }
}
```

The same pattern can return a `ComposeView` directly from `onCreateView` if the Fragment's entire view is Compose:

```kotlin
override fun onCreateView(
    inflater: LayoutInflater,
    container: ViewGroup?,
    state: Bundle?
): View = ComposeView(requireContext()).apply {
    setViewCompositionStrategy(
        ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed
    )
    setContent { AppTheme { ProfileContent() } }
}
```

Use a ViewModel scoped appropriately to the Fragment or navigation graph, and pass state plus callbacks into composables. The lifecycle-aware disposal strategy is important because a Fragment can outlive its view; it prevents the composition from retaining the destroyed view hierarchy. Avoid holding the `ComposeView` or Fragment view beyond `onDestroyView`, just as with a view binding.

