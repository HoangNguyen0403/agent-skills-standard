# Resources & Localization

## Strings (`strings.xml`)

```xml
<resources>
    <!-- Screen Prefixes: home_, profile_ -->
    <string name="home_title">Home Feed</string>
    <string name="home_welcome_user">Welcome, %s!</string>

    <!-- Plurals -->
    <plurals name="posts_count">
        <item quantity="one">%d Post</item>
        <item quantity="other">%d Posts</item>
    </plurals>
</resources>
```

## Compose Usage

```kotlin
Text(text = stringResource(R.string.home_title))
Text(text = stringResource(R.string.home_welcome_user, username))
Text(text = pluralStringResource(R.plurals.posts_count, count, count))
```

## Vector Assets

- Use SVG/XML Vectors instead of PNG/JPG where possible (smaller size, infinite scaling).
- Avoid complex paths in Vectors (parsing performance).
