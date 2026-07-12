Use MUI's App Router integration so Emotion styles are collected and inserted in the correct order during streaming SSR. For the installed Next/MUI version, add the matching `AppRouterCacheProvider` in a Client-side providers component, then provide the theme:

```tsx
'use client';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider>
    </AppRouterCacheProvider>
  );
}
```

Import the provider from the package path matching the actual Next major version, place it in `app/layout.tsx`, and keep the layout itself server-compatible. Configure the CSS layer/order if mixing MUI with Tailwind or other styles, avoid duplicate theme providers, and test production SSR to catch flash-of-unstyled-content or hydration issues. Do not use a Pages Router `_document` recipe unchanged in the App Router.

