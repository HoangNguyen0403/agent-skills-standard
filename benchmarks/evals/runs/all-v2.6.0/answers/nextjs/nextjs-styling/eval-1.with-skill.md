Assuming a Next.js App Router project using Tailwind CSS v4:

```bash
npm install tailwindcss @tailwindcss/postcss postcss clsx tailwind-merge
```

Create `postcss.config.mjs`:

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

In `app/globals.css`:

```css
@import "tailwindcss";
```

Create `lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Use it in Server Components or client components:

```tsx
import { cn } from "@/lib/utils";

export function Button({ active = false }: { active?: boolean }) {
  return (
    <button
      className={cn(
        "rounded-md px-4 py-2 text-sm font-medium",
        active && "bg-blue-600 text-white",
        !active && "bg-gray-100 text-gray-900",
      )}
    >
      Continue
    </button>
  );
}
```

Tailwind/shadcn is preferred because it is zero-runtime and RSC-compatible. Use `next/font` for fonts, and `next/image` for images—always specify `width` and `height` or use the `fill` prop.
