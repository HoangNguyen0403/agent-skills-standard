# Where shared utilities and global services belong

Separate reusable code from application-wide infrastructure:

```text
src/app/
├── core/
│   ├── auth/auth.service.ts
│   ├── guards/auth.guard.ts
│   └── interceptors/auth.interceptor.ts
├── shared/
│   ├── ui/empty-state.component.ts
│   ├── pipes/date-label.pipe.ts
│   └── utils/format-currency.ts
└── features/
    └── billing/
        └── services/billing-api.service.ts
```

Put global singletons and cross-cutting infrastructure in `core/`: authentication/session services, route guards, HTTP interceptors, and other services that represent one application-wide concern. Provide them through `providedIn: 'root'` or the application providers in `app.config.ts`, as appropriate. A feature-only service should remain inside that feature even if it uses dependency injection.

Put reusable presentation code in `shared/`: UI components, pipes, directives, and pure utilities that can be used by multiple features. Shared code should not own global authentication, navigation policy, or application-wide business state. In particular, do not place singleton services in `shared/`, because that blurs the ownership and lifetime boundary.

Keep a utility in its feature when it is meaningful only there; promote it to `shared/utils/` only after it has a genuine cross-feature use. Prefer direct imports and avoid deep folder nesting or indiscriminate barrel exports. New shared components, pipes, and directives should be standalone, and feature routes should still be lazy-loaded with `loadComponent` or `loadChildren`.

