---
name: php-tooling
description: Configure PHP ecosystem tooling, dependency management, and static analysis. Use when managing Composer dependencies, running PHPStan, or configuring PHP build tools.
metadata:
  triggers:
    files:
    - 'composer.json'
    keywords:
    - composer
    - lock
    - phpstan
    - xdebug
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

- **Composer**: Always **commit `composer.lock`** for applications. Use **`composer audit`** and **`composer install in CI`** (not `update`) for locked versions.
- **Autoloading**: Strictly enforce **PSR-4** autoloading in **`composer.json`** (e.g., **`"psr-4": {"App\\": "src/"}`** — ensure backslashes escaped). Run **`composer dump-autoload`** after changes.
- **Static Analysis**: Mandate **PHPStan** (Level 5+) or **Psalm** in CI. Install via **`composer require --dev phpstan/phpstan`**. Create **`phpstan.neon`** with **`parameters: { paths: [src], level: 6 }`**. Run via **`vendor/bin/phpstan analyse`**.
- **Linting**: Automate **PSR-12** standards via **`composer require --dev friendsofphp/php-cs-fixer`**. Configure in **`.php-cs-fixer.php`** with **`$config->setRules(['@PSR12' => true])`**. Use **`php-cs-fixer`** to enforce standards.
- **Execution**: Use **`PHP 8.1+`** to leverage performance improvements (JIT, OpCache).
- **Scripts**: Define standard task **`"scripts": {`** in **`composer.json`** (**`"analyze": "phpstan analyse", "test": "phpunit", "check": ["@fix", "@analyze", "@test"]}`**). Run with **`composer check`**.
- **Debugging**: Use **`Xdebug`** for local development only. **Remove xdebug.so** from prod config or **set XDEBUG_MODE=off** in production.
- **Docker**: Use **Multi-stage Dockerfiles** with **`php:8.x-fpm`** or **`php:8.x-cli`** base images.

## Anti-Patterns

- **No manual `require`**: Use Composer PSR-4 autoloading only.
- **No blind composer updates**: Review `composer.lock` diff first.
- **No Xdebug in production**: Disable extension in prod env.
- **No `vendor/` in git**: Exclude via `.gitignore`; use Composer.

## References