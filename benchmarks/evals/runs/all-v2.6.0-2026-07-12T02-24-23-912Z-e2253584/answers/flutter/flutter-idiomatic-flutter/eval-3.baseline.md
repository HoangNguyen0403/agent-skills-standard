For spacing *between* siblings, use `SizedBox` rather than wrapping every widget in `Padding`:

```dart
Column(
  crossAxisAlignment: CrossAxisAlignment.start,
  children: const [
    Text('Email'),
    SizedBox(height: 16),
    TextField(),
    SizedBox(height: 16),
    Text('Password'),
  ],
)
```

Reserve `Padding` for inset space around a child or around an entire section, for example `Padding(padding: const EdgeInsets.all(16), child: ...)`. Mark static values `const` to avoid unnecessary object creation.

For a shared design-system value, define a named constant so the intent is clear and the value can change in one place:

```dart
abstract final class AppSpacing {
  static const double md = 16;
}

const SizedBox(height: AppSpacing.md);
```

Use horizontal `SizedBox(width: AppSpacing.md)` in rows. This keeps layout structure readable and makes the distinction between sibling gaps and container insets explicit.

