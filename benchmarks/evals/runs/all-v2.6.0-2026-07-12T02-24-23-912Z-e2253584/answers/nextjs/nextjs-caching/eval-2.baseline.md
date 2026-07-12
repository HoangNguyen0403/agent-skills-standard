Use static generation with incremental revalidation for a blog that changes a few times per day. For example, make the post query cacheable for a suitable interval:

```ts
const posts = await fetch(`${API_URL}/posts`, {
  next: { revalidate: 900 }, // choose an interval matching freshness needs
}).then((r) => r.json());
```

You can also set a route-level `revalidate` value or invalidate a tag/path immediately when an editor publishes. This serves cached HTML/RSC output and refreshes it in the background or on the next request according to the chosen behavior, reducing origin work and latency. Use SSR (`cache: 'no-store'`, or an explicitly dynamic route) when every request must see the latest data, the result is user-specific, or freshness cannot tolerate the interval. Consider on-demand revalidation from the CMS webhook for prompt updates, and make sure the cache key does not accidentally share personalized content between users.

