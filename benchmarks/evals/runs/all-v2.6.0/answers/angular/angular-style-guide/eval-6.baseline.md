Organize an Angular application primarily by feature, not by technical artifact. A feature folder should contain the components, routes, services, models/types, and tests that belong to that feature. Co-locate a component’s TypeScript, template, stylesheet, and spec so changes are easy to find.

A representative structure is:

```text
src/
  main.ts
  app/
    app.component.ts
    app.component.html
    app.component.scss
    app.config.ts
    app.routes.ts
    core/
      auth/
      http/
      layout/
    shared/
      ui/
      pipes/
      directives/
    orders/
      order-list/
        order-list.component.ts
        order-list.component.html
        order-list.component.scss
        order-list.component.spec.ts
      order-detail/
      orders.routes.ts
      orders.api.ts
```

The exact `core` and `shared` folders are optional. `core` is useful for application-wide infrastructure or singleton concerns; `shared` is for genuinely reusable, feature-independent UI and utilities. Do not use them as dumping grounds. Keep feature-specific code inside its feature, and put reusable code in a shared library when it is shared across applications.

Avoid large top-level folders such as `components/`, `services/`, and `models/` that force developers to search across unrelated features. Keep the root shallow, add nesting when a feature becomes large enough to need subfolders, and use descriptive kebab-case names. Standalone components and lazy-loaded routes fit naturally in this structure: each route can own its feature boundary and load only the code it needs.

