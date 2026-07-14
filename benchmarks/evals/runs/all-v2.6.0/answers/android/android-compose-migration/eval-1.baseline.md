# Starting an XML-to-Compose migration

Start incrementally rather than rewriting the entire app at once:

1. Enable Compose in the app module and add the Compose BOM plus the UI, Material (or Material 3), activity, and tooling dependencies. Use the Compose compiler plugin/version compatible with the project's Kotlin version.
2. Pick one screen or one reusable component. Inventory its inputs, outputs, state, accessibility behavior, and resource usage before converting it.
3. Replace XML containers and widgets with Compose equivalents: `Column`/`Row`/`Box` for layouts, `Text`, `Button`, `TextField`, `Image`, and `LazyColumn` for lists. Express sizing, padding, alignment, and click behavior with `Modifier`.
4. Host the converted content with `setContent` in a Compose activity, or with a `ComposeView` when the surrounding screen is still View-based.
5. Keep state outside leaf composables where practical. Pass state and event callbacks down, hoist state upward, and collect ViewModel `Flow`s with `collectAsStateWithLifecycle()`.
6. Recreate the app theme, strings, dimensions, colors, semantics, and test coverage. Add `@Preview`s and screenshot/UI tests as useful checks during conversion.

For a first incremental component, the key shape is:

```kotlin
@Composable
fun ProfileHeader(name: String, onEdit: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(name, modifier = Modifier.weight(1f))
        Button(onClick = onEdit) { Text("Edit") }
    }
}
```

Do not mechanically translate every XML attribute one-for-one. First preserve the screen's behavior and state contract, then use Compose's layout, theming, and state APIs to simplify the implementation.

