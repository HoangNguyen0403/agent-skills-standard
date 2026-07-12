🚨 SKILL VIOLATION DETECTED
Skill:        common-feedback-reporter (with active Next.js skill)
File:         app/users/[id]/page.tsx:1
Rule:         Follow the framework's active routing model; Next.js 14 App Router routes belong under `app/`, not `pages/`.
Violation:    The guidance directs an App Router route into the legacy `pages/` directory.
Fix:          Place the route at `app/users/[id]/page.tsx` and export the page component there. Use `pages/` only when intentionally using the Pages Router.
Auto-fixed:   YES
Root Cause:   OUTDATED_GUIDANCE
User Intent:  Add a route compatible with the project's Next.js 14 App Router setup.
Skill Gap:   The skill should distinguish App Router from Pages Router and require checking the project's Next.js version and existing directory structure before giving a route path. A short router-selection table would prevent this mismatch.
Co-skills:    typescript-best-practices, typescript-language

Corrected route example:

```tsx
// app/users/[id]/page.tsx
export default function UserPage({ params }: { params: { id: string } }) {
  return <main>User: {params.id}</main>;
}
```
