# Agent Skills Registry

This directory contains the source of truth for all AI agent skills. Skills are organized by **Category** (Language or Framework) and then by **Domain**.

## 📂 Structure

Each skill must follow the standard directory structure:
`skills/{category}/{skill-name}/SKILL.md`

## 🛠 Active Categories

### 🎯 Flutter (Framework)

High-density standards for modern Flutter development.

- [**Layer-based Clean Architecture**](flutter/layer-based-clean-architecture/SKILL.md) (P0) - Dependency flow & modularity.
- [**BLoC State Management**](flutter/bloc-state-management/SKILL.md) (P0) - Predictable state flows.
- [**Security**](flutter/security/SKILL.md) (P0) - OWASP & data safety.
- [**Feature-based Clean Architecture**](flutter/feature-based-clean-architecture/SKILL.md) (P1) - Scalable directory structures.
- [**Idiomatic Flutter**](flutter/idiomatic-flutter/SKILL.md) (P1) - Modern layout & composition.
- [**Performance**](flutter/performance/SKILL.md) (P1) - 60fps & memory optimization.
- [**Widgets**](flutter/widgets/SKILL.md) (P1) - Reusable components.
- [**Error Handling**](flutter/error-handling/SKILL.md) (P1) - Functional error handling.
- [**Retrofit Networking**](flutter/retrofit-networking/SKILL.md) (P1) - API client standards.
- [**Dependency Injection**](flutter/dependency-injection/SKILL.md) (P1) - GetIt & Provider patterns.
- [**Testing**](flutter/testing/SKILL.md) (P2) - Unit, Widget & Integration.
- [**AutoRoute Navigation**](flutter/auto-route-navigation/SKILL.md) (P2) - Type-safe routing.
- [**GoRouter Navigation**](flutter/go-router-navigation/SKILL.md) (P2) - URI-based routing.

### 🔷 Dart (Language)

Core language idioms and patterns.

- [**Language Patterns**](dart/language/SKILL.md) (P0) - Records, Patterns, Sealed classes.
- [**Best Practices**](dart/best-practices/SKILL.md) (P1) - Scoping, Imports, Config.
- [**Tooling**](dart/tooling/SKILL.md) (P1) - Linting, Formatting, Analysis.

### 🚀 Coming Soon

- **TypeScript** (Language)
- **NestJS** (Framework)
- **Go** (Language)
- **Next.js** (Framework)

---

## ✍️ Contribution Guide

To add or update a skill:

1. **Format**: Ensure the `SKILL.md` uses the high-density format (YAML frontmatter + concise Markdown).
2. **Progressive Disclosure**: Move large code samples or templates to `references/REFERENCE.md` inside the skill folder. This keeps the primary context small and token-efficient.
3. **Naming**: Category folders must be lowercase. Skill folders use `kebab-case`.
4. **Discovery**: Ensure the `triggers` in the YAML frontmatter are accurate for the AI agent to pick it up.
5. **Priority**:
    - **P0**: Foundational (Architecture, Types, Security).
    - **P1**: Operational (Performance, Idioms, UI).
    - **P2**: Maintenance (Testing, Tooling, Docs).
