# Organizing a growing React Native project

Organize by feature or domain rather than by file type. A practical structure is:

```text
src/
  app/                 # providers, navigation, startup/bootstrap
  features/
    auth/
      api.ts
      hooks.ts
      screens/
      components/
      types.ts
    orders/
      api.ts
      screens/
      components/
  components/           # genuinely shared, domain-neutral UI
  services/              # shared API client, analytics, storage
  theme/
  utils/
  types/
```

Keep screen components focused on composition and user interaction. Put server access in feature API modules, reusable behavior in hooks, and domain rules in services or pure functions. Keep navigation definitions in one or a few navigators, with route parameter types exported centrally. Promote code to `components/` only after it is actually reused; avoid a giant “common” folder.

Add boundaries that match the app: linting/import rules, a consistent naming convention, tests beside the code they exercise, and a clear dependency direction from app/features toward shared infrastructure. Split a feature further only when its size or ownership requires it. The goal is discoverability and low coupling, not maximum folders.

