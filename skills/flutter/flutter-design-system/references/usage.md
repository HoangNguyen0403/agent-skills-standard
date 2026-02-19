# Flutter Design System Usage Patterns

## 0. Context Discovery

Before choosing a token, investigate the root configuration:

```dart
// Check main.dart
MaterialApp(
  theme: VThemeData.light().toThemeData(), // ← This tells you to use theme.textTheme
  ...
)
```

## 1. Mandatory Token Usage

### Colors

❌ **Forbidden**:

```dart
Color(0xFF2196F3)
Colors.blue
```

✅ **Enforced**:

```dart
VColors.primary      // Modular DLS
AppColors.primary    // Monolithic DLS
context.theme.primaryColor
```

### Spacing

❌ **Forbidden**:

```dart
SizedBox(height: 16)
EdgeInsets.all(24)
```

✅ **Enforced**:

```dart
SizedBox(height: VSpacing.md)
EdgeInsets.all(VSpacing.lg)
```

### Typography

❌ **Forbidden**:

```dart
TextStyle(fontSize: 20, fontWeight: FontWeight.bold)
```

✅ **Enforced (Preferred for UI)**:

```dart
// Always prefer theme from context for dynamic Dark/Light mode support
final theme = Theme.of(context);
Text('Title', style: theme.textTheme.headlineSmall)
Text('Body', style: theme.textTheme.bodyMedium)
```

⚠️ **Static Tokens (Internal/Theme Definition only)**:

```dart
// Use only if context is unavailable or defining the theme itself
import 'package:v_dls/v_dls.dart';
VTypography.heading6
```

### Borders

❌ **Forbidden**: `BorderRadius.circular(8)`
✅ **Enforced**: `VBorders.radiusMd`, `AppTheme.borderRadius`

## 2. Component Preference

❌ **Avoid**: `ElevatedButton(...)`
✅ **Preferred**: `VButton.primary(...)`

## 3. Detection Examples

**Modular DLS**:

```dart
import 'package:v_dls/v_dls.dart';
VColors.primary500
VSpacing.md
```

**Monolithic DLS**:

```dart
import 'package:myapp/theme/app_colors.dart';
AppColors.primary
```
