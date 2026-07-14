Run the build from the Angular workspace root with the production configuration:

```bash
ng build -c production
```

`--configuration production` is the long form of `-c production`:

```bash
ng build --configuration production
```

For a named multi-project workspace, include the project name, for example `ng build my-app -c production`. The compiled browser output is normally written under `dist/my-app/browser/` (using the project’s configured output path). This is the build intended for production optimization and budget checks, rather than the development server started by `ng serve`.

