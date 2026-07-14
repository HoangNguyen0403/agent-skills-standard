Replace Mix's webpack configuration with Vite's `vite.config.js`, install `vite` and `laravel-vite-plugin`, and update Blade templates from `mix()` to `@vite()`:

```js
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [laravel(['resources/css/app.css', 'resources/js/app.js'])],
});
```

Update `package.json` scripts to `vite`/`vite build`, move entry imports to the configured files, and remove obsolete Mix configuration/dependencies after the build works. Check aliases, Sass/PostCSS behavior, copied assets, environment variables, hot reload, and production manifest output. Run both development and production builds and update CI/deployment commands.

