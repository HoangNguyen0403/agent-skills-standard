# Controlling memory when loading network images in a `RecyclerView`

The main issue is usually decoding the source image at its full pixel dimensions. A compressed JPEG or WebP may be small on the network but expand to tens or hundreds of megabytes as a `Bitmap`. Decode to the size the `ImageView` actually needs, and use appropriately sized thumbnail URLs from the server when possible. Avoid downloading or retaining originals for a scrolling list.

Use a lifecycle-aware image-loading library such as Glide or Coil rather than manually keeping bitmap and byte-array caches. Configure it to:

- resize or override the request to the target view dimensions;
- use memory and disk caching with bounded policies and avoid maintaining a second unbounded application cache;
- cancel or replace the previous request when a holder is rebound, and clear the request in `onViewRecycled` when the library's integration requires it;
- load a small placeholder and error image, not another large bitmap; and
- decode using a suitable bitmap configuration. `RGB_565` can reduce memory for images that do not need alpha or full color fidelity, but it should be chosen only after checking visual quality. Modern Android manages bitmap memory, so do not blindly call `recycle()` on bitmaps still used by views.

For example, with Glide the request should express the displayed size rather than accepting the source dimensions:

```kotlin
Glide.with(holder.itemView)
    .load(item.thumbnailUrl)
    .override(targetWidthPx, targetHeightPx)
    .placeholder(R.drawable.image_placeholder)
    .error(R.drawable.image_error)
    .into(holder.imageView)
```

The exact API depends on the library and layout, but the important property is that the decode target is bounded. If item size varies, use the actual measured size or a small set of known bucket sizes. Preserve an aspect-ratio placeholder so rows do not repeatedly re-layout as images arrive.

Also reduce retained data. Page the feed, submit only the current data set to the adapter, avoid putting full-resolution bitmaps in model objects, and do not keep references to recycled view holders or activities in long-lived callbacks. Use `ListAdapter`/`DiffUtil` for updates so the adapter does not create unnecessary churn, while remembering that efficient diffing does not by itself fix oversized bitmap allocations.

Diagnose with Android Studio's Memory Profiler and heap dumps while repeatedly scrolling. Look for the largest `Bitmap` allocations, duplicate cache entries, retained activities/views, and whether memory falls after holders leave the viewport. Check native/graphics memory as well as the Java/Kotlin heap, because bitmap placement varies by Android version. Enable StrictMode or logging around custom image code to catch accidental full-size decodes, and test rapid scrolling, rotation, process recreation, cache hits, cache misses, and low-memory devices.

Finally, verify that the image server supports thumbnails and sensible dimensions, and that redirects or URL transformations are not defeating cache keys. A successful fix keeps peak memory bounded, avoids crashes or frequent garbage-collection pauses, preserves acceptable image quality, and leaves requests correctly cancelled when rows are reused.

