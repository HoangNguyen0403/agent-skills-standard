# V DLS Modular Pattern (IDEAL Architecture)

**Based on:** `/Users/nguyenhuyhoang/FlutterProject/C3/flutter-temp/packages/v_dls`

This represents the **gold standard** for Flutter DLS architecture.

## Package Structure

```
packages/v_dls/
├── lib/
│   ├── v_dls.dart (main export)
│   └── src/
│       ├── foundation/
│       │   ├── colors.dart (148 tokens)
│       │   ├── spacing.dart (13 tokens)
│       │   ├── typography.dart (191 lines, 20+ styles)
│       │   ├── borders.dart (127 lines)
│       │   ├── shadows.dart
│       │   ├── animations.dart
│       │   └── breakpoints.dart
│       ├── components/
│       │   ├── buttons/v_button.dart (416 lines, ZERO hardcoded!)
│       │   ├── inputs/v_text_field.dart
│       │   ├── layout/v_card.dart
│       │   └── ... (34 components)
│       ├── theme/
│       │   └── v_theme_data.dart (400 lines)
│       └── utils/
│           └── accessibility.dart
└── test/ (unit tests for each foundation file)
```

## Foundation Tokens

### Colors (148 tokens) - `VColors`

```dart
// Material Design scale (50-900)
VColors.primary50 through primary900
VColors.secondary50 through secondary900

// Semantic colors
VColors.success, VColors.error, VColors.warning, VColors.info

// Neutrals
VColors.gray50 through gray900

// Surface & Background
VColors.background, VColors.surface, VColors.surfaceVariant

// Dark mode
VColors.darkBackground, VColors.darkSurface
```

### Spacing (13 levels) - `VSpacing`

```dart
VSpacing.none     // 0px
VSpacing.xxs      // 2px
VSpacing.xs       // 4px
VSpacing.sm       // 8px
VSpacing.smMd     // 12px
VSpacing.md       // 16px ← Base unit
VSpacing.mdLg     // 20px
VSpacing.lg       // 24px
VSpacing.xl       // 32px
VSpacing.xxl      // 40px
VSpacing.xxxl     // 48px
VSpacing.huge     // 64px
VSpacing.massive  // 128px
```

### Typography - `VTypography`

```dart
// Font families
VTypography.fontFamilyPrimary   // SF Pro Display
VTypography.fontFamilySecondary // SF Pro Text
VTypography.fontFamilyMono      // SF Mono

// Headings (6 levels)
VTypography.heading1 to heading6

// Body text (3 sizes)
VTypography.bodyLarge, bodyMedium, bodySmall

// Buttons (3 sizes)
VTypography.buttonLarge, buttonMedium, buttonSmall

// Labels (3 sizes)
VTypography.labelLarge, labelMedium, labelSmall

// Specialized
VTypography.caption, overline, code
```

### Borders - `VBorders`

```dart
// Radius
VBorders.radiusMd, radiusLg, radiusXl, radiusFull

// Widths
VBorders.widthThin, widthMedium, widthThick

// Shaped borders
VBorders.rectangleMd, rectangleLg, rectangleXl

// Input borders
VBorders.inputDefault, inputFocused, inputError, inputDisabled
```

## Perfect Component Example

From `components/buttons/v_button.dart` (416 lines, **ZERO hardcoded values**):

```dart
import 'package:v_dls/src/foundation/borders.dart';
import 'package:v_dls/src/foundation/spacing.dart';
import 'package:v_dls/src/foundation/typography.dart';

class VButton extends StatelessWidget {
  final VButtonVariant variant;
  final VButtonSize size;

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      style: ElevatedButton.styleFrom(
        // ✅ Color from theme
        backgroundColor: theme.colorScheme.primary,
        foregroundColor: theme.colorScheme.onPrimary,

        // ✅ Spacing from tokens
        padding: EdgeInsets.symmetric(
          horizontal: VSpacing.lg,    // 24px
          vertical: VSpacing.smMd,    // 12px
        ),

        // ✅ Border from tokens
        shape: VBorders.rectangleMd,  // 8px radius

        // ✅ Typography from tokens
        textStyle: VTypography.buttonMedium,
      ),
      child: content,
    );
  }
}

// Usage
VButton.primary(
  onPressed: () {},
  child: Text('Click Me'),
)
```

## Key Principles

1. **Modular Separation**: Each foundation aspect in its own file
2. **Semantic Naming**: `primary500`, not `blue600`
3. **Scale Coverage**: Complete 50-900 scales for colors
4. **Component Encapsulation**: All DLS logic in components, not in app code
5. **Zero Hardcoding**: 416-line component with ZERO magic numbers

## When to Use This Pattern

- ✅ **Large teams**: Multiple developers need consistent design
- ✅ **Design system exists**: Have Figma/design tokens to implement
- ✅ **Scalability**: Planning for 50+ screens
- ✅ **Multi-app**: Sharing DLS across multiple apps

## Migration from Monolithic

If you have `app_theme.dart` + `app_colors.dart`:

1. Create `packages/your_dls/` structure
2. Move colors to `foundation/colors.dart`
3. Expand spacing from 3 → 13 tokens (follow VSpacing scale)
4. Extract typography to `foundation/typography.dart`
5. Create component wrappers (`YourButton` extends `ElevatedButton`)

This is the **ideal end-state** for Flutter DLS architecture.
