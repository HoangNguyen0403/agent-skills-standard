Target SDK 35 enables edge-to-edge behavior, so a bottom-aligned button can draw under the navigation bar unless it applies insets.

Enable edge-to-edge in each Activity before `setContent`:

```kotlin
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { App() }
    }
}
```

If the button is part of a `Scaffold`, pass the Scaffold padding to the content instead of adding another inset source:

```kotlin
Scaffold { innerPadding ->
    Column(Modifier.padding(innerPadding)) {
        // screen content
        Button(onClick = { /* ... */ }) { Text("Continue") }
    }
}
```

For a button outside `Scaffold`, apply `Modifier.safeDrawingPadding()` (or the appropriate navigation-bar window inset) to the bottom-aligned container. If the button opens the keyboard, also set `android:windowSoftInputMode="adjustResize"` and handle IME insets with `imePadding()` on the content container. Do not apply the same inset twice.

