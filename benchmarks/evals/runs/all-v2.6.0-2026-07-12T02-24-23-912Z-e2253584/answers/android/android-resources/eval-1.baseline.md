Use a plural resource with `<plurals>` rather than hard-coding a singular sentence or branching in Kotlin. Android selects the correct quantity form through `getQuantityString()` and supports locale-specific plural rules.

```xml
<plurals name="cart_items">
    <item quantity="one">You have 1 item in your cart</item>
    <item quantity="other">You have %d items in your cart</item>
</plurals>
```

Retrieve it with the quantity you are displaying:

```kotlin
val message = resources.getQuantityString(
    R.plurals.cart_items,
    itemCount,
    itemCount
)
```

The first `itemCount` is used for plural-rule selection; the second supplies the `%d` format argument. For example, `1` uses the `one` form and `5` uses `other`. Keep the number as a format argument instead of concatenating it, because translators may need to move it or use a different form. Include the quantity categories required by Android/locales—usually `one` and `other`, but some languages need `zero`, `two`, `few`, or `many`—and test with zero, one, and representative larger values.

