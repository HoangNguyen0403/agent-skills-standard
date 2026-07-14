Use a string resource with a format placeholder for localization:

```xml
<!-- res/values/strings.xml -->
<string name="hello_user">Hello %1$s!</string>
```

```kotlin
textView.text = getString(R.string.hello_user, userName)
```

This lets translators reorder or adapt the name placement for different languages.
