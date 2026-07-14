# Supporting dark mode in Compose

Define one light and one dark `ColorScheme`, then choose between them at the theme boundary. Composables should consume `MaterialTheme.colorScheme` roles, so they do not need separate light/dark branches or duplicated color literals.

```kotlin
private val LightColors = lightColorScheme(
    primary = Purple40,
    onPrimary = Color.White,
    background = Color(0xFFFFFBFE),
    onBackground = Color(0xFF1C1B1F),
)

private val DarkColors = darkColorScheme(
    primary = Purple80,
    onPrimary = Color(0xFF381E72),
    background = Color(0xFF1C1B1F),
    onBackground = Color(0xFFE6E1E5),
)

@Composable
fun MyAppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colors = if (darkTheme) DarkColors else LightColors

    MaterialTheme(
        colorScheme = colors,
        typography = AppTypography,
        content = content,
    )
}
```

Use semantic theme roles everywhere:

```kotlin
Surface(
    color = MaterialTheme.colorScheme.background,
    contentColor = MaterialTheme.colorScheme.onBackground,
) {
    Text("Settings")
}
```

The light and dark schemes still need different values where contrast or perceived color requires it, but those values are centralized and each role is defined once per scheme. Keep shared brand constants (for example, `Purple40` and `Purple80`) in the theme files rather than repeating them in UI code. On Android 12 and later, the theme can optionally select `dynamicLightColorScheme(context)` or `dynamicDarkColorScheme(context)` when dynamic color is enabled, with the app schemes as fallback. If you add custom non-Material colors, provide matching light/dark values through a custom `CompositionLocal` or theme extension and read that extension from composables.

