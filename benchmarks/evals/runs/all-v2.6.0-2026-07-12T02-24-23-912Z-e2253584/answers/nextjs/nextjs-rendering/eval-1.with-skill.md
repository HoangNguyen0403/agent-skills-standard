Use static generation (SSG) for the mostly immutable product listing. In the App Router, fetch with `force-cache` and use `generateStaticParams` for dynamic paths where applicable. If the catalog changes periodically, add ISR with `revalidate: N` or invalidate the owning tag/path after updates. This gives CDN-friendly HTML without paying the cost of SSR for every request.

