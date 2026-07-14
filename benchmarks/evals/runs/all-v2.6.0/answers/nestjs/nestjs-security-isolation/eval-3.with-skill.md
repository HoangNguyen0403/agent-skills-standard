Avoid an unscoped `/users/:id` route for child data. A root ID makes it easy to forget the tenant/child boundary and can turn an identifier lookup into an authorization bypass.

Use nested routes such as `/children/:childId/records/:recordId`, validate the authenticated user's membership through the centralized `ChildrenService`, and enforce PostgreSQL RLS as defense in depth. Every new child-linked table needs RLS policies and corresponding security documentation. Return DTOs, not raw entities or internal IDs that can bypass the intended scope.

