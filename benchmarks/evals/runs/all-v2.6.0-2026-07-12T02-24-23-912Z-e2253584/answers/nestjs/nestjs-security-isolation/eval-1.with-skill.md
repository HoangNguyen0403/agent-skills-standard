Enforce tenant boundaries in both the application and database. Every child/family-linked table must enable PostgreSQL RLS in its creation migration, with policies based on a transaction-local setting such as `current_setting('app.current_user_id')`. Set that value in a trusted transaction context before queries.

At the service boundary, call the centralized `ChildrenService.validateChildAccess(childId, userId)` before every persistence operation. Use nested routes such as `/children/:childId/...`, response DTOs, and an entity `@Security` note; update `SECURITY.md` whenever a table or policy changes. Do not rely on a raw `/domain/:id` lookup or duplicate ad-hoc membership checks.

