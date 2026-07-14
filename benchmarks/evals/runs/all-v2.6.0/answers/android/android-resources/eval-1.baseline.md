Use an Android `<plurals>` resource instead of a normal string:

```xml
<plurals name="cart_items">
    <item quantity="one">%d item in your cart</item>
    <item quantity="other">%d items in your cart</item>
</plurals>
```

Then retrieve it with the quantity:

```kotlin
val message = resources.getQuantityString(
    R.plurals.cart_items,
    itemCount,
    itemCount
)
```

For `itemCount = 1`, this produces `1 item in your cart`; for `itemCount = 2`, `2 items in your cart`. Add other quantities such as `zero` only when the language requires distinct wording.
