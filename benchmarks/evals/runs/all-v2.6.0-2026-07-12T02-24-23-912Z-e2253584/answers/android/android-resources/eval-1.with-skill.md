Use an Android `plurals` resource rather than storing one sentence and changing it in Kotlin. Put both grammatical forms in `res/values/strings.xml`:

```xml
<resources>
    <plurals name="cart_items_count">
        <item quantity="one">You have %d item in your cart</item>
        <item quantity="other">You have %d items in your cart</item>
    </plurals>
</resources>
```

In Jetpack Compose, retrieve it with the plural-aware API and pass the count as the format argument:

```kotlin
Text(
    text = pluralStringResource(
        R.plurals.cart_items_count,
        itemCount,
        itemCount,
    ),
)
```

For the View system or other `Context`-based code, use:

```kotlin
val message = resources.getQuantityString(
    R.plurals.cart_items_count,
    itemCount,
    itemCount,
)
```

The first `itemCount` selects the quantity form; the second fills `%d`. Android and each locale can then apply the correct plural rules, including cases such as zero or locale-specific categories. Keep the text in resources and avoid concatenating `"item"`/`"items"` or hardcoding singular/plural logic in Kotlin.

