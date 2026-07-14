# Supporting dark mode with one theme API

Keep palette values in `Color.kt`, map semantic roles separately for light and dark schemes, and choose the scheme once in `Theme.kt`. Composables should only read `MaterialTheme.colorScheme`.

```kotlin
// ui/theme/Color.kt
private val BrandLight = Color(0xFF6750A4)
private val BrandDark = Color(0xFFD0BCFF)
private val OnBrandLight = Color(0xFFFFFFFF)
private val OnBrandDark = Color(0xFF381E72)

val LightColors = lightColorScheme(
    primary = BrandLight,
    onPrimary = OnBrandLight,
)

val DarkColors = darkColorScheme(
    primary = BrandDark,
    onPrimary = OnBrandDark,
)
```

The palette constants are defined once; only the semantic role mapping differs where contrast requires a different tone. Add all app-specific colors to both scheme definitions instead of scattering light/dark checks through screens.

```kotlin
// ui/theme/Theme.kt
@Composable
fun AppTheme(
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

Now every screen automatically follows the selected scheme:

```kotlin
@Composable
fun SurfaceContent() {
    Surface(color = MaterialTheme.colorScheme.background) {
        Text(
            text = "Content",
            color = MaterialTheme.colorScheme.onBackground,
            style = MaterialTheme.typography.bodyLarge,
        )
    }
}
```

`isSystemInDarkTheme()` responds to the system setting, while a caller can pass `darkTheme` explicitly for an in-app preference or preview. The UI remains unchanged because it consumes semantic tokens rather than duplicating color definitions or branching on dark mode.

