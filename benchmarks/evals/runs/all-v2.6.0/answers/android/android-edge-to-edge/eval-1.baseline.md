Targeting SDK 35 enables edge-to-edge behavior, so your content can extend beneath the navigation bar. Apply the navigation-bar inset to the bottom action, and make sure the window is configured for edge-to-edge:

```kotlin
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { App() }
    }
}

Button(
    onClick = { /* ... */ },
    modifier = Modifier.navigationBarsPadding()
) {
    Text("Continue")
}
```

If the button is in a `Scaffold`, apply the `innerPadding` supplied to the content instead, or use `contentWindowInsets = WindowInsets.safeDrawing`; do not apply the same bottom inset twice.

