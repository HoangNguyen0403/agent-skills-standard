Define CSS and JavaScript as Vite entry points and include them from the Blade layout:

```js
// vite.config.js
export default defineConfig({
    plugins: [laravel(['resources/css/app.css', 'resources/js/app.js'])],
});
```

```blade
@vite(['resources/css/app.css', 'resources/js/app.js'])
```

Run `npm run dev` during development and `npm run build` for the production bundle. Keep asset code in `resources/`, use the Laravel plugin for integration, and avoid manual database or asset-manifest edits. Verify the built application serves the generated assets and that Mix is not still being invoked.

