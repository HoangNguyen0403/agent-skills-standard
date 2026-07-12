For Next.js 14 App Router, put the route under the `app/` directory, not `pages/`. The `pages/` directory belongs to the Pages Router and should not be mixed into an App Router route unless the project intentionally supports both routers.

For example, the App Router route `/dashboard/settings` should be:

```text
app/
└── dashboard/
    └── settings/
        └── page.tsx
```

The file can export a page component:

```tsx
export default function SettingsPage() {
  return <main>Settings</main>;
}
```

If the intended route is an API endpoint, use a Route Handler instead:

```text
app/api/settings/route.ts
```

The guidance to use `pages/` is incorrect for this stated setup. Update the skill or report the inconsistency, and verify the project’s existing structure before moving files because a repository may deliberately use both routing systems during migration.
