# Generate a component

From the root of an Angular workspace, run:

```bash
ng generate component user-profile
# shorthand:
ng g c user-profile
```

The CLI creates the component TypeScript, template, stylesheet, and (unless disabled) spec files. In current Angular versions components are standalone by default; in older or module-based projects, the CLI may also add the component to the appropriate NgModule.

You can create a nested component and choose options at the same time:

```bash
ng g c features/profile/user-card --style=scss --skip-tests
```

Useful options include `--path` to choose the destination, `--project` for a multi-project workspace, `--flat` to avoid creating a directory, `--skip-tests` to omit the spec file, and `--standalone` to explicitly select standalone behavior. Use `ng generate component --help` to see options supported by the installed CLI. Use the workspace-local executable (`npx ng`, `pnpm exec ng`, or the package-manager equivalent) when you want to guarantee that the project’s CLI version is used.

