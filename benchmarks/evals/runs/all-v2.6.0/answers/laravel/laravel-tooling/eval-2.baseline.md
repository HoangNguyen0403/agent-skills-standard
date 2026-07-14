Laravel's Vite integration uses `laravel-vite-plugin`. Install frontend dependencies, configure the plugin, and reference entry points with the Blade directive:

```js
// vite.config.js
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [laravel(['resources/css/app.css', 'resources/js/app.js'])],
});
```

```blade
@vite(['resources/css/app.css', 'resources/js/app.js'])
```

Use `npm run dev` for the Vite server and `npm run build` for production assets. Commit the lockfile, configure the required Node version, and ensure the deployed `public/build/manifest.json` is produced. Do not hardcode dev-server URLs or skip production build verification.

