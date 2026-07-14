# Caching network images

Use an image component/library with a real disk and memory cache, such as the caching facilities provided by the chosen Expo or native image solution. Configure cache policy deliberately (`memory`, `disk`, or both), stable URLs, resize/thumbnail endpoints, placeholders, and fallback/error behavior. For large feeds, request appropriately sized images rather than downloading full-resolution originals.

Keep image URLs stable and use versioned URLs or cache headers for invalidation. Avoid converting images to base64 or storing large blobs in AsyncStorage. Give list images fixed dimensions or an aspect ratio so layout does not repeatedly reflow, and use thumbnails for off-screen/preview content. Prefetch only likely-to-be-seen images; unlimited prefetching can increase memory and bandwidth.

Measure cache hit rate, memory, startup, and scroll performance on Android and iOS. Ensure authenticated image requests do not leak credentials through URLs or an unsafe shared cache, and verify behavior offline, after logout, and when an image changes.

