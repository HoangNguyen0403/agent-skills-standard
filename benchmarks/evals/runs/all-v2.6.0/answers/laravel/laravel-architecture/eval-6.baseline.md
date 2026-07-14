For a controller change, first identify the route contract, actor permissions, input/output shape, side effects, and failure cases. Check existing routes, requests, policies, resources, models, migrations, and tests before editing.

Then make the smallest coherent change: put validation in a Form Request, authorization in a policy/gate, orchestration in the controller or an action, and response mapping in a resource/response class. Add or update feature tests for success, validation, authorization, missing resources, and important side effects. Run focused tests, formatting/static checks, and the relevant full suite; review the diff for mass-assignment, N+1, transaction, and status-code issues.

