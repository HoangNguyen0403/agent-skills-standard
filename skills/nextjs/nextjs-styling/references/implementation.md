# nextjs-styling Implementation Examples

## Inline Examples

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// usage in a component
<button className={cn('px-4 py-2 rounded', isActive && 'bg-blue-500 text-white')}>Click</button>
```
