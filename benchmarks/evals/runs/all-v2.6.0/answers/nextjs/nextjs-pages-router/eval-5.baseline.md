Create `pages/_app.tsx` to wrap every Pages Router page. It is the right place for global CSS, persistent providers, and app-wide layout:

```tsx
import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { ThemeProvider } from '../src/theme';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
```

Import global styles only from `_app` (or the supported global entry), and keep page-specific styles local with CSS Modules, a styling library, or scoped conventions. Preserve `pageProps` so `getServerSideProps`/`getStaticProps` values reach the page. If each page has a different shell, use a layout pattern rather than putting all feature UI in `_app`; remember that `_app` itself does not support `getStaticProps` in the same way as a normal page.

