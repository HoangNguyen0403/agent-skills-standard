---
name: Android Design System (Jetpack Compose)
description: Enforce Material Design 3 and design token usage in Jetpack Compose apps.
metadata:
  labels: [android, compose, dls, material-design, design-tokens]
  triggers:
    files: ['**/*Screen.kt', '**/ui/theme/**', '**/compose/**']
    keywords: [MaterialTheme, Color, Typography, Modifier, Composable]
---

# Android Design System (Jetpack Compose)

## **Priority: P2 (OPTIONAL)**

Enforce Material Design 3 tokens in Jetpack Compose. Use `MaterialTheme` for consistency.

## Token Structure

```kotlin
// ui/theme/Color.kt
val Primary = Color(0xFF2196F3)
val Secondary = Color(0xFF9C27B0)
val Background = Color(0xFFFFFFFF)

// ui/theme/Theme.kt
private val LightColorScheme = lightColorScheme(
    primary = Primary,
    secondary = Secondary,
    background = Background
)

// ui/theme/Type.kt
val Typography = Typography(
    headlineLarge = TextStyle(fontSize = 32.sp, fontWeight = FontWeight.Bold),
    bodyMedium = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.Normal)
)
```

## Usage

```kotlin
// ❌ FORBIDDEN
Box(modifier = Modifier.background(Color(0xFF2196F3)))
Text("Title", fontSize = 32.sp, color = Color.Black)

// ✅ ENFORCED
Box(modifier = Modifier.background(MaterialTheme.colorScheme.primary))
Text("Title", style = MaterialTheme.typography.headlineLarge)
Spacer(modifier = Modifier.height(16.dp)) // Use dp units
```

## Anti-Patterns

- **No Hardcoded Colors**: Use `Color(0xFF...)` → Error. Use `MaterialTheme.colorScheme.*`.
- **No Inline Typography**: Define `fontSize = 32.sp` → Error. Use `MaterialTheme.typography.*`.
- **No Magic Spacing**: Use `padding = 16.dp` inline → Acceptable, but consider tokens.

## Related Topics

mobile-ux-core | android/compose
