The memory spike is most likely from decoding and caching too many full-resolution catalog images at once.

Recommended fixes:

- Resize images at load time instead of keeping original dimensions in memory. Set `memCacheWidth` / `memCacheHeight` or `maxWidth` / `maxHeight` based on the rendered card size.
- Use `CachedNetworkImage` so repeated scrolling does not redownload assets, but keep cache dimensions constrained.
- Render catalog items with `ListView.builder` so off-screen items are recycled instead of all staying alive.
- Paginate the catalog, ideally around 20 items per page, rather than loading the entire image-heavy dataset at once.
- Avoid heavy image-related work in `build()` and keep item widgets as `const` where possible to reduce rebuild pressure.
- If thumbnails are still expensive, generate smaller server-side variants and load those in the list instead of full-res originals.

Example:

```dart
CachedNetworkImage(
  imageUrl: product.thumbnailUrl,
  memCacheWidth: 300,
  maxWidthDiskCache: 300,
  fit: BoxFit.cover,
)
```

If the issue persists after resizing, profile image cache usage first—the bottleneck is usually oversized decoded bitmaps, not the widget tree itself.

