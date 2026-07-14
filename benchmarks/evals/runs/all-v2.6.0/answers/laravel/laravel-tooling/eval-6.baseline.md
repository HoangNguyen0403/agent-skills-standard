Declare CSS and JavaScript entry points in Vite and include them from the Blade layout:

```js
// vite.config.js
export default defineConfig({
    plugins: [laravel(['resources/css/app.css', 'resources/js/app.js'])],
});
```

```blade
@vite(['resources/css/app.css', 'resources/js/app.js'])
```

Import component modules from `resources/js/app.js`, use `npm run dev` for development, and run `npm run build` in CI/deployment. Verify generated assets and the manifest, cache-busting, CSS processing, and any images/fonts referenced from CSS. Keep source files in the configured entry graph and avoid loading unbundled user-controlled paths.

