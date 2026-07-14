Use the default singleton scope unless a provider genuinely needs request-local state such as tenant context or request caching. Request scope has a transitive cost: one request-scoped provider can make its dependency chain request-scoped and increase allocation/GC overhead on every request.

Measure before opting in and document the reason. For multi-tenant context, consider durable providers or an explicit context carrier that avoids making the whole graph request-scoped. Do not use `REQUEST` as a convenient way to hold mutable state in a service.

