# Handling colors in Jetpack Compose

Avoid hardcoding `Color` values in individual composables. Define the app's colors as a Material 3 `ColorScheme` in your theme, then read semantic roles through `MaterialTheme.colorScheme`.

```kotlin
// Color.kt
private val LightColors = lightColorScheme(
    primary = Color(0xFF6200EE),
    onPrimary = Color.White,
    secondary = Color(0xFF03DAC6),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFD0BCFF),
    onPrimary = Color(0xFF381E72),
    secondary = Color(0xFF03DAC6),
)
```

Pass the scheme to `MaterialTheme` in one app theme:

```kotlin
@Composable
fun MyAppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        content = content,
    )
}
```

Use semantic roles rather than the raw purple value:

```kotlin
Button(
    colors = ButtonDefaults.buttonColors(
        containerColor = MaterialTheme.colorScheme.primary,
        contentColor = MaterialTheme.colorScheme.onPrimary,
    ),
    onClick = onClick,
) {
    Text("Continue")
}
```

This keeps the UI consistent and lets the same composable work with light, dark, dynamic, or branded themes. If the design system has colors that do not map to Material roles, define them as shared tokens and expose them through a theme extension (often a `CompositionLocal`) instead of declaring them in each screen. Keep contrast pairs such as `onPrimary` together, and use dynamic color on supported Android versions if that is part of the product requirements.

