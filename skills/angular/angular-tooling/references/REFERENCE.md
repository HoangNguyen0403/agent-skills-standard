# Angular Tooling — Reference Examples

## Project Creation

```bash
# New project with SCSS, routing enabled
ng new my-app --style=scss --routing --strict

# Add SSR support
ng add @angular/ssr
```

## Code Generation

```bash
# Component with OnPush change detection
ng g component features/user-profile --change-detection=OnPush

# Standalone service, scoped to root
ng g service services/auth

# Functional guard (no class-based)
ng g guard guards/auth --functional

# Pipe as standalone
ng g pipe pipes/truncate --standalone

# Preview any generator first
ng g c features/dashboard --dry-run
```

## Build & Test

```bash
# Production build
ng build -c production

# Code coverage (single run)
ng test --code-coverage --watch=false

# Bundle analysis
ng build -c production --stats-json
npx esbuild-visualizer --metadata dist/my-app/browser/stats.json --open
```

## Angular Update (with migrations)

```bash
ng update                                  # list available updates
ng update @angular/core @angular/cli       # apply official codemods
```
