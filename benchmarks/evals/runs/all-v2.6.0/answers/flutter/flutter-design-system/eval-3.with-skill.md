Assuming a theme-driven Flutter app, define tokens and apply them through `ThemeData`:

```dart
class VTypography {
  static const sectionHeading = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.bold,
  );
}

class VColors {
  static const textPrimary = Color(0xFF1A1A1A);
}
```

Configure the theme with `VTypography.sectionHeading` and `VColors.textPrimary`, then render:

```dart
Text(
  'Section heading',
  style: Theme.of(context).textTheme.headlineSmall,
)
```

Keep `24` and `#1A1A1A` in design tokens—not inline `TextStyle` values or magic numbers. Apply the same DLS approach to spacing via `SizedBox`, and prefer available components such as `VButton` over `ElevatedButton`.
