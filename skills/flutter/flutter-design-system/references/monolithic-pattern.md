# Monolithic Pattern (Growing DLS)

A pragmatic, monolithic approach suitable for growing projects.

## Structure

```
lib/presentation/theme/
├── app_theme.dart (482 lines)
└── app_colors.dart (218 lines)
```

## Characteristics

**Pros:**

- Simple to understand and navigate
- All tokens in 2 files
- Easy to get started

**Cons:**

- Limited spacing tokens (only 3)
- File size growing (700+ lines total)
- Typography mixed with theme config

## Token Examples

### Colors - `AppColors` (218 definitions)

```dart
// Primary palette
AppColors.primary       // #234455
AppColors.primary2      // #204D4C
AppColors.secondary     // #E5EBB1

// Functional colors
AppColors.error
AppColors.warning
AppColors.success

// Grays
AppColors.darkGray
AppColors.lightGray
AppColors.neutralsGrey

// Feature-specific (ad-hoc)
AppColors.comboOffersBg
AppColors.returnStatusBackgroudRed
```

### Spacing - `AppTheme` (only 3!)

```dart
AppTheme.kPadding6   // 6px
AppTheme.kPadding12  // 12px
AppTheme.kPadding24  // 24px
```

**Problem:** Only 3 spacing values forces developers to:

- Use multiples (e.g., `kPadding12 * 2` for 24px)
- Add hardcoded values when needed (defeating the purpose)

**Solution:** Expand to match VSpacing scale (xs, sm, md, lg, xl, etc.)

### Typography - Inline

```dart
// Mixed in AppTheme
AppTheme.kTextH1 = 20.0
AppTheme.kTextH2 = 18.0
AppTheme.kTextH3 = 16.0

// Used with Google Fonts
GoogleFonts.notoSans(fontSize: AppTheme.kTextH1, fontWeight: FontWeight.bold)
```

**Problem:** Typography not fully tokenized, requires manual style composition

## Usage Pattern

```dart
Container(
  color: AppColors.primary,
  padding: EdgeInsets.all(AppTheme.kPadding12),
  child: Text(
    'Title',
    style: GoogleFonts.notoSans(
      fontSize: AppTheme.kTextH1,
      fontWeight: FontWeight.bold,
    ),
  ),
)
```

## When to Use This Pattern

- ✅ **Small/Medium teams**: 1-5 developers
- ✅ **MVP/Prototype**: Quick iteration needed
- ✅ **Simple apps**: <30 screens
- ✅ **Starting DLS**: Growing into full design system

## Evolution Path

1. **Expand spacing tokens** to 8-10 levels
2. **Extract typography** to dedicated class
3. **Add borders/shadows** as dedicated tokens
4. **Migrate to package** (V DLS style) when team grows

This pattern is **valid and pragmatic** for many projects, but should evolve as complexity grows.
