Treat the new child-linked table as a security change. In its creation migration enable RLS and add policies that derive access from `current_setting('app.current_user_id')`; verify the application role cannot bypass the policy. Add indexes needed by policy predicates.

Before every read/write, call the centralized `ChildrenService.validateChildAccess(childId, userId)` and expose the resource under `/children/:childId/...`, not a root ID route. Add the entity security JSDoc and document the table/policy in `SECURITY.md`. Add negative tests for another tenant, direct-ID access, and missing context; map results to DTOs without leaking internal metadata.

