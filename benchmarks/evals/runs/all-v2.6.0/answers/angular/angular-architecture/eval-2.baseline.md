# Organizing files in an Angular project

Prefer feature-first organization: group files by the business capability they implement, then use small role-based subfolders only when they add clarity. A project-wide type-based layout such as `components/`, `services/`, and `models/` makes one feature's code span many unrelated directories and weakens ownership boundaries.

A practical structure is:

```text
src/app/
  app.component.ts
  app.config.ts
  app.routes.ts
  core/
    auth/
    http/
    layout/
  shared/
    ui/
    directives/
    pipes/
    utilities/
  billing/
    pages/
    ui/
    data-access/
    models/
    billing.routes.ts
  reports/
    pages/
    ui/
    data-access/
    reports.routes.ts
```

Use these boundaries intentionally:

- `core` contains application-wide infrastructure and policies, such as authentication, HTTP interceptors, global layout, and configuration. It should not become a dumping ground for feature code.
- `shared` contains reusable, feature-agnostic components, directives, pipes, and pure helpers. Shared code should not depend on a particular feature or contain feature-specific state.
- A feature folder owns its routes, page/container components, presentational UI, API/data-access services, state, and domain models. Co-locate tests with the code they verify.

For a small application, this can be flatter; the important rule is ownership and dependency direction, not a fixed number of folders. A feature may have `ui` and `data-access` subfolders once it grows, but avoid creating a folder for every individual file.

Keep reusable code close to its narrowest consumer. If a component is used only by `billing`, keep it in `billing`; move it to `shared` only after it is genuinely reusable and its API is domain-neutral. Import dependencies from stable public entry points where useful, and keep the dependency direction from app shell to features to shared primitives. This reduces accidental coupling and makes lazy-loading boundaries easier to maintain.


