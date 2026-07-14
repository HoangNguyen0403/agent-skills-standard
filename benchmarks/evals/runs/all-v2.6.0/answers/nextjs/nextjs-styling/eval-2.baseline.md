Assuming Next.js 14/15 with the App Router:

1. Install MUI:

```bash
npm install @mui/material @emotion/react @emotion/styled @mui/material-nextjs
```

2. Create `src/theme.ts`:

```ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
  },
});

export default theme;
```

3. Wrap your app in `src/app/layout.tsx`.

For Next.js 15:

```tsx
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from '../theme';

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
```

For Next.js 14, change the import to:

```tsx
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
```

4. Use MUI components:

```tsx
import Button from '@mui/material/Button';

export default function Page() {
  return <Button variant="contained">Hello MUI</Button>;
}
```

Components requiring browser interactivity should be placed in a Client Component with:

```tsx
'use client';
```
