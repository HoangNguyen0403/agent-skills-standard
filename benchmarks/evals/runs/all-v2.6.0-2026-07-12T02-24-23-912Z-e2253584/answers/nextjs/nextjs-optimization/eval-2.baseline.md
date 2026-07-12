Use `next/font` instead of a raw Google Fonts `<link>` in the layout. It downloads and self-hosts the selected font during the build, applies it with a stable class/variable, and avoids a render-time third-party request:

```tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={inter.className}><body>{children}</body></html>;
}
```

Choose only the weights/subsets you use, or use `next/font/local` for self-hosted files. Remove the duplicate `<link>` and check font-display/fallback metrics if a small shift remains. Use preload only for the primary font needed above the fold; too many weights increase CSS and download cost. Verify that CSP and build/network settings permit the self-hosted assets, then measure LCP and layout shift on a cold load.

