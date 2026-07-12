# Handling colors in Jetpack Compose

Move the raw color into the theme layer, assign it to a Material 3 semantic role, and read that role from `MaterialTheme` in the composable.

```kotlin
// ui/theme/Color.kt
package com.example.ui.theme

import androidx.compose.ui.graphics.Color

private val Purple40 = Color(0xFF6650A4)
private val Purple80 = Color(0xFFD0BCFF)

val LightColors = lightColorScheme(
    primary = Purple40,
)

val DarkColors = darkColorScheme(
    primary = Purple80,
)
```

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

Then use the semantic token, not `Color(0xFF...)`, inside the UI:

```kotlin
@Composable
fun PrimaryAction() {
    Button(
        onClick = {},
        colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.primary,
        ),
    ) {
        Text("Continue")
    }
}
```

This keeps the composable independent of a particular palette and lets the same semantic role resolve correctly in light and dark themes. Apply the same approach to every custom color: define it once as a palette token and map it to an appropriate `lightColorScheme`/`darkColorScheme` slot.

