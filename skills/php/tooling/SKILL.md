---
name: PHP Tooling
description: PHP ecosystem tooling, dependency management, and static analysis.
metadata:
  labels: [php, composer, toolchain, static-analysis]
  triggers:
    files: ['composer.json']
    keywords: [composer, lock, phpstan, xdebug]
---

# PHP Tooling

## **Priority: P2 (MEDIUM)**

PHP ecosystem tooling, dependency management, and static analysis standards.

## Implementation Guidelines

- **Composer Lock**: Always commit `composer.lock` to ensure environment parity across all stages.
- **Autoloading**: Strictly follow PSR-4 autoloading in `composer.json` for both `src/` and `tests/`.
- **Static Analysis**: Integrate **PHPStan** or **Psalm** into your CI pipeline (level 5+ required).
- **Code Linting**: Use **PHP CS Fixer** or **Pint** to enforce PSR-12 and custom style rules.
- **Debugging**: Use **Xdebug** for profiling and step-through debugging.
- **Composer Scripts**: Define common workflows (lint, analyze, build) in the `scripts` section of `composer.json`.

## Anti-Patterns

- **Manual Requires**: Never use `require` for application classes; rely on Composer.
- **Ignoring Lock Diffs**: Never merge a `composer.lock` change without reviewing the specific version bumps involved.
- **Production Xdebug**: Ensure Xdebug is disabled in production environments for security and performance.
- **Vendor Commits**: Never commit the `vendor/` directory.

## Code

```json
{
  "name": "vendor/app",
  "autoload": {
    "psr-4": {
      "App\\": "src/"
    }
  },
  "scripts": {
    "lint": "php-cs-fixer fix",
    "analyze": "phpstan analyze",
    "test": "phpunit"
  }
}
```
