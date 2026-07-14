Use the design token for 8 px spacing between items:

```dart
ListView.separated(
  itemCount: items.length,
  separatorBuilder: (_, __) => const SizedBox(height: VSpacing.s8),
  itemBuilder: (_, index) => buildItem(items[index]),
);
```

Assumption: the project defines `VSpacing.s8` as the 8-pixel token. Avoid a hardcoded `8` magic number.
