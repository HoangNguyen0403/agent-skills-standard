`localStorage` exists only in the browser, so a Server Component cannot read it. Move the read into a Client Component and keep its first render consistent with the server:

```tsx
'use client';
const [theme, setTheme] = useState<string | null>(null);

useEffect(() => {
  setTheme(window.localStorage.getItem('theme'));
}, []);
```

Render a stable placeholder or server-safe default while `theme` is `null`, then update after the effect. For a preference that affects the initial document, prefer a cookie read by the server and set by the client, or use a theme solution that installs its script carefully before paint. Wrap storage access in a small client-only hook and handle unavailable storage/privacy-mode errors. Do not fix the mismatch with a blanket `suppressHydrationWarning`; use it only for a deliberate, narrowly scoped difference. Keep sensitive data out of localStorage because XSS can read it.

