---
name: nextjs-upgrade
description: Next.js version migrations using official guides and codemods. Use when migrating a Next.js project to a new major version using codemods.
metadata:
  triggers:
    files:
    - 'package.json'
    keywords:
    - next upgrade
    - migration guide
    - codemod
---
# Next.js Upgrade Protocol

Automated and manual migration steps for Next.js version upgrades (e.g., v14 to v15).

## **Priority: P1 (OPERATIONAL)**

## Workflow: Upgrade Next.js to New Major Version

1. Check current versions of `next`, `react`, `react-dom` in `package.json`
2. Plan incremental path (e.g., v13 -> v14 -> v15; never skip majors)
3. Run codemods: `npx @next/codemod@latest <transform> <path>`
4. Update dependencies:
 See [implementation examples](references/example.md)
5. Verify async APIs: ensure `cookies()`, `headers()`, `params` awaited (v15+)
6. Audit `fetch` caching: v15 defaults to `no-store`; add `force-cache` where needed
7. Run `next build` and fix hydration or Turbopack errors
8. Report codemod failures or manual fixes to team

## Implementation Guidelines

- **Upgrade Detection**: Always check `package.json` for versions of `next`, `react`, and `react-dom`.
- **Planning**: For major version jumps (v13 to v15), perform incremental upgrade (v13 -> v14, then v14 -> v15). Follow official Next.js Migration Guides.
- **Automated Codemods**: Use `npx @next/codemod@latest <transform> <path>` to automate syntax migration.
- **Breaking Changes (v15)**: Respond to `next-async-request-api` transform by ensuring `params`, `searchParams`, `cookies()`, and `headers()` awaited.
- **React Parity**: Upgrade `react` and `react-dom` to match Next.js peer dependencies (e.g., React 19 for Next.js 15).
- **Validation**: Run `next dev` and `next build` after each incremental step. Check console errors for hydration warnings.

## Anti-Patterns

- **No major version skipping**: Upgrade one major version at time (13 -> 14, then 14 -> 15).
- **No manual breaking-change fixes**: Always run `npx @next/codemod@latest` transforms first.
- **No assumed caching behavior post-upgrade**: v15 defaults to `no-store`; audit all `fetch` calls.
- **No async page functions in Pages Router**: `export default async function Page()` fatal.