---
name: laravel-tooling
description: 'Ecosystem management, Artisan, and asset bundling. Use when managing Composer dependencies, Artisan commands, or Vite asset bundling in Laravel. (triggers: package.json, composer.json, vite.config.js, artisan, vite, horizon, pint, blade)'
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

### Artisan Commands

- **Customization**: Use **`php artisan make:command SendNewsletters`**.
- **Definitions**: Define **`protected $signature = 'newsletters:send {--queue}'`**.
- **Execution**: Implement **`handle(): int`**. Commands are **auto-discovered** in **`app/Console/Commands/`**.
- **Scheduling**: Schedule in **`bootstrap/app.php`** (formerly Kernel).

### Asset Management (Vite)

- **Scaffolding**: Run **`npm install`** and configure **`vite.config.js`** with the Laravel plugin.
- **Blade Integration**: Add the @vite directive (`@vite(['resources/css/app.css', 'resources/js/app.js'])`) to your layout.
- **Migration**: Use Vite (not Mix) — replace mix() with vite() in Blade templates and remove laravel-mix.
- **Workflow**: Run `npm run dev` for local HMR and `npm run build for production`. No manual versioning needed.

### Code Quality & Monitoring

- **Pint Styling**: Enforce standards with **`composer require laravel/pint --dev`**.
- **Usage**: Run **`./vendor/bin/pint`** to apply the `preset: 'laravel'` configuration from **`pint.json`**.
- **Queue Observability**: Use **`composer require laravel/horizon`**. Run **`php artisan horizon:install`** and configure supervisors in **`config/horizon.php`**.
- **Horizon Security**: Set authentication gates in **`HorizonServiceProvider`**. Access via **`/horizon`** in browser.

## Anti-Patterns

- **No Laravel Mix**: Migrate to Vite for faster HMR.
- **No JS in Blade templates**: Move scripts to `resources/js`.
- **No manual DB edits**: Use Artisan commands or migrations.
- **No unstyled commits**: Run `./vendor/bin/pint` before merging.

## References

- [Artisan & Vite Patterns](references/implementation.md)
