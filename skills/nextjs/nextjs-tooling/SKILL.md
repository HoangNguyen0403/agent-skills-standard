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

- **Legacy Dev**: **No npm run start for dev**: Use `next dev`.
- **Large Bundles**: **No missing source-maps**: Analyze via `@next/bundle-analyzer`.
- **Missing Plugins**: **No custom lint rules**: Use `eslint-plugin-next`.
- **Production Logs**: **No console.log in prod**: Use structured loggers.

## References

- [CI/CD & Deployment Guide](references/implementation.md)
