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

## 🚫 Anti-Patterns

- **Hardcoded Constants**: Use named config/constants.
- **Deep Nesting**: Avoid "Pyramid of Doom".
- **Global State**: Prefer dependency injection.
- **Empty Catches**: Always handle, log, or rethrow.
