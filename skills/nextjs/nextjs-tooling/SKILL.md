---
name: nextjs-tooling
description: "Ecosystem optimization, deployment, and developer flow. Use when configuring Next.js build optimization, deployment settings, or developer tooling. (triggers: next.config.js, package.json, Dockerfile, turbopack, output, standalone, lint, telemetry)"
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

- **Turbopack**: Enable `--turbo` for development speed improvements.
- **Standalone Build**: Use `output: 'standalone'` for Docker optimization.
- **CI Linting**: Run `next lint` and `tsc` on every pull request.
- **Telemetry**: Opt-out of global tracking for privacy (`next telemetry disable`).
- **Caching**: Configure CI to cache `.next/cache` for faster builds.
- **Deployment**: Prefer Vercel for automation or Docker for self-hosting.

## Anti-Patterns

- **No `npm run start` for dev**: Use `next dev` (or `next dev --turbo`).
- **No uninspected bundle growth**: Analyze with `@next/bundle-analyzer` before shipping.
- **No custom ESLint rules over plugin**: Use `eslint-plugin-next` for Next.js-aware linting.
- **No `console.log` in production**: Use structured loggers (Pino, Winston).

## References

- [CI/CD & Deployment Guide](references/implementation.md)
