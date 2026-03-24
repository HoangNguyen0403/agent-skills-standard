---
name: common-documentation
description: "Write effective code comments, READMEs, and technical documentation following intent-first principles. Use when adding comments, writing docstrings, creating READMEs, or updating any documentation. (triggers: comment, docstring, readme, documentation)"
---

# Documentation Standards

## **Priority: P2 (MAINTENANCE)**

## 1. Write Intent-First Code Comments

- Explain **"Why"** not "What" — code describes the logic, comments explain non-obvious intent.
- Use triple-slash (Dart/Swift) or JSDoc (TS/JS) for all public functions and classes.
- Delete commented-out code immediately — use Git history for retrieval.
- Use `TODO(username): description` or `FIXME` with ownership and a linked ticket.

See [implementation examples](references/implementation.md) for intent-first comment patterns.

## 2. Structure READMEs for Onboarding

- **Mission**: Clear one-sentence summary of the project purpose.
- **Onboarding**: Exact Prerequisites (runtimes), Installation steps, and Usage examples.
- **Maintainability**: Document inputs/outputs, known quirks, and troubleshooting tips.
- **Synchronization**: Documentation ships with the feature, not after.

## 3. Maintain Architectural Docs

- **ADRs**: Document significant architectural changes and the "Why" in `docs/adr/`.
- **Docstrings**: Document Classes/Functions with Args, Returns, and usage Examples (`>>>`).
- **Diagrams**: Use Mermaid.js inside Markdown for high-level system overviews.

## 4. Document APIs

- Use Swagger/OpenAPI for REST or specialized doc generators.
- Provide copy-pasteable examples for every major endpoint.
- Define the interface contract before the implementation.

## Anti-Patterns

- **No "what" comments**: Explain intent, not mechanics. Refactor instead.
- **No orphan TODOs**: Every TODO needs `(owner)` and a linked ticket.
- **No stale docs**: Documentation ships with the feature, not after.
