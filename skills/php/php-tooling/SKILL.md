---
name: php-tooling
description: "PHP ecosystem tooling, dependency management, and static analysis. Use when managing Composer dependencies, running PHPStan, or configuring PHP build tools. (triggers: composer.json, composer, lock, phpstan, xdebug)"
---

# PHP Tooling

## **Priority: P2 (MEDIUM)**

## Structure

```text
project/
├── composer.json
├── phpstan.neon
└── .php-cs-fixer.php
```

## Implementation Guidelines

- **Composer Lock**: Commit `composer.lock` for environment parity.
- **PSR-4**: Strictly map namespaces to `src/` and `tests/`.
- **Static Analysis**: Integrate **PHPStan** (level 5+) in CI.
- **Linting**: Automate PSR-12 enforcement via **PHP CS Fixer**.
- **Debugging**: Use **Xdebug** for profiling; avoid `var_dump`.
- **Scripts**: Define `lint`, `analyze`, `test` in `composer.json`.

## Anti-Patterns

- **No manual `require`**: Use Composer PSR-4 autoloading only.
- **No blind composer updates**: Review `composer.lock` diff first.
- **No Xdebug in production**: Disable the extension in prod env.
- **No `vendor/` in git**: Exclude via `.gitignore`; use Composer.

## References

- [Composer Config Examples](references/example.md)
