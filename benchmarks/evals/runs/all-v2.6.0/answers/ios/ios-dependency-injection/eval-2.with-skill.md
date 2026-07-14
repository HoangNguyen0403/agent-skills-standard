Common iOS dependency-injection anti-patterns to avoid:

- Global singletons as the default for services. They hide dependencies, create shared mutable state, and make tests brittle.
- Resolving dependencies inline inside business logic or view models, like calling a container or `resolve()` from the object itself. Prefer passing dependencies in from the outside.
- Depending on concrete classes instead of protocols. That tightly couples code and makes mocking or swapping implementations harder.
- Skipping initializer injection in favor of late-bound property injection everywhere. Initializer injection makes required dependencies explicit and prevents partially configured objects.
- Using the wrong object scope, such as making short-lived view models singletons or recreating app-wide services repeatedly. Match lifetime to usage.
- Letting the DI container leak across the codebase. Keep container usage near composition roots rather than scattered through feature logic.
- Registering too much magic or implicit behavior in the container, so object creation becomes hard to trace and debug.

Good default: use protocol-based dependencies, inject through `init`, and keep service registration centralized.

