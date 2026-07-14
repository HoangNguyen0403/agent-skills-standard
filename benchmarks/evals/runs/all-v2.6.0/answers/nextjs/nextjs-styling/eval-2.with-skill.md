MUI works with Next.js App Router, but it uses runtime CSS-in-JS and can force `'use client'` boundaries more widely. The preferred alternatives are Tailwind/shadcn or CSS Modules / SCSS because they are zero-runtime and RSC-compatible.

If MUI is required:

```bash
npm install @mui/material @emotion/react @emotion/styled @mui/material-nextjs
```

Create a client-only provider:

```tsx
// app/providers.tsx
'use client';

import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

const theme = createTheme();

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
```

Use it from the server layout:

```tsx
// app/layout.tsx
import Providers from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

Use the matching `@mui/material-nextjs` integration for your Next.js major version, such as `v15-appRouter`.

Keep interactive MUI components behind client wrappers where possible. For zero-runtime styling, prefer Tailwind/shadcn or CSS Modules, and use `clsx` + `tailwind-merge` through a `cn()` utility for dynamic classes. Use `next/font` for fonts. For images, use `next/image` and always specify `width` and `height`, or use the `fill` prop.
