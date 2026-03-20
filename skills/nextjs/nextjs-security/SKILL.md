---
name: nextjs-security
description: "Core security standards for App Router and Server Actions. Use when securing Next.js App Router routes, Server Actions, or API endpoints. (triggers: app/**/actions.ts, middleware.ts, action, boundary, sanitize, auth, jose)"
---

# Next.js Security

## **Priority: P0 (CRITICAL)**

## Structure

```text
app/
├── lib/
│   └── validation.ts   # Shared Zod schemas
└── middleware.ts       # Auth & Headers
```

## Implementation Guidelines

- **Action Safety**: Validate all `FormData` or JSON input using **Zod**.
- **Data Boundaries**: Never pass whole DB objects to Client Components.
- **Server-Only**: Mark sensitive logic files with `'use server-only'`.
- **CSRF**: Modern Next.js manages this, but ensure unique session origins.
- **Middleware Guarding**: Use `middleware.ts` for global route protection.
- **Sanitization**: Sanitize HTML if bypassing default React escaping.

## Anti-Patterns

- **No leaking DB fields to client**: Use DTOs; never pass raw model objects.
- **No `process.env` in client bundles**: Mark as `NEXT_PUBLIC_` only if safe to expose.
- **No unvalidated Server Action inputs**: Always validate with Zod schema.
- **No auth checks in shared Layouts**: Auth in layouts is insecure; use Middleware.

## References

- [Secure App Router Patterns](references/implementation.md)
