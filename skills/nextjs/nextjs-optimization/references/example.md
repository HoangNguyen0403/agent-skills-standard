# References

Move large code blocks here.

## Inline Examples

```tsx
import Image from 'next/image';

// Above-the-fold hero — priority for LCP, sizes for responsive
<Image src="/hero.jpg" alt="Hero" width={1200} height={600}
  priority sizes="(max-width: 768px) 100vw, 50vw"
  placeholder="blur" blurDataURL={blurHash} />
```

```tsx
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'] });

export default function Layout({ children }) {
  return <body className={inter.className}>{children}</body>;
}
```

```tsx
// Static metadata
export const metadata: Metadata = { title: 'Dashboard', description: '...' };

// Dynamic metadata for parameterized routes
export async function generateMetadata({ params }) {
  const product = await getProduct(params.id);
  return { title: product.name, openGraph: { images: [product.image] } };
}
```
