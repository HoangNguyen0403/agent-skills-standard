# Analyze bundle size

First produce an optimized build and, when supported by the installed builder, request build statistics:

```bash
ng build my-app --configuration production --stats-json
```

Inspect the generated `dist/my-app` directory (or the path printed by the CLI). Compare the JavaScript and CSS chunk sizes, and measure the files that would actually be deployed rather than source maps. For transfer-size estimates, inspect minified files and also gzip or Brotli sizes, since those are closer to what browsers download.

For a visual module breakdown, use a source-map or stats analyzer compatible with the project’s builder. For example, after generating source maps:

```bash
ng build my-app --configuration production --source-map
npx source-map-explorer 'dist/my-app/**/*.js'
```

If the CLI produces a compatible `stats.json`, a bundle analyzer can open it, for example:

```bash
npx webpack-bundle-analyzer dist/my-app/stats.json
```

The exact analyzer and output glob may need adjustment for the Angular version and whether the application uses the esbuild or webpack builder. Look for unexpectedly large dependencies, duplicated packages, polyfills, lazy routes that are not actually lazy, and code included in the initial chunk unnecessarily. Set or review `budgets` in `angular.json` so CI fails or warns when initial or component styles exceed an agreed size. Use browser DevTools Coverage to find code unused at runtime; it complements, but does not replace, build-time bundle analysis.

