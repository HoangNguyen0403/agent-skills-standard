# Next.js Tooling Reference

## Turbo & CI Configuration

```json
// package.json
"scripts": {
  "dev": "next dev --turbo",
  "lint": "next lint",
  "build": "next build"
}
```

## Self-Hosting (Docker)

```dockerfile
# Dockerfile snippet
FROM node:18-alpine AS base
# ... install & build
CMD ["node", "server.js"]
```

## Inline Examples

```js
// next.config.js — optimized for Docker deployment
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Self-contained build for Docker
  experimental: {
    turbo: {}, // Enable Turbopack
  },
};
module.exports = nextConfig;
```

```typescript
// lib/env.ts — validate env at startup with Zod
import { z } from 'zod';
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url(),
});
export const env = envSchema.parse(process.env);
```
