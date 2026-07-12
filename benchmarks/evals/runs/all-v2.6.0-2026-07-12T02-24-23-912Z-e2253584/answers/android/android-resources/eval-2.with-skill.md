Define the complete message in `res/values/strings.xml` and use a format argument for the username:

```xml
<resources>
    <string name="greeting_user">Hello %s!</string>
</resources>
```

In Jetpack Compose:

```kotlin
Text(text = stringResource(R.string.greeting_user, userName))
```

In View-system or `Context`-based code:

```kotlin
val message = context.getString(R.string.greeting_user, userName)
```

This keeps visible UI text localizable and lets translators change word order or punctuation for another language. Do not build the sentence with `"Hello " + userName + "!"`; pass dynamic values through `%s` (and `%d` for numbers) in the resource instead. If the message later becomes quantity-sensitive, use a `plurals` resource rather than embedding singular/plural decisions in Kotlin.

