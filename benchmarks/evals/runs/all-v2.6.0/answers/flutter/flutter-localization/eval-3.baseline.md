Use your localization package’s plural support instead of manual if/else strings.

Example with `intl`/ARB:

```json
{
  "cartItems": "{count, plural, =0{No items} =1{1 item} other{{count} items}}"
}
```

Then in Flutter:

```dart
Text(AppLocalizations.of(context)!.cartItems(itemCount))
```

That gives you correct output like:

- `0` → `No items`
- `1` → `1 item`
- `3` → `3 items`

Plural rules also adapt better for other languages than hardcoded English logic.

