Create `pages/_app.tsx` to wrap every Pages Router page:

```tsx
import type { AppProps } from 'next/app'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
```

Use `_app.tsx` for global CSS, providers, layouts, and global state. Keep custom document markup in `pages/_document.tsx`, and do not use App Router `app/` conventions in this project.

