# React monolith and oversized-file audit

Large files do not by themselves prove that a React codebase is a monolith. A frontend can be a well-structured modular monolith, which is often a sensible intermediate architecture. The concern is whether unrelated features are tightly coupled and must be changed, built, tested, or deployed together.

I would begin by measuring file size, function/component complexity, import fan-in and fan-out, circular dependencies, shared-state usage, and route-level bundle boundaries. A large component is especially risky when it mixes rendering, data fetching, mutation commands, form state, navigation, permissions, analytics, and feature-specific business rules. Other warning signs include a global “common” folder that imports feature code, a single store containing every domain, pages importing one another’s internals, cross-feature utility code with unclear ownership, and changes to one feature causing broad test or bundle impact.

Useful heuristics are to review components that are several hundred lines long, functions with many branches or effects, and modules with unusually high dependency counts. These are triage thresholds rather than architectural laws: a long generated file or a cohesive table definition may be harmless, while a shorter component with many responsibilities may be more problematic.

A practical target is feature-oriented ownership with explicit dependency direction, for example:

`app shell/routes -> feature modules -> domain/data modules -> shared UI and platform utilities`

Each feature should expose a small public API and keep its implementation details private. Route-level code splitting should isolate independently navigable areas, while shared packages should contain genuinely generic code and must not import feature-specific modules. State should live at the narrowest useful scope; global state should be reserved for cross-cutting concerns that truly require it.

For an oversized component, first identify responsibilities and preserve behavior with tests. Then extract cohesive pieces in a low-risk order: data access into a hook or feature data module, state transitions into a reducer or model, repeated visual pieces into components, and feature rules into domain functions. Splitting a file into many arbitrary files without changing ownership or dependencies only creates a distributed monolith.

I would prioritize remediation using change frequency, defect history, build/test impact, and dependency centrality—not line count alone. Track whether feature changes affect fewer modules, whether route bundles shrink, whether circular imports disappear, and whether unit tests can exercise feature logic without rendering the entire application. Those measures distinguish a real modularity improvement from cosmetic file splitting.

