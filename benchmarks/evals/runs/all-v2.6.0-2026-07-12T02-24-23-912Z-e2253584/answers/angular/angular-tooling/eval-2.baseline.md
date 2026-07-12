# Production build

Run the build from the Angular workspace root:

```bash
ng build --configuration production
```

For a workspace with multiple applications, specify the project:

```bash
ng build my-app --configuration production
```

The production configuration normally enables optimization, minification, dead-code elimination, hashing, and production environment replacements. The compiled files are written below `dist/`, usually in `dist/<project-name>`; the exact layout depends on the Angular version and builder.

Before deploying, inspect the build output and resolve errors or budget warnings. Confirm that the production configuration points at the intended API endpoints and other environment values. If the app is hosted below a path, set the appropriate base URL, for example `--base-href=/my-app/`, or configure it in the project settings.

`--prod` is an obsolete form on newer Angular CLI versions; prefer the explicit `--configuration production` form. A successful build is not a substitute for serving the generated files from the same kind of static host and testing routing, asset paths, and runtime configuration in a production-like environment.

