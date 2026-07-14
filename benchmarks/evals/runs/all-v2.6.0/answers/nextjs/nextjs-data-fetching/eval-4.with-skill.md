Start independent server reads together with `Promise.all()`:

```tsx
const [products, categories] = await Promise.all([
  getProducts(),
  getCategories(),
])
```

This prevents an avoidable sequential waterfall. Keep dependent reads sequential, deduplicate repeated reads with React `cache()`, and wrap especially slow components in `Suspense` so the route can stream its shell.

