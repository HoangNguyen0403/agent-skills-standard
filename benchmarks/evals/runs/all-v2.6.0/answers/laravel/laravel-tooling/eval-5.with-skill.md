Move from Mix to Vite by installing the Laravel Vite plugin, defining the entry points in `vite.config.js`, and replacing Blade's `mix()` calls with `@vite()`:

```blade
@vite(['resources/css/app.css', 'resources/js/app.js'])
```

Remove `laravel-mix` and stale Mix configuration after the new build is verified. Use `npm run dev` for local HMR and `npm run build` for production. Put JavaScript in `resources/js` rather than embedding scripts in Blade templates. Vite owns the manifest and asset versioning, so manual version strings are unnecessary.

