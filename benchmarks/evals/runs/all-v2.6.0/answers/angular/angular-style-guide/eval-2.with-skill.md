Name Angular classes in `PascalCase` and include the construct's type suffix. The filename and class name should describe the same thing:

```text
hero-list.component.ts  -> HeroListComponent
user-profile.service.ts -> UserProfileService
truncate.pipe.ts        -> TruncatePipe
auth.guard.ts            -> AuthGuard
```

For components, use the `Component` suffix; for services, use `Service`. Keep each component or service in its own file. This makes files easy to identify and locate. Selectors should also follow the Angular conventions: components commonly use a kebab-case `app-` selector such as `app-hero-list`, while directive selectors use a camelCase `app` prefix such as `[appHighlight]`.

