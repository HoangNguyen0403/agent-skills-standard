---
name: nextjs-tooling
description: Configure Next.js build tooling, deployment, and developer workflow. Use when setting up Turbopack, standalone Docker output, bundle analysis, CI caching, environment variable validation, or ESLint integration for Next.js projects.
metadata:
  triggers:
    files:
    - 'next.config.js'
    - 'package.json'
    keywords:
    - Dockerfile
    - turbopack
    - output
    - standalone
    - lint
    - telemetry
---
# Next.js Tooling

## **Priority: P2 (MEDIUM)**

## Standalone Docker Config

See [implementation examples](references/implementation.md)

## Environment Variable Validation

See [implementation examples](references/implementation.md)

## Implementation Guidelines

- **Build**: Use Turbopack (`next dev --turbo`) for faster incremental builds; Webpack for legacy.
- **Linting**: Mandate `next lint` (eslint-plugin-next) and `tsc` in CI/CD.
- **Bundle Analysis**: Inspect with `@next/bundle-analyzer`. Remove unused dependencies.
- **Telemetry**: Opt-out via `next telemetry disable` if privacy required.
- **Environment**: Server-only vars vs `NEXT_PUBLIC_*`. Validate with Zod at runtime.
- **CI/CD**: Cache `.next/cache` in CI for 50%+ faster builds.

## Anti-Patterns

- **No `npm run start` for dev**: Use `next dev` (or `next dev --turbo`).
- **No uninspected bundle growth**: Analyze with `@next/bundle-analyzer` before shipping.
- **No custom ESLint rules over plugin**: Use `eslint-plugin-next` for Next.js-aware linting.
- **No `console.log` in production**: Use structured loggers (Pino, Winston).

## References

- [CI/CD & Deployment Guide](references/implementation.md)