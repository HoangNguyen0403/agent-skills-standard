# Changelog

All notable changes to the Programming Languages and Frameworks Agent Skills will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2026-01-19

**Category**: Flutter Skill Expansion & CLI Refinement

### Added (Flutter Skills v1.1.0)

Major expansion of the Flutter ecosystem with new reactive patterns, legacy support, and automation.

- **GetX State Management** - Reactive patterns (`.obs`), `Obx`, `GetxController`, and `Binding` lifecycle standards.
- **GetX Navigation** - Context-less routing, `GetMiddleware` guards, and centralized `AppPages` configuration.
- **Riverpod 2.0 State Management** - Reactive patterns using `riverpod_generator`, `AsyncNotifier`, and strict immutable models with `freezed`.
- **Testing Standards** - Comprehensive guidelines for Unit, Widget (Robot Pattern), and BLoC testing using `mocktail` and `bloc_test`.
- **Localization (easy_localization)** - Standardized JSON-based translation, `.tr()` extension usage, and plurals.
- **Google Sheets Automation** - Integration with `sheet_loader_localization` to sync translations from remote sheets to local assets.
- **Navigator v1** - Legacy/Imperative routing support with `onGenerateRoute` and `RouteSettings` extraction.
- **Equatable Integration** - Added `Equatable` as a lightweight state-comparison alternative to `freezed` when code generation is not preferred.

### Changed (Flutter Skills v1.1.0)

- **State Management Priority** - Established hierarchy: `freezed` is prioritized for complex apps, while `Equatable` is recommended if the library is present in `pubspec.yaml`.
- **Reference Expansion** - Added detailed code references for all new patterns (Bindings, Middleware, Sheet Loaders).

### Added (CLI v1.1.2)

- **Auto-Detection for GetX** - CLI now detects `get` dependency and auto-enables GetX state/nav skills.
- **Auto-Detection for Localization** - CLI now detects `easy_localization` and enables the localization skill.
- **Navigator v1 Default** - Added basic Navigator v1 detection for all Flutter projects.

## [1.1.1] - 2026-01-18

**Category**: Fullstack Framework (Next.js) & CLI Improvements

### Added (CLI v1.1.1)

- **Smart Initialization** - Automatically includes `react` skill when initializing `Next.js` or `React Native` projects.
- **Internal Refactor** - Migrated framework and agent identifiers to Enums for better type safety and extensibility.
- **New Agents** - Added support for **Gemini**, **Roo Code**, and **OpenCode**.

### Added (Next.js Skills v1.0.0)

Comprehensive guide for App Router architecture and React Server Components.

- **App Router** - File conventions (`layout`, `loading`, `error`), Route Groups, and Dynamic Routes.
- **Architecture (FSD)** - Feature-Sliced Design adapter for Next.js (App -> Widgets -> Features -> Entities), including "Excessive Entities" prevention rules.
- **Server Components** - "use client" directives, composition patterns, and serialization boundaries.
- **Data Fetching** - Extended `fetch` API, Caching strategies (`force-cache`, `no-store`), and ISR patterns.
- **Server Actions** - Progressive forms, mutations, and `useFormStatus` hooks.
- **Rendering Strategies** - Static (SSG), Dynamic (SSR), Streaming, and Partial Prerendering (PPR).
- **Data Access Layer** - Security boundaries, DTO transformation, and API Gateway BFF patterns.
- **State Management** - Best practices for Granular State, URL-driven state, and avoiding global stores.
- **Internationalization (i18n)** - Middleware redirection, Sub-path routing (`[lang]`), and Type-safe dictionaries.
- **Authentication** - HttpOnly Cookie pattern (vs LocalStorage) and Middleware protection.
- **Styling & UI** - Zero-runtime CSS (Tailwind), RSC compatibility, and `clsx`/`tailwind-merge` patterns.
- **Caching Architecture** - The 4 Layers (Memoization, Data Cache, Full Route, Router) and `unstable_cache` patterns.
- **Optimization** - Core Web Vitals monitoring, built-in components, and Metadata API.

## [1.1.0] - 2026-01-18

### Added (NestJS Skills v1.1.0)

Includes 18 specialized High-Density skills for Enterprise Backend Development.

- **Architecture Standards** - Module organization, Dependency Injection (`ConfigurableModuleBuilder`), and Project Structure.
- **Database & Scaling** - Selection Framework (Postgres vs Mongo), Connection Multiplexing (PgBouncer), and Sharding strategies.
- **Real-Time & WebSockets** - Decision matrix for WebSockets vs SSE vs Long Polling, and Redis Adapter scaling.
- **Security Hardening** - JWT best practices, CSRF, Helmet, Rate Limiting, and key rotation.
- **Microservices Transport** - gRPC for internal, RabbitMQ/Kafka for events, and Monorepo contracts standard.
- **Search & CQRS** - ElasticSearch integration patterns and dual-write prevention.
- **Performance Tuning** - Fastify adapter default, Compression, and Scope management.
- **Observability** - Structured Logging (Pino) and Prometheus metrics standards.
- **Deployment** - Docker multi-stage builds and Kubernetes graceful shutdown hooks.

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
