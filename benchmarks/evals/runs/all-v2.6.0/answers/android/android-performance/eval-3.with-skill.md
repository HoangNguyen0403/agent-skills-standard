The main issue is usually decoding the full network image into a `Bitmap`. Compressed network size is not the memory cost of the decoded bitmap; an ARGB image needs approximately `width × height × 4` bytes. Load a thumbnail at the size the `ImageView` actually displays, and let the image library cache the result.

For example, with Glide, use a known pixel size for the target rather than the original URL dimensions:

```kotlin
Glide.with(holder.imageView)
    .load(item.thumbnailUrl)
    .override(targetWidthPx, targetHeightPx)
    .diskCacheStrategy(DiskCacheStrategy.RESOURCE)
    .placeholder(R.drawable.image_placeholder)
    .error(R.drawable.image_error)
    .transition(DrawableTransitionOptions.withCrossFade())
    .into(holder.imageView)
```

Glide's memory cache is enabled by default; choose the disk strategy based on whether the resized result or the source data is more useful to cache. With Coil, apply the equivalent request options: set the target `size`, enable memory and disk caching, and use `.crossfade()`.

Handle recycling explicitly. Clear the previous request and image in `onViewRecycled`, and also clear or replace the drawable when binding a holder, so a slow request cannot leave an old image in a reused row:

```kotlin
override fun onViewRecycled(holder: ImageHolder) {
    Glide.with(holder.imageView).clear(holder.imageView)
    holder.imageView.setImageDrawable(null)
    super.onViewRecycled(holder)
}
```

Do not retain `Bitmap` objects or `View`/Activity contexts in long-lived caches or singletons; use the application context for shared image infrastructure. Paginate large result sets and prefer server-provided thumbnails so the app does not download and decode unnecessarily large files. Avoid caching every full-resolution original in memory.

To verify the fix, use Android Studio's Memory Profiler and a heap dump while repeatedly scrolling. Look for large `Bitmap` allocations and retained image/view references, then compare peak and post-scroll memory. Also test fast scrolling and rotation/recreation: requests should be cancelled or reused, rows should display the correct image, and peak memory should remain bounded.

