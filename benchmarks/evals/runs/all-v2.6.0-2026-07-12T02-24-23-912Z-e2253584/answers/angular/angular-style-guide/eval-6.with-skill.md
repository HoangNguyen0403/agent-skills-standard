Organize the application into shallow, responsibility-based areas under `src/app/`:

```text
src/app/
  core/                         # singletons and global state
  shared/                       # reusable UI components and pipes
  features/                     # lazy-loaded feature areas
    auth/
    heroes/
      hero-list/
      hero-detail/
```

Put application-wide singleton services and global state in `core`. Put reusable UI pieces and pipes in `shared`. Put user-facing domains in `features`, with feature areas lazy-loaded where appropriate. Keep folder depth at three levels or less, use a flat structure where possible, and name files with descriptive kebab-case type suffixes such as `hero-list.component.ts` and `hero.service.ts`.

