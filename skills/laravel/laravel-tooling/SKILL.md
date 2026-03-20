---
name: laravel-tooling
description: "Ecosystem management, Artisan, and asset bundling. Use when managing Composer dependencies, Artisan commands, or Vite asset bundling in Laravel. (triggers: package.json, composer.json, vite.config.js, artisan, vite, horizon, pint, blade)"
---

# Laravel Tooling

## **Priority: P2 (MEDIUM)**

## Structure

```text
project/
├── app/Console/        # Custom Artisan commands
├── resources/js/       # Frontend assets (Vite)
└── pint.json           # Code styling
```

## Implementation Guidelines

- **Artisan Focus**: Build custom commands for repetitive tasks.
- **Vite Integration**: Use `@vite` directive for CSS/JS bundling.
- **Pint Styling**: Enforce Laravel style standard automatically.
- **Background Jobs**: Use **Horizon** for monitoring Redis queues.
- **Blade Components**: Encapsulate UI into `@component` or `<x-comp>`.
- **Caching**: Prune/refresh caches via `optimize:clear`.

## Anti-Patterns

- **No Laravel Mix**: Migrate to Vite for faster HMR.
- **No JS in Blade templates**: Move scripts to `resources/js`.
- **No manual DB edits**: Use Artisan commands or migrations.
- **No unstyled commits**: Run `./vendor/bin/pint` before merging.

## References

- [Artisan & Vite Patterns](references/implementation.md)
