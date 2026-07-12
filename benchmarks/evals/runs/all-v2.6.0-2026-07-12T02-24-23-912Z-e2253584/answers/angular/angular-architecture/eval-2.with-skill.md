# Recommended Angular project organization

Use a shallow, feature-based structure. A typical standalone application looks like this:

```text
src/
├── app/
│   ├── app.config.ts          # application-wide providers
│   ├── app.routes.ts          # root route table
│   ├── app.component.ts       # application shell
│   ├── core/                  # global singletons and infrastructure
│   │   ├── auth/
│   │   ├── guards/
│   │   └── interceptors/
│   ├── shared/                # reusable, mostly presentational code
│   │   ├── ui/
│   │   ├── pipes/
│   │   └── utils/
│   └── features/              # business capabilities
│       ├── dashboard/
│       │   ├── dashboard.routes.ts
│       │   ├── dashboard-page.component.ts
│       │   └── components/
│       └── profile/
│           ├── profile.routes.ts
│           └── profile-page.component.ts
└── assets/
```

Apply LIFT: make code easy to Locate, Identify its purpose, keep folders Flat, and Try not to duplicate code. Keep components, services, models, and feature-specific helpers close to the feature that owns them. Do not create top-level folders such as `components/`, `services/`, and `models/` that mix unrelated business areas.

Use standalone components, pipes, and directives for new code rather than adding NgModules. Feature entries in `app.routes.ts` should be lazy-loaded with `loadComponent` or `loadChildren`; avoid eager imports of feature pages. A feature route can then load its own page and child routes.

The `core/` directory is for application-wide infrastructure and singletons, such as `AuthService`, guards, and HTTP interceptors. The `shared/` directory is for reusable UI components, presentation-oriented directives and pipes, and pure utilities. A shared component should not become the owner of application-wide authentication or business state. If code is used only by one feature, keep it in that feature instead.

Keep barrels limited and deliberate. Direct imports are often clearer and can help tree-shaking in some build setups. Avoid deep nesting and keep presentational components simple so their data concerns remain separate from rendering concerns.

