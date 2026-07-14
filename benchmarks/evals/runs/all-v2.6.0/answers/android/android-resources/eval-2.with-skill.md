Define the message in `res/values/strings.xml` using a `%s` format argument:

```xml
<string name="hello_user">Hello %s!</string>
```

In Jetpack Compose:

```kotlin
Text(stringResource(R.string.hello_user, userName))
```

For non-Compose UI code:

```kotlin
context.getString(R.string.hello_user, userName)
```

This avoids UI string concatenation and keeps the message localizable.
