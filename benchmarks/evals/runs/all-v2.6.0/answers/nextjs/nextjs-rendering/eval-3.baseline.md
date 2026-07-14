`window` does not exist during server rendering, and reading a different value on the client creates a hydration mismatch. Prefer CSS media queries for layout/responsive presentation; they avoid JavaScript and are consistent during hydration.

If JavaScript behavior truly depends on the viewport, make the component a Client Component and use a stable initial value, then read the browser in an effect:

```tsx
'use client';
const [width, setWidth] = useState<number | null>(null);
useEffect(() => {
  const update = () => setWidth(window.innerWidth);
  update();
  window.addEventListener('resize', update);
  return () => window.removeEventListener('resize', update);
}, []);
```

Render the same server/client placeholder while `width` is `null`, or use a well-tested `useSyncExternalStore` media-query hook. Avoid `typeof window` branches that return different markup on the first client render, and avoid disabling SSR as a first fix because it can hurt performance and SEO.

