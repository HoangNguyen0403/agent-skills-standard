---
name: angular-tooling
description: Angular CLI usage, code generation, build configuration, and bundle optimization. Use when creating Angular projects, generating components/services/guards, configuring builds, running tests, or analyzing bundles.
metadata:
  triggers:
    files:
    - 'angular.json'
    keywords:
    - ng generate
    - ng build
    - ng serve
    - ng test
    - ng add
    - angular cli
    - bundle analysis
---
# Angular Tooling

## **Priority: P2 (OPTIONAL)**

## CLI Essentials

- **Command**: `ng generate component` (or `ng g c`)
- **Flags**: `--dry-run` previews before write. `--change-detection=OnPush` sets CD at generation. `--skip-tests` skips spec.
- **Workflow**: Always `ng generate` — **never create files manually**.

```bash
ng new my-app --style=scss --routing  # Create project
ng g c features/user-profile          # Generate component
ng g s services/auth                  # Generate service (providedIn: root)
ng g guard guards/auth                # Generate functional guard
ng g interceptor interceptors/auth    # Generate functional interceptor
ng g pipe pipes/truncate              # Generate standalone pipe
```

## Code Generation Flags

- `--dry-run` — Preview output without writing files. Always use `--dry-run` first for unfamiliar generators.
- `--skip-tests` — Skips spec file generation.
- `--flat` — Skips subfolder creation.
- `--change-detection=OnPush` — Sets CD strategy on generation.
- `--style=scss` — Sets stylesheet format.

## Build Configuration

- **Dev**: `ng serve --open`
- **Prod**: `ng build -c production`. Output goes to `dist/my-app/browser/`.
- **SSR**: `ng add @angular/ssr` then `ng build` (adds `server/` output).
- **Coverage**: `ng test --code-coverage --watch=false`. Coverage output goes to `coverage/` directory.

## Bundle Analysis

```bash
ng build -c production --stats-json
npx esbuild-visualizer --metadata dist/my-app/browser/stats.json --open
```

- **Note**: Analyze bundle before editing `angular.json` budgets — don't lower without understanding what's large.

## Update Angular

- **Check**: `ng update` — lists available updates.
- **Apply**: `ng update @angular/core @angular/cli` — runs official **codemods**.
- **Rule**: **Never use --force**; fix peer dependency conflicts instead.

## Anti-Patterns

- **No manual file creation**: Use `ng generate` for consistency and proper registration.
- **No `ng update --force`**: Fix peer dependency conflicts instead of skipping.
- **No hand-editing angular.json budgets**: Analyze bundles first — lower budgets break CI.

## References

- [CLI Commands & Build Examples](references/REFERENCE.md)

- [Angular CLI Docs](https://angular.dev/tools/cli)
