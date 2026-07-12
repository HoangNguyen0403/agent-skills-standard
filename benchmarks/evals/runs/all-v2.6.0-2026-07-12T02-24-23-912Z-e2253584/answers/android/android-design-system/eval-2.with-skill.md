# Defining typography in Material 3 Compose

Define typography in `ui/theme/Type.kt`, give the app’s text styles names through the Material 3 `Typography` slots, and consume those slots from `MaterialTheme`.

```kotlin
// ui/theme/Type.kt
package com.example.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.sp

val AppTypography = Typography(
    headlineLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontSize = 32.sp,
        lineHeight = 40.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontSize = 16.sp,
        lineHeight = 24.sp,
    ),
)
```

Install it once in the app theme:

```kotlin
MaterialTheme(
    colorScheme = colors,
    typography = AppTypography,
    content = content,
)
```

Use the Material role in a composable instead of supplying an inline `fontSize`, `fontWeight`, or `TextStyle`:

```kotlin
@Composable
fun WelcomeTitle() {
    Text(
        text = "Welcome",
        style = MaterialTheme.typography.headlineLarge,
    )
}
```

The raw type values belong in the theme definition, where they can be changed consistently. Map each app text treatment to an appropriate `Typography` slot, and use named `dp` spacing tokens for layout rather than unexplained numeric gaps.

