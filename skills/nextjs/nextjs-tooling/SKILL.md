---
name: nextjs-tooling
description: 'Ecosystem optimization, deployment, and developer flow. Use when configuring Next.js build optimization, deployment settings, or developer tooling. (triggers: next.config.js, package.json, Dockerfile, turbopack, output, standalone, lint, telemetry)'
---

# Next.js Tooling

## **Priority: P2 (MEDIUM)**

## Structure

```text
project/
├── .next/              # Build artifacts
├── next.config.js      # Advanced config
└── .eslintrc.json      # Next plugins
```

## Implementation Guidelines

- **Build Architecture**: Use **`Turbopack`** (modern) or **`Webpack`** (legacy). Enable **`--turbo`** for faster incremental development.
- **Minification**: Ensure **`output: 'standalone'`** is set in `next.config.js` for optimized **Docker** deployments. Use **`ProGuard` / `Uglify`** equivalents for asset shrinking.
- **Linting**: Mandate **`next lint`** (Next.js ESLint plugin) and **`tsc` (typecheck)** in CI/CD pipelines.
- **Asset Optimization**: Inspect size with **`@next/bundle-analyzer`**. Optimize images via **`next/image`** and remove unused dependencies.
- **Telemetry**: Opt-out via **`next telemetry disable`** if privacy is required.
- **Environment**: Use **`.env`** management in Next.js (Server only vs `NEXT_PUBLIC_*`). Validate schemas with **Zod** at runtime.
- **CI/CD**: Cache the **`.next/cache`** folder in CI for 50%+ faster build times.

## Anti-Patterns

- **No `npm run start` for dev**: Use `next dev` (or `next dev --turbo`).
- **No uninspected bundle growth**: Analyze with `@next/bundle-analyzer` before shipping.
- **No custom ESLint rules over plugin**: Use `eslint-plugin-next` for Next.js-aware linting.
- **No `console.log` in production**: Use structured loggers (Pino, Winston).

## References

- [CI/CD & Deployment Guide](references/implementation.md)
