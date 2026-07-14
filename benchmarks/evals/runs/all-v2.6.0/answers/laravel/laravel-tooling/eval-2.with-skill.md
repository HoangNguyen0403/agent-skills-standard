Use Vite with the Laravel plugin and load the entry points through Blade:

```bash
npm install
```

```js
// vite.config.js
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [laravel(['resources/css/app.css', 'resources/js/app.js'])],
});
```

```blade
@vite(['resources/css/app.css', 'resources/js/app.js'])
```

Use `npm run dev` for HMR and `npm run build` for production. Vite handles asset versioning; do not add manual cache-busting logic or keep Laravel Mix configuration in parallel.

