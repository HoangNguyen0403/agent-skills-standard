---
name: nextjs-tooling
description: "Configure Next.js build tooling, deployment, and developer workflow. Use when setting up Turbopack, standalone Docker output, bundle analysis, CI caching, environment variable validation, or ESLint integration for Next.js projects. (triggers: next.config.js, package.json, Dockerfile, turbopack, output, standalone, lint, telemetry)"
---

# Next.js Tooling

## Priority: P2 (MEDIUM)

## Standalone Docker Config

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

## Environment Variable Validation

```typescript
// lib/env.ts — validate env at startup with Zod
import { z } from 'zod';
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url(),
});
export const env = envSchema.parse(process.env);
```

## Implementation Guidelines

- **Build**: Use Turbopack (`next dev --turbo`) for faster incremental builds; Webpack for legacy.
- **Linting**: Mandate `next lint` (eslint-plugin-next) and `tsc` in CI/CD.
- **Bundle Analysis**: Inspect with `@next/bundle-analyzer`. Remove unused dependencies.
- **Telemetry**: Opt-out via `next telemetry disable` if privacy is required.
- **Environment**: Server-only vars vs `NEXT_PUBLIC_*`. Validate with Zod at runtime.
- **CI/CD**: Cache `.next/cache` in CI for 50%+ faster builds.

## Anti-Patterns

- **No `npm run start` for dev**: Use `next dev` (or `next dev --turbo`).
- **No uninspected bundle growth**: Analyze with `@next/bundle-analyzer` before shipping.
- **No custom ESLint rules over plugin**: Use `eslint-plugin-next` for Next.js-aware linting.
- **No `console.log` in production**: Use structured loggers (Pino, Winston).

## References

- [CI/CD & Deployment Guide](references/implementation.md)
