Move from a type-based `components/` directory to feature-oriented modules. Keep route files as composition points and put feature behavior, UI, schemas, and tests together:

```text
src/
  app/                       # routes, layouts, loading/error boundaries
  features/
    billing/                 # components, actions, queries, schema, tests
    catalog/
  shared/                    # deliberately generic UI and utilities
  server/                    # DB, integrations, server-only services
```

Define dependency rules: features may use shared and server abstractions, but should not import another feature's internals. Cross-feature workflows belong in an application/use-case layer or a route-level composition module. Keep server-only code behind `server-only`, expose DTOs rather than database clients, and use aliases consistently. Migrate incrementally: choose a feature, move its code and imports, add a boundary/lint rule, and repeat. Avoid creating a second giant `utils` or `components` bucket; a module belongs in shared only when it has no feature-specific meaning.

