---
name: nextjs-data-access-layer
description: 'Secure, reusable data access patterns with DTOs and Taint checks. Use when building a data access layer with DTOs and server-side taint checking in Next.js. (triggers: **/lib/data.ts, **/services/*.ts, **/dal/**, DAL, Data Access Layer, server-only, DTO)'
---

# Data Access Layer (DAL)

## **Priority: P1 (HIGH)**

Centralize all data access (Database & External APIs) to ensure consistent security, authorization, and caching.

## Implementation Guidelines

- **Architecture**: Create a **Data Access Layer (DAL)** in a **`services/`** or **`lib/data.ts`** file. Use **`import 'server-only'`** to prevent leaking backend logic to the client bundle.
- **DTOs**: Always transform raw DB/API data into **Data Transfer Objects (DTOs)** before returning to components. This prevents leaking sensitive fields (e.g., `passwordHash`).
- **Security**: Use **`taintObjectReference`** or **`taintUniqueValue`** from the **`experimental_taint`** API to ensure sensitive data never accidentally reaches Client Components.
- **Authorization**: **Colocate auth checks** inside every DAL function. Don't rely on the UI layer to enforce safety. Use **`await auth()`** to verify the user.
- **Caching**: Wrap DAL functions in **`cache()`** from React to deduplicate requests within a single render cycle, preventing redundant DB/API calls.
- **Error Handling**: Throw **standardized errors** (e.g., `NotFoundError`, `UnauthorizedError`) to be caught by **Next.js `error.tsx`** or **`notFound()`**.

## Limitations

- **Client Components**: Cannot import DAL files. Must use Server Actions or Route Handlers as bridges.

## Anti-Patterns

- **No auth checks outside DAL**: Auth verification must live inside DAL functions.
- **No raw ORM instances returned**: Transform to plain DTO objects before returning.
- **No `fetch('localhost/api')` in Server Components**: Call DAL functions directly.
- **No DAL imports in Client Components**: Use Server Actions or Route Handlers as bridges.
