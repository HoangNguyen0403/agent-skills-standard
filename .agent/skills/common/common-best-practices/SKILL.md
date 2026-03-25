---
name: common-best-practices
description: "Universal clean-code principles for any environment. (triggers: **/*.ts, **/*.tsx, **/*.go, **/*.dart, **/*.java, **/*.kt, **/*.swift, **/*.py, solid, kiss, dry, yagni, naming, conventions, refactor, clean code)"
---

# Global Best Practices

## **Priority: P0 (FOUNDATIONAL)**

## 🏗 Core Principles

- **SOLID**: Follow SRP (One reason to change), OCP (Open to extension), LSP, ISP, DIP.
- **KISS/DRY/YAGNI**: Favor readability. Abstract repeated logic. No "just in case" code.
- **Naming**: Intention-revealing (`isUserAuthenticated` > `checkUser`). Follow language casing.

## 🧹 Code Hygiene

- **Size Limits**: Functions < 30 lines. Services < 600 lines. Utils < 400 lines.
- **Early Returns**: Use guard clauses to prevent deep nesting.
- **Comments**: Explain **why**, not **what**. Refactor instead of commenting bad code.
- **Sanitization**: Validate all external inputs.

## Anti-Patterns

- **No hardcoded constants**: Use named config/env vars.
- **No deep nesting**: Guard clauses eliminate the Pyramid of Doom.
- **No global state**: Prefer dependency injection.
- **No empty catches**: Always handle, log, or rethrow.

## References

- [Code Structure Patterns](references/CODE_STRUCTURE.md) — file/function organization
- [Effectiveness Guide](references/EFFECTIVENESS.md) — practical application examples
