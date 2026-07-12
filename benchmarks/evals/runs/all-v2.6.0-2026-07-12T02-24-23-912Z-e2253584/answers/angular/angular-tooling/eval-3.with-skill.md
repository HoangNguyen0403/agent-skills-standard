Generate a production build with the bundle statistics file enabled:

```bash
ng build -c production --stats-json
```

Then inspect the generated metadata with `esbuild-visualizer`:

```bash
npx esbuild-visualizer --metadata dist/my-app/browser/stats.json --open
```

Replace `dist/my-app/browser/stats.json` with the actual configured project output path if it differs. The visualizer helps identify which dependencies or application chunks account for the bundle size. Analyze the bundle before changing `angular.json` budgets; do not lower budgets blindly, because that can hide the underlying size problem or break CI without addressing what is large.

