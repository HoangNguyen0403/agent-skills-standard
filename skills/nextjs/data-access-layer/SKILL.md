---
name: Next.js Data Access Layer
description: Secure, reusable data access patterns with DTOs and Taint checks.
metadata:
  labels: [nextjs, dal, architecture, security]
  triggers:
    files: ['**/lib/data.ts', '**/services/*.ts', '**/dal/**']
    keywords: [DAL, Data Access Layer, server-only, DTO]
---

# Data Access Layer (DAL)

## **Priority: P1 (HIGH)**

Centralize all data access (Database & External APIs) to ensure consistent security, authorization, and caching.

## Principles

1. **Server-Only**: Must include `import 'server-only'` to prevent Client bundling.
2. **Auth Co-location**: Auth checks (`session.role`) must be **inside** the DAL function.
3. **DTO Transformation**: Return plain objects (DTOs), never raw ORM instances.
4. **No Internal Fetch**: Call DAL functions directly. Do not `fetch('localhost/api')`.

## Implementation

| Approach              | When to use                                      | Reference                           |
| :-------------------- | :----------------------------------------------- | :---------------------------------- |
| **API Gateway (BFF)** | Enterprise apps with separated Backend (NestJS). | [Pattern A](references/patterns.md) |
| **Direct DB**         | Fullstack apps or Admin Panels.                  | [Pattern B](references/patterns.md) |

## Limitations

- **Client Components**: Cannot import DAL files. Must use Server Actions or Route Handlers as bridges.
