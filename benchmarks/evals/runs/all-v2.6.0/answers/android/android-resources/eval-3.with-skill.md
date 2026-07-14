Prefer XML `VectorDrawable` icons for most Android app icons:

- Scale cleanly across mdpi, hdpi, xhdpi, and xxhdpi.
- Usually reduce APK size.
- Are easy to tint and theme.
- Work well with Compose and Views.

Use PNG only for raster artwork—such as photos, textures, or highly detailed illustrations—or when an existing asset cannot be converted cleanly to a vector. Place density-specific PNGs in `drawable-mdpi`, `drawable-hdpi`, etc.

Example:

```xml
<!-- res/drawable/ic_search.xml -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    ...
</vector>
```

In Compose:

```kotlin
Icon(
    painter = painterResource(R.drawable.ic_search),
    contentDescription = stringResource(R.string.search)
)
```

Assumption: these are standard UI icons, not photographic or richly textured artwork.
