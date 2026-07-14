Use a pluralized translation entry and call `plural()` with the count.

Example JSON:

```json
{
  "cart": {
    "item_count": {
      "zero": "No items",
      "one": "1 item",
      "other": "{} items"
    }
  }
}
```

Then in Flutter:

```dart
Text('cart.item_count'.plural(cartCount))
```

If you want the number inserted for plural forms:

```dart
Text('cart.item_count'.plural(cartCount, args: ['$cartCount']))
```

That gives you:
- `1 item` when `cartCount == 1`
- `3 items` when `cartCount == 3`

If you use CSV instead of JSON, define the same key with plural variants and still call `plural()` the same way.

