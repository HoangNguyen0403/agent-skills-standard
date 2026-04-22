---
name: laravel-tooling
description: Configure Laravel ecosystem with custom Artisan commands, Vite asset bundling, Pint code styling, and Horizon queue monitoring. Use when creating Artisan commands, migrating from Mix to Vite, or configuring Pint code standards.
metadata:
  triggers:
    files:
    - 'package.json'
    - 'composer.json'
    - 'vite.config.js'
    keywords:
    - artisan
    - vite
    - horizon
    - pint
    - blade
---
# Laravel Tooling

## **Priority: P2 (MEDIUM)**

## Workflow: Set Up Development Tooling

1. **Install Pint** — `composer require laravel/pint --dev`; run `./vendor/bin/pint`.
2. **Configure Vite** — Set up `vite.config.js` with Laravel plugin; add `@vite()` in Blade layout.
3. **Create custom command** — `php artisan make:command SendNewsletters`.
4. **Add Horizon** — `composer require laravel/horizon`; configure supervisors.

## Custom Artisan Command Example

See [implementation examples](references/implementation.md#custom-artisan-command-example) for Artisan command pattern and project structure.

## Implementation Guidelines

### Artisan Commands

- **Customization**: Use **`php artisan make:command SendNewsletters`**.
- **Definitions**: Define **`protected $signature = 'newsletters:send {--queue}'`**.
- **Execution**: Implement **`handle(): int`**. Commands **auto-discovered** in **`app/Console/Commands/`**.
- **Scheduling**: Schedule in **`bootstrap/app.php`** (formerly Kernel).

### Asset Management (Vite)

- **Scaffolding**: Run **`npm install`** and configure **`vite.config.js`** with Laravel plugin.
- **Blade Integration**: Add @vite directive (`@vite(['resources/css/app.css', 'resources/js/app.js'])`) to your layout.
- **Migration**: Use Vite (not Mix) — replace mix() with vite() in Blade templates and remove laravel-mix.
- **Workflow**: Run `npm run dev` for local HMR and `npm run build for production`. No manual versioning needed.

### Code Quality & Monitoring

- **Pint Styling**: Enforce standards with **`composer require laravel/pint --dev`**.
- **Usage**: Run **`./vendor/bin/pint`** to apply `preset: 'laravel'` configuration from **`pint.json`**.
- **Queue Observability**: Use **`composer require laravel/horizon`**. Run **`php artisan horizon:install`** and configure supervisors in **`config/horizon.php`**.
- **Horizon Security**: Set authentication gates in **`HorizonServiceProvider`**. Access via **`/horizon`** in browser.

## Anti-Patterns

- **No Laravel Mix**: Migrate to Vite for faster HMR.
- **No JS in Blade templates**: Move scripts to `resources/js`.
- **No manual DB edits**: Use Artisan commands or migrations.
- **No unstyled commits**: Run `./vendor/bin/pint` before merging.

## References

- [Artisan & Vite Patterns](references/implementation.md)