Diagnose the jank on a profileable/release-like build while reproducing the same scroll. First determine whether frames are missing because of Compose recomposition, layout/measure work, image decoding, or another main-thread task.

Use Layout Inspector to find unnecessary recompositions and inspect the system trace or Android Studio profiler for long work during scroll. JankStats is useful for recording frame metrics and identifying the screens or interactions that drop below the intended frame rate. Measure a baseline, fix one cause at a time, and compare the janky-frame count and frame timing afterward.

For the `LazyColumn` itself:

```kotlin
@Immutable
data class User(val id: String, val name: String, val avatarUrl: String)

LazyColumn {
    items(
        items = users,
        key = { user -> user.id }
    ) { user ->
        UserRow(user)
    }
}
```

Use stable item types and stable, unique keys. Do not key by the list index when rows can be inserted, removed, or reordered; without stable keys Compose may discard and recreate more item state than necessary. Keep item lambdas cheap: avoid parsing, sorting, database work, allocations, and expensive formatting in the composition path. Precompute data off the main thread, use `remember` for values whose inputs have not changed, and narrow state reads so a change in one row does not recompose the whole list.

Check the row layout for avoidable measurement work. Remove deeply nested layouts and nested weights where possible; use a simpler `Row`/`Column` arrangement or an appropriate constraint-based layout. If rows contain images, load thumbnails at the displayed size with Coil or Glide, enable memory/disk caching, and use a modest crossfade rather than decoding large network images during a scroll.

Finally, test with realistic data and fast flings, including image loading and empty/loading/error states. A list that is smooth with placeholder text but janks with real images has an image/decode problem, not just a `LazyColumn` problem. Keep the JankStats/trace evidence with the before-and-after measurements so the fix addresses the actual frame bottleneck.

