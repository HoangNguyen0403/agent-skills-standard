Install Tailwind using the version's official Next.js setup, import the generated global stylesheet from the root layout, and keep the content globs/config aligned with `app/` and `src/`. A small `cn` helper should first conditionally join classes and then resolve Tailwind conflicts:

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Use it as `cn('px-4', active && 'bg-blue-600', className)`. Keep the helper in a shared UI utility, and do not construct arbitrary class names dynamically if Tailwind cannot detect them at build time; use safelists or complete class maps for finite variants. Keep component variants typed and local, and verify production CSS output so classes are not missing after purge/content scanning.

