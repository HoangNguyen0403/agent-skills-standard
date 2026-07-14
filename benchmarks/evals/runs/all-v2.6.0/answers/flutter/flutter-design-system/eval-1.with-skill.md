Assuming the checkout screen uses a theme-driven Flutter DLS with `VButton`, `VColors`, and `VSpacing`:

```dart
VButton(
  label: 'Confirm',
  onPressed: _confirmCheckout,
  backgroundColor: VColors.error,
  foregroundColor: VColors.onError,
  textStyle: Theme.of(context).textTheme.labelLarge, // configured to 16px
)
```

Add it with tokenized spacing:

```dart
Column(
  children: [
    // Checkout content
    SizedBox(height: VSpacing.md),
    VButton(
      label: 'Confirm',
      onPressed: _confirmCheckout,
      backgroundColor: VColors.error,
      foregroundColor: VColors.onError,
      textStyle: Theme.of(context).textTheme.labelLarge,
    ),
  ],
)
```

Configure the theme’s button typography to `16` rather than using an inline `TextStyle` or a magic number in the screen. If `VButton` is unavailable, use a themed `ElevatedButton` instead; avoid `Colors.red`, raw spacing values, and unstyled `ElevatedButton` defaults.
