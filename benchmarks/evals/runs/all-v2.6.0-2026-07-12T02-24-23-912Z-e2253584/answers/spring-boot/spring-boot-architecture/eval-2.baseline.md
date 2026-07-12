# Avoiding circular dependencies

A cycle usually means two components own overlapping responsibilities. Break it by moving shared rules into a cohesive domain object or third component, introducing a narrow port at the correct boundary, separating orchestration from low-level operations, or publishing an application event when the relationship is naturally asynchronous.

Prefer constructor injection so cycles fail fast and remain visible. `@Lazy` can defer construction but is only a tactical workaround. Avoid a generic shared service that becomes a dependency sink. Across bounded contexts, use an explicit contract or adapter rather than importing the other context's internals.



