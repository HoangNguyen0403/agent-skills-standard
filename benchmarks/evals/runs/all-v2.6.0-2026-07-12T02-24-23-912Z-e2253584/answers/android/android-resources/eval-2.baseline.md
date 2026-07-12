Put the complete user-visible sentence in a string resource and use a format placeholder. Do not concatenate localized fragments in Kotlin; word order, punctuation, and spacing can vary by language.

```xml
<string name="greeting">Hello %1$s!</string>
```

Format it at the point where you have the value:

```kotlin
val message = getString(R.string.greeting, userName)
```

Use positional arguments such as `%1$s` so translators can reorder arguments if the locale requires it. If the name can contain untrusted or user-entered text, pass it as a format argument rather than treating it as resource or markup content. For more complex messages, add all variable values to one resource; use `<plurals>` for quantity-dependent wording and avoid building sentences by joining separately translated pieces.

