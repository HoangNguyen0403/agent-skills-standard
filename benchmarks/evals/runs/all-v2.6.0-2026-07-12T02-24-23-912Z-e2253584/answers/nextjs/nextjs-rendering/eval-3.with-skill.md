Do not read `window.innerWidth` during the initial render. Keep the initial server and client output deterministic, then read it in a Client Component after mount:

```tsx
'use client'
const [width, setWidth] = useState<number | null>(null)
useEffect(() => setWidth(window.innerWidth), [])
```

Render the same placeholder until the effect runs, or use CSS media queries when the behavior is presentational. Avoid `typeof window` branches that produce different initial markup.

