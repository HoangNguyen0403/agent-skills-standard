Use a plural resource instead of hardcoding the sentence:

```xml
<!-- res/values/strings.xml -->
<plurals name="cart_items">
    <item quantity="one">You have 1 item in your cart</item>
    <item quantity="other">You have %d items in your cart</item>
</plurals>
```

In Jetpack Compose:

```kotlin
Text(stringResource(R.plurals.cart_items, itemCount, itemCount))
```

For non-Compose code:

```kotlin
resources.getQuantityString(R.plurals.cart_items, itemCount, itemCount)
```

Keep all UI text in `strings.xml`; use formatting arguments such as `%d` or `%s`, never string concatenation. Add localized plural resources in each language’s `values-*` directory.
