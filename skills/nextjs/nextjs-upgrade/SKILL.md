---
name: nextjs-upgrade
description: 'Next.js version migrations using official guides and codemods. Use when migrating a Next.js project to a new major version using codemods. (triggers: package.json, next upgrade, migration guide, codemod)'
---

# Next.js Upgrade Protocol

Automated and manual migration steps for Next.js version upgrades (e.g., v14 → v15).

## **Priority: P1 (OPERATIONAL)**

## Implementation Guidelines

- **Upgrade Detection**: Always check **`package.json`** for versions of `next`, `react`, and `react-dom`.
- **Planning**: For major version jumps (v13 to v15), perform an **incremental upgrade** (v13 -> v14, then v14 -> v15). Follow the official **Next.js Migration Guides**.
- **Automated Codemods**: Use **`npx @next/codemod@latest <transform> <path>`** to automate syntax migration.
- **Breaking Changes (v15)**: Respond to the **`next-async-request-api`** transform by ensuring **`params`**, **`searchParams`**, **`cookies()`**, and **`headers()`** are awaited.
- **React Parity**: Upgrade **`react`** and **`react-dom`** to match Next.js peer dependencies (e.g., React 19 for Next.js 15).
- **Validation**: Run **`next dev`** and **`next build`** after each incremental step. Check **Console errors** for hydration warnings.
- **Reporting**: Report all **codemod failures** or manual fixes needed to the team.

## **3. Dependency Update**

Upgrade Next.js and peer dependencies in sync:

```bash
# Using npm
npm install next@latest react@latest react-dom@latest

# Update Types
npm install --save-dev @types/react@latest @types/react-dom@latest
```

## **4. Manual Verification Rules**

1. **Async Context**: Verify all uses of `cookies()`, `headers()`, and route `params` are now awaited.
2. **Metadata**: Ensure `generateMetadata` types match the new async `params` signature.
3. **Caching**: In v15+, `fetch` defaults to `{ cache: 'no-store' }`. If you need the old behavior, explicitly set `{ cache: 'force-cache' }`.

## **5. Testing Build**

- Run `npm run build` immediately after codemods and package updates.
- Check for "Hydration failed" or "Turbopack" compatibility errors if using `--turbo`.

## Anti-Patterns

- **No major version skipping**: Upgrade one major version at a time (13→14, then 14→15).
- **No manual breaking-change fixes**: Always run `npx @next/codemod@latest` transforms first.
- **No assumed caching behavior post-upgrade**: v15 defaults to `no-store`; audit all `fetch` calls.
- **No async page functions in Pages Router**: `export default async function Page()` is fatal.
