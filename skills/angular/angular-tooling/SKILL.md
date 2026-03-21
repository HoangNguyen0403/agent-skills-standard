---
name: angular-tooling
description: 'Angular CLI usage, code generation, build configuration, and bundle optimization. Use when creating Angular projects, generating components/services/guards, configuring builds, running tests, or analyzing bundles. (triggers: angular.json, ng generate, ng build, ng serve, ng test, ng add, angular cli, bundle analysis)'
---

# Angular Tooling

## **Priority: P2 (OPTIONAL)**

## CLI Essentials

- **Command**: `ng generate component` (or `ng g c`)
- **Flags**: Use `--dry-run` to preview output first. Add `--change-detection=OnPush` to set CD strategy at generation time. Use `--skip-tests` if spec is not needed.
- **Workflow**: Always use `ng generate` — **never create files manually**.

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

- **Note**: Check `angular.json` budgets — do not hand-edit `angular.json budgets` values; analyze the bundle first to understand what's large.

## Update Angular

- **Command**: `ng update` to check available updates.
- **Apply**: `ng update @angular/core @angular/cli` — this runs official **codemods** to migrate your code.
- **Rule**: **Never use --force**; fix peer dependency conflicts properly instead.

## Anti-Patterns

- **No manual file creation**: Always use `ng generate` for consistency and proper registration.
- **No `ng update --force`**: Fix peer dependency conflicts instead of skipping checks.
- **No hand-editing angular.json budgets**: Lower budgets cause CI failures; analyze bundles first.

## References

- [Angular CLI Docs](https://angular.dev/tools/cli)
