Assuming Tailwind is already enabled in the Next.js project:

```bash
npm install clsx tailwind-merge
```

Create `lib/utils.ts`:

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Use it in components:

```tsx
import { cn } from "@/lib/utils";

<div className={cn("rounded-md p-4", isActive && "bg-blue-500")} />
```
