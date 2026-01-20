# Documentation Standards - High-Density Standards

Essential rules for code comments, READMEs, and technical documentation.

## 📝 Code Comments (Inline Docs)

- **"Why" over "What"**: Comments should explain non-obvious intent. Code should describe the logic.
- **Docstrings**: Use triple-slash (Dart/Swift) or standard JSDoc (TS/JS) for all public functions and classes.
- **Maintenance**: Delete "commented-out" code immediately; use Git history for retrieval.
- **TODOs**: Use `TODO(username): description` or `FIXME` to track technical debt with ownership.

## 📖 README Essentials

- **Mission**: Clear one-sentence summary of the project purpose.
- **Onboarding**: Provide exact Prerequisites (runtimes), Installation steps, and Usage examples.
- **Maintainability**: Document inputs/outputs, known quirks, and troubleshooting tips.
- **Up-to-Date**: Documentation is part of the feature; keep it synchronized with code changes.

## 🏛 Architectural & API Docs

- **ADRs**: Document significant architectural changes and the "Why" in `docs/adr/`.
- **Docstrings**: Document Classes and Functions with clear descriptions of Args, Returns, and usage Examples (`>>>`).
- **Diagrams**: Use Mermaid.js inside Markdown to provide high-level system overviews.

## 🚀 API Documentation

- **Self-Documenting**: Use Swagger/OpenAPI for REST or specialized doc generators for your language.
- **Examples**: Provide copy-pasteable examples for every major endpoint or utility.
- **Contract First**: Define the interface before the implementation.
