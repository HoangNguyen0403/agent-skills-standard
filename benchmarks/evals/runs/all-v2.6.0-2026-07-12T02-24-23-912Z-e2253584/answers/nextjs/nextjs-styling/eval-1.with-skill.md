Use Tailwind/shadcn or CSS Modules for zero-runtime, RSC-compatible styling. Add a `cn` helper that combines `clsx` with `tailwind-merge` so conditional classes resolve predictably:

```ts
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Use `next/font` for fonts and always give images dimensions or `fill`; avoid runtime CSS-in-JS that forces broad `'use client'` boundaries.

