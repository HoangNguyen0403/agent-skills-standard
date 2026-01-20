# Quality Assurance - High-Density Standards

Standards for maintaining code hygiene, automated checks, and testing integrity.

## 🔍 Code Quality & Linting

- **Zero Tolerance**: Treat all linter warnings/infos as fatal errors in CI.
- **Automated Formatting**: Enforce strict formatting on every commit using hooks.
- **Type Safety**: Never use `any` or `dynamic` unless absolutely necessary. Use specific interfaces/types for all data boundaries.
- **Dead Code**: Proactively remove unused imports, variables, and deprecated methods.

## 🧪 Testing & TDD

- **F-I-R-S-T**: Test must be Fast, Independent, Repeatable, Self-Validating, and Timely.
- **Red-Green-Refactor**: Write a failing test (Red), make it pass (Green), then clean up (Refactor).
- **Edge Cases**: Always test null/empty states, boundary limits, and error conditions.
- **Mock Dependencies**: Isolate code by mocking external systems (APIs, DBs) to ensure deterministic results.

## 🛠 Refactoring & Code Reviews

- **Code Smells**: Proactively refactor duplicated code, long methods (>20 lines), and "god classes".
- **Incremental Changes**: Perform small, behavior-preserving transformations (Extract Method, Rename Variable).
- **Quality Gate**: Use peer reviews to share knowledge and catch logic errors before merging.
- **Constructive Feedback**: Critique the code, not the author. Explain the "why" behind suggestions.

## 🛠 Automation & Hooks

- **Pre-commit Hooks**: Validate linting, formatting, and unit tests before every push.
- **Documentation**: Keep public APIs documented. Use triple-slash/JSDoc.
- **Strict Dependencies**: Lock versions in `pubspec.lock` / `package-lock.json` / `pnpm-lock.yaml`.

## 📚 References

- [TDD Cycle & Feedback Examples](references/TDD_FEEDBACK.md)
