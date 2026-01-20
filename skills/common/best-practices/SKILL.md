# Global Best Practices - High-Density Standards

Universal principles for clean, maintainable, and robust code across all environments.

## 🏗 SOLID & Architectural Principles

- **SRP (Single Responsibility)**: One class/function = One reason to change. Separate business logic from delivery (UI/API).
- **OCP (Open-Closed)**: Extended via composition/interfaces; closed to source modification.
- **LSP (Liskov)**: Subtypes must be transparently replaceable for base types. Use `@override` carefully.
- **ISP (Interface Segregation)**: Granular interfaces > "Fat" general-purpose ones.
- **DIP (Dependency Inversion)**: Depend on abstractions (interfaces), not concretions. Use DI containers.
- **Modular Design**: Break complex systems into small, independent, and swappable components to reduce cognitive load.

## 🧹 Clean Code Standards (KISS/DRY/YAGNI)

- **KISS**: Favor readable, simple logic over "clever" one-liners.
- **DRY**: Abstract repeated logic into reusable utilities. No magic numbers/strings.
- **YAGNI**: Implement only current requirements. Avoid "just in case" abstractions.
- **Meaningful Names**: Use intention-revealing names (`isUserAuthenticated` > `checkUser`).
- **Naming Conventions**: Follow language-specific standards:
  - `camelCase`: Variables/Functions (JS/Java/Dart).
  - `snake_case`: Variables/Functions (Python/Ruby).
  - `PascalCase`: Classes/Types (universal).
  - `kebab-case`: Files/CSS/URLs.

## 🛡 Security & Performance Foundations

- **Sanitization**: Always validate external input (API, User, Env) to prevent Injection/XSS.
- **Early Return**: Guard clauses first to minimize nesting and improve readability.
- **Lazy Loading**: Defer heavy initialization or data fetching until actually needed.
- **Resource Cleanup**: Always close streams, file handles, and database connections to prevent leaks.

## 🧱 Error Handling

- **Predictable Failures**: Use custom exception types over generic Catch-Alls.
- **Graceful Degradation**: Fallback values/UI for non-critical failures.
- **Log Context**: Log actionable metadata (ID, State) along with errors. Avoid silent failures.

## 📚 References

- [Code Structure & Modular Design Examples](references/CODE_STRUCTURE.md)
- [Skill Token Economy & Effectiveness](references/EFFECTIVENESS.md)
