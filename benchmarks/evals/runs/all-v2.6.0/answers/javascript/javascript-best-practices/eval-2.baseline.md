# JavaScript anti-patterns to avoid

Common problems include:

- Using `var` or relying on implicit globals instead of block-scoped declarations.
- Comparing with `==`, depending on coercion, or confusing falsy values with missing values.
- Large functions, deeply nested conditionals, duplicated logic, and unclear names.
- Mutating shared objects or arrays unexpectedly, especially across module boundaries.
- Mixing callbacks, promises, and `async`/`await` without a consistent error path.
- Starting asynchronous work without awaiting it or handling its rejection.
- Swallowing errors, using empty `catch` blocks, or logging sensitive data.
- Performing expensive work repeatedly in hot paths without measuring the impact.
- Building modules with hidden side effects or circular dependencies.
- Disabling lint rules or skipping tests instead of addressing the underlying issue.

Use linting, formatting, type checking where appropriate, and tests to catch these issues automatically.
