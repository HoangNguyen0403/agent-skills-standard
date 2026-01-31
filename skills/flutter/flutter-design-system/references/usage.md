# Flutter Design System Usage Patterns

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

✅ **Enforced**:

```dart
Text('Title', style: VTypography.heading6)
Text('Body', style: theme.textTheme.bodyMedium)
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
