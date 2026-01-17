# Styling Implementation

## Dynamic Classes Utility

Standard `cn` helper for shadcn/ui and Tailwind.

```typescript
// lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## Component Usage Example

```typescript
// components/ui/button.tsx
export function Button({ className, variant, ...props }) {
  return (
    <button
      className={cn(
        // Base styles
        "px-4 py-2 rounded font-medium transition-colors",
        // Conditional variants
        variant === 'primary' && "bg-blue-500 text-white",
        // External overrides
        className
      )}
      {...props}
    />
  );
}
```

## Font Optimization

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Prevents FOIT
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```
