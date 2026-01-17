# Changelog

All notable changes to the Programming Languages and Frameworks Agent Skills will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-01-17

**Category**: Web Stack Skills (React, TypeScript, JavaScript) & CLI Infrastructure

### Added (Web Stack)

#### React Skills (v1.0.0)

- **component-patterns** - Composition, Error Boundaries, and modern syntax.
- **hooks** - Custom hook standards and dependency management.
- **performance** - Optimization strategies (RSC, Suspense, Virtualization).
- **security** - XSS prevention and clean auth patterns.
- **state-management** - State colocation and server-state handling.
- **testing** - User-centric testing with Vitest/RTL.
- **tooling** - Debugging and profiling workflows.
- **typescript** - Strict typing for Props, Refs, and Events.

#### TypeScript Skills (v1.0.0)

- **best-practices** - Code organization and naming conventions.
- **language** - Advanced types, generics, and strict mode usage.
- **security** - Type-safe validation and secure data handling.
- **tooling** - Configuration for ESLint, testing, and builds.

#### JavaScript Skills (v1.0.0)

- **best-practices** - Modern ES patterns and error handling.
- **language** - Async flows, modules, and functional patterns.
- **tooling** - Environment setup and linting standards.

### Improved (CLI v1.0.5 - v1.1.0)

#### Features & Agents

- **Trae Support**: Added first-class support for `Trae` agent (`.trae/skills` and auto-detection).
- **Smart Detection**: Enhanced framework logic to scan `package.json` dependencies (React, NestJS, Next.js, React Native).
- **Nested Structure**: Migrated to scalable nested folders (e.g., `skills/flutter/bloc` vs `skills/flutter-bloc`).
- **Short Alias**: Added `ags` command for quicker CLI access.

---

## [1.0.0] - 2026-01-15

**Category**: Flutter Framework Skills & Dart Programming Language Skills

### Added (Flutter & Dart)

#### Flutter Skills (13 categories)

- **auto-route-navigation** - Type-safe routing, deep links, and guards.
- **bloc-state-management** - Enterprise-ready patterns for business logic.
- **dependency-injection** - Decoupled component management with GetIt.
- **error-handling** - Functional error mapping and resilience.
- **feature-based-clean-architecture** - Scalable domain-driven directory structures.
- **go-router-navigation** - Modern declarative navigation.
- **idiomatic-flutter** - Community best practices and syntax.
- **layer-based-clean-architecture** - Separation of concerns (UI, Domain, Data).
- **performance** - Optimization strategies for high-frame-rate apps.
- **retrofit-networking** - Type-safe API integration and token management.
- **security** - Secure storage, PII masking, and network security.
- **testing** - Unit, BLoC, and Widget testing standards.
- **widgets** - Component decomposition and reusable UI blocks.

#### Dart Skills (3 categories)

- **best-practices** - Idiomatic code patterns and SOLID principles.
- **language** - Advanced syntax, null-safety, and type system.
- **tooling** - Static analysis, linting, and environment setup.

#### Infrastructure

- **.skillsrc** - Version configuration for sync workflow
- **SYNC_WORKFLOW.md** - Documentation for version management from registry
- **README.md** - Repository overview and usage instructions
- **CHANGELOG.md** - Version history tracking

### Content Sources

- dart_code_metrics rules (331 common, 57 Flutter, 22 BLoC)
- Vercel react-best-practices pattern (priority-driven organization)
- OWASP Mobile Top 10 (2024) security standards

### Structure

- Priority-driven organization (P0/P1/P2) for Flutter skills
- Consolidated structure: `flutter/` and `dart/` directories
- Granular categorization based on domain and impact
- Progressive disclosure with main SKILL.md files
- Version sync support via .skillsrc configuration

---

**Maintainer**: Hoang Nguyen  
**Registry**: <https://github.com/HoangNguyen0403/agent-skills-standard>
