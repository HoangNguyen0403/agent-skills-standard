---
name: nestjs-security-isolation
description: "Standards for multi-tenant isolation and PostgreSQL Row Level Security. Use when enforcing tenant isolation or PostgreSQL RLS in NestJS multi-tenant apps. (triggers: src/modules/**, SECURITY.md, src/migrations/**, RLS, Row Level Security, childId, isolation, access policy)"
---

## **Priority: P0 (CRITICAL)**

Strict multi-tenant isolation. All child-centric data must be secured via PostgreSQL RLS and service-level validation.

## RLS Enforcement Workflow

1. **Migration**: Create tables with `ENABLE ROW LEVEL SECURITY`. Define policies using `current_setting('app.current_user_id')`.
2. **Entity Logic**: Add `@Security` JSDoc to the entity class.
3. **Security Doc**: Update `SECURITY.md` with the new table and its access logic.
4. **Service Validation**: Call `childrenService.validateChildAccess(childId, userId)` before any persistence operation.

## Core Guidelines

1. **Mandatory RLS**: Every new table linking to a `child` or `family` MUST have RLS enabled in its creation migration.
2. **Centralized Validation**: Never reimplement access logic. Use `ChildrenService` for child/family membership checks.
3. **Traceable Security**: `SECURITY.md` is the source of truth. Any change to RLS policies must be reflected there immediately.
4. **Nested Route Constraint**: Data isolation is enforced at the controller level via nested routes: `/children/:childId/...`.
5. **No Direct Entity exposure**: Use Response DTOs to prevent leaking internal database IDs or metadata that could bypass security filters.

## Anti-Patterns

- **No Public Tables**: Don't create child-linked tables without RLS.
- **No Manual Policy Checks**: Don't write raw SQL access checks in services. Use the centralized validator.
- **No Stale Docs**: Don't merge RLS changes without updating `SECURITY.md` and entity JSDoc.
- **No Root IDs**: Don't use `/domain/:id` for child data. Always scope by `:childId`.

## References

- [Implementation Patterns](references/implementation-patterns.md)
- [RLS Migration Patterns](references/rls-patterns.md)
- [Centralized Auth Logic](references/auth-logic.md)
