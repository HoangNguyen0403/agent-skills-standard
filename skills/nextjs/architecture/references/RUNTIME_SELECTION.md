# Next.js Runtime Selection

## **Decision Matrix**

| Feature             | Node.js (Default)       | Edge Runtime                |
| ------------------- | ----------------------- | --------------------------- |
| **Cold Start**      | Good                    | Ultra-fast                  |
| **API Support**     | Full (fs, crypto, etc.) | Limited (Strictly Web APIs) |
| **Connectivity**    | Full TCP/UDP            | Limited                     |
| **Package Support** | High                    | Low (No native bindings)    |

## **Rule of Thumb**

> [!IMPORTANT]
> **Use Node.js by default.** Only use Edge if there is a specific latency requirement or geographic distribution need already established in the project.

## **Usage**

```tsx
// Only if required
export const runtime = 'edge';
```

## **Constraint Checklist**

Before switching to Edge:

1. Does the project already use it? (Consistency)
2. Is every dependency Edge-compatible? (No `fs` or native code)
3. Is latency a critical blocker?
