# Feature-Sliced restructuring

Because the app has grown beyond a small project, group code by business domain rather than by file type. Introduce layers such as:

```text
src/
  shared/       # reusable UI, API clients, utilities
  entities/     # reusable domain data and logic
  features/     # user-facing actions, e.g. auth/login
  widgets/      # composed page sections
app/            # routing only
```

Create slices with `ui/`, `model/`, `api/`, `lib/`, or `config/` segments and expose each slice through its top-level `index.ts`. Enforce imports only downward (`App -> Widgets -> Features -> Entities -> Shared`) and keep `page.tsx` thin. Avoid creating entities until data or logic is genuinely reused across features.

