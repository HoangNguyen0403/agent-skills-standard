---
name: angular-tooling
description: "Angular CLI usage, code generation, build configuration, and bundle optimization. Use when creating Angular projects, generating components/services/guards, configuring builds, running tests, or analyzing bundles. (triggers: angular.json, ng generate, ng build, ng serve, ng test, ng add, angular cli, bundle analysis)"
---

# Angular Tooling

## **Priority: P2 (OPTIONAL)**

## CLI Essentials

```bash
ng new my-app --style=scss --routing  # Create project
ng g c features/user-profile          # Generate component
ng g s services/auth                  # Generate service (providedIn: root)
ng g guard guards/auth                # Generate functional guard
ng g interceptor interceptors/auth    # Generate functional interceptor
ng g pipe pipes/truncate              # Generate standalone pipe
```

## Code Generation Flags

- `--dry-run` — Preview output without writing files.
- `--skip-tests` — Skip spec file generation.
- `--flat` — No subfolder created.
- `--change-detection=OnPush` — Set CD strategy on generation.

## Build Configuration

- **Dev**: `ng serve --open`
- **Prod**: `ng build -c production` (outputs to `dist/my-app/browser/`)
- **SSR**: `ng add @angular/ssr` then `ng build` (adds `server/` output)
- **Coverage**: `ng test --code-coverage --watch=false`

## Bundle Analysis

```bash
ng build -c production --stats-json
npx esbuild-visualizer --metadata dist/my-app/browser/stats.json --open
```

## Update Angular

```bash
ng update                           # Check available updates
ng update @angular/core @angular/cli  # Apply update (runs codemods)
```

## Anti-Patterns

- **No manual file creation**: Always use `ng generate` for consistency and proper registration.
- **No `ng update --force`**: Fix peer dependency conflicts instead of skipping checks.
- **No hand-editing angular.json budgets**: Lower budgets cause CI failures; analyze bundles first.

## References

- [Angular CLI Docs](https://angular.dev/tools/cli)
