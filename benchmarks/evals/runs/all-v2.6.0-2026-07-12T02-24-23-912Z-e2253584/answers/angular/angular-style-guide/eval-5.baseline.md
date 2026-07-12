Barrel files are entry-point files, commonly named `index.ts`, that re-export selected symbols from a directory. Use them selectively at a clear public boundary, such as a reusable library, a shared UI package, or a feature’s intentionally public API:

```ts
// shared/ui/index.ts
export { AppButtonComponent } from './app-button/app-button.component';
export { EmptyStateComponent } from './empty-state/empty-state.component';
```

Consumers can then import from the boundary instead of knowing every implementation path. Keep the barrel’s exports explicit when possible; this documents the public API and prevents private helpers from becoming supported accidentally. A package’s root `public-api.ts` should similarly expose only the symbols intended for package consumers.

Do not create a barrel in every directory or a single enormous application-wide barrel by default. Keep implementation details private, and use direct imports for code that is internal to a feature when that is clearer. Be especially careful with barrel imports between sibling modules: a barrel that re-exports modules which import back through the barrel can create circular dependencies, confusing initialization behavior, and harder-to-diagnose tests. Organize barrels around stable ownership boundaries, avoid `export *` when it hides the API surface, and check the project’s build and lint rules.

Barrels are an ergonomics tool, not a requirement of Angular. The best arrangement is the one that gives external consumers a small, stable import surface without obscuring dependency direction or introducing cycles.

