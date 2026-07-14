# Typography in Material 3 Compose

Define typography once as a Material 3 `Typography` value, provide it from the app theme, and use its named styles from `MaterialTheme.typography`. The named slots are semantic roles, not screen-specific formatting.

```kotlin
// Type.kt
private val AppFontFamily = FontFamily(
    Font(R.font.app_regular, FontWeight.Normal),
    Font(R.font.app_medium, FontWeight.Medium),
    Font(R.font.app_bold, FontWeight.Bold),
)

val AppTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = AppFontFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 57.sp,
        lineHeight = 64.sp,
    ),
    headlineSmall = TextStyle(
        fontFamily = AppFontFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 24.sp,
        lineHeight = 32.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = AppFontFamily,
        fontSize = 16.sp,
        lineHeight = 24.sp,
    ),
    labelLarge = TextStyle(
        fontFamily = AppFontFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp,
    ),
)
```

Supply it through `MaterialTheme`:

```kotlin
MaterialTheme(
    colorScheme = colorScheme,
    typography = AppTypography,
    content = content,
)
```

Then select the appropriate role at the call site:

```kotlin
Text(
    text = "Account settings",
    style = MaterialTheme.typography.headlineSmall,
)
Text(
    text = description,
    style = MaterialTheme.typography.bodyLarge,
)
```

Import `androidx.compose.material3.Typography` and `TextStyle`, use `sp` for text sizes, and load bundled fonts from `res/font` when a custom family is required. Customize only the slots the product needs; the other Material 3 defaults remain available. A one-off adjustment should normally use `copy(...)` at the call site, while a repeated pattern belongs in the theme or a reusable composable. Configure accessibility-sensitive behavior such as scaling and line height deliberately, and avoid using typography roles solely because their default size happens to look right.

