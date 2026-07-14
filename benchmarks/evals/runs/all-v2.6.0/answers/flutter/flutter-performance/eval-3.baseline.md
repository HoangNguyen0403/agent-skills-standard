High memory usage here usually comes from decoding and caching large images at full resolution.

Start by reducing image decode size to the actual display size instead of loading full-res assets. In Flutter, prefer resizing at decode time with `cacheWidth` / `cacheHeight` or a provider that serves thumbnails for catalog views.

Also check:

- whether too many images are kept alive in memory by the image cache
- whether list items are eagerly built instead of lazily rendered
- whether full-screen product assets are being reused in grid/list thumbnails
- whether multiple copies of the same image are held in different states/providers

Practical fixes:

- use smaller thumbnail variants in catalog screens
- cap Flutter image cache size if needed
- use paginated/lazy-loading lists
- avoid `precacheImage` for large batches
- compress or transcode oversized source images

Profile with DevTools memory view while scrolling the catalog. If memory spikes during image decode and drops poorly afterward, the image pipeline and cache policy are the likely bottlenecks.

