# Changelog

All notable changes to the Programming Languages and Frameworks Agent Skills will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2026-01-23

**Category**: Dynamic Skill Re-detection & Multi-module Android Support

### Added (CLI v1.5.0)

- **🔄 Dynamic Skill Re-detection** - Automatically re-enables excluded skills if matching dependencies (Retrofit, Room, BLoC, etc.) are added to the project.
- **📂 Recursive Gradle Detection** - Scans sub-modules (up to 3 levels deep) to find dependencies in complex Android projects.
- **📦 Version Catalog Support** - Native parsing for `libs.versions.toml` files.
- **🏗️ Refactored Detection Logic** - Clean architecture implementation of dependency parsers using specialized strategies for better maintainability.
- **Maven Improvement** - Enhanced `pom.xml` detection and dependency parsing.

### Added (Android Native Skillset v1.1.0)

- **Comprehensive Release** - 19 high-density skills covering Modern (Compose) and Legacy (XML) development.
- **Paradigm Coverage** - UDF, Clean Architecture, Jetpack Compose, DI (Hilt), and Navigation standards.
- **Reliability** - Verified with automated Gradle/TOML dependency parsing logic.

### Changed

- **Android (v1.1.0)**: Initial production release.
- **Networking (Android)**: Clarified anti-patterns for `kotlinx.serialization` integration.

## [1.4.0] - 2026-01-23

**Category**: Spring Boot Expert Standards & Tooling with Enterprise & Production-Ready modules

### Added (Spring Boot Skillset (v1.1.0))

- **Architecture**: Domain-driven packaging, clean architecture rules, Record-based DTOs.
- **Best Practices**: Constructor injection, type-safe configuration (`@ConfigurationProperties`), structured logging.
- **Data Access**: JPA performance optimization (Solved N+1, Projections, EntityGraphs).
- **Testing**: Testcontainers with `@ServiceConnection` (Boot 3.1+), Slice Testing strategy (`@WebMvcTest`).
- **Security**: Spring Security 6 Lambda DSL, Hardening (CSRF/HSTS), Method Security.
- **Microservices**: Sync (Feign) vs Async (Cloud Stream), "Shared Library" contracts pattern.
- **Observability**: Micrometer Tracing (Correlation IDs), Structured JSON Logging.
- **Deployment**: GraalVM Native Images, Docker Layering (`bootBuildImage`), Graceful Shutdown.
- **Scheduling**: Distributed Locking using ShedLock, ThreadPool configuration.
- **API Design**: OpenAPI (Swagger), URI Versioning, RFC 7807 ProblemDetails.

**Category**: Kotlin Expert Standards & Tooling

### Added (Kotlin Skills v1.0.0)

- **Modern Kotlin Core** - 4 new high-density skills covering Kotlin 1.9+ features (Null Safety, Extensions, Scope Functions).
- **Coroutines & Flow** - Structured Concurrency standards (`viewModelScope`, `StateFlow`) and anti-patterns.
- **Best Practices** - Backing Properties, Immutability, and Functional patterns.
- **Tooling** - Gradle Kotlin DSL (`.kts`), Detekt, and MockK integration.

**Category**: Java Expert Standards & Meta-Workflow Creation

### Added (Java Skills v1.0.0)

- **Modern Java Core** - 5 new high-density skills covering Java 21+ features (Records, Pattern Matching, Text Blocks).
- **Virtual Threads & Concurrency** - Full support for Project Loom and Structured Concurrency patterns.
- **Testing & Assertions** - Standardized usage of JUnit 5 and AssertJ with Mockito integration templates.
- **Tooling & Build** - Best practices for Maven and Gradle (Kotlin DSL) with version management.
- **Meta-Workflow** - Added `create-skillset` workflow to standardize future framework additions.

### Changed

- **Dart (v1.0.3)**: Added explicit Access Modifier guidance (library-private prefix).
- **TypeScript (v1.0.3)**: Added explicit Access Modifier guidance (private/protected and #private).
- **JavaScript (v1.0.1)**: Added explicit Access Modifier guidance (#private fields).

## [1.3.2] - 2026-01-22

**Category**: Angular Expert Standards & Modern v17+ Patterns

### Added (Angular Skills v1.0.0)

- **Modern Angular Core** - 14 new high-density skills covering Angular v17+ features.
- **Signals & State** - Full transition to `signal()`, `computed()`, and `effect()` patterns with Signal Store integration.
- **Standalone API** - Strictly Enforced Standalone components, pipes, and directives (elimination of legacy `NgModule`).
- **New Control Flow** - Standardized usage of `@if`, `@for`, and `@switch` syntax.
- **Functional Patterns** - Migration to `HttpInterceptorFn`, `CanActivateFn`, and `inject()` based DI.
- **Performance & Defer** - Native support for `@defer` views, `OnPush` detection, and `NgOptimizedImage`.
- **SSR & Hydration** - Hydration-ready standards with `TransferState` and platform-aware lifecycle hooks.
- **Testing Harnesses** - Standardized `ComponentTestHarness` and `TestBed` provider mocking patterns.
- **Strict Coding Standards** - Enforced file size limits (<400 lines) and function length (<75 lines) for cleaner architecture.

**Category**: Golang Expert Standards & Clean Architecture

### Added (Golang Skills v1.0.0)

- **Comprehensive Golang Registry** - Added 9 new high-density skills for professional Go development.
- **Clean Architecture & DDD** - Enterprise-ready standards for domain-driven design and hexagonal project layouts.
- **Idiomatic Go & Style** - "Effective Go" inspired guidelines for naming, interface design, and constructors.
- **Robust API Design** - Middlewares, routing (stdlib/Echo), and graceful shutdown patterns.
- **Advanced Concurrency** - Safe goroutine management, channel patterns, and deep `context` integration.
- **TDD & Mocking** - Table-driven tests, parallel execution, and dependency-inversion-based mocking strategies.
- **Structured Database & SQL** - Repository patterns, connection pooling, and `sqlc` readiness.
- **Observability & Logging** - Standardized `log/slog` patterns for structured, leveled logging.
- **Strict Error Handling** - idiomatic error wrapping, sentinel errors, and unwrapping patterns.

**Category**: QA Engineering, TDD & Debugging Standards

### Added (Common Skills v1.2.0)

- **TDD Expert Skill** - Strict Red-Green-Refactor cycle enforcement with AAA (Arrange-Act-Assert) pattern and F.I.R.S.T. principles.
- **Debugging Expert Skill** - Evidence-based troubleshooting using the **Scientific Method** (Observe -> Hypothesize -> Experiment -> Fix).
- **Bug Report Template** - Standardized template for reproducible and high-context bug reporting.
- **Test Pyramid Integration** - Explicit standards for Unit (70%), Integration (20%), and E2E (10%) testing levels.
- **Risk-Based Testing** - Prioritization strategies targeting critical business paths and data integrity.

### Updated (Common Skills v1.2.0)

- **Code Review Refinement** - Standardized review request template and integrated implementation planning phase into the workflow.
- **Quality Assurance** - Refactored to remove redundant TDD cycles and bridge coverage with dedicated skills.

## [1.3.1] - 2026-01-22

**Category**: Content-Level Optimization & Token Economy Guardrails and Workflow Automation & Code Review Standards

### Added (CLI v1.3.1)

- **Token Measurement Engine** - New `calculate-tokens` script to automate character-based token estimation across all skills.
- **Metadata Automation** - Integrated `token_metrics` into `metadata.json` for real-time tracking of skill efficiency.
- **100% Comprehensive Testing**: Achieved 100% statement coverage across all core services using Vitest.
- **Registry Guard Tests**: Data-driven test suite for `SKILL_DETECTION_REGISTRY` to ensure logic stability as detection rules evolve.
- **CI/CD Enforcements**: Updated GitHub Actions to strictly enforce 90%+ code coverage on every pull request.
- **Smart Release Workflow** - Unified automation for versioning, changelog generation, and README updates.
- **Improved Pattern Detection** - Refined `SkillValidator` to ignore code blocks and precisely target conversational instructions.
- **Centralized Registry** - Introduced `DEFAULT_REGISTER` for better maintainability and environment flexibility.

### Add & Updated (Common Skills v1.1.3)

- **Code Review Expert** - Principal Engineer standard for high-quality, readable AI code reviews. Supports universal logic with framework context awareness.
- **Enhanced skill-creator** - Added strict size limits (≤70 lines), anti-patterns for redundancy, and a pre-release validation checklist.
- **Compressed System Design** - Refined universal architecture guidelines with 10% higher density.
- **Unified Best Practices** - Removed redundant descriptions and standardized imperative format.

### Updated (Framework Skills v1.0.2)

- **NestJS Security** - Significant optimization (90 → 57 lines) via progressive disclosure. Extracted complex implementation code to `references/implementation.md`.
- **React State Management** - Reduced context window footprint by 26% by moving redundant codebase examples to references.
- **TypeScript Best Practices** - Applied imperative compression to naming and function standards, reducing line count by 30%.

### Fixed

- **Type Safety**: Resolved numerous TypeScript `any` types and linting errors for a more stable developer experience.
- **Mocking Reliability**: Replaced brittle file system and network mocks with more resilient, implementation-aware alternatives.
- **Framework Detection**: Fixed edge cases in missing dependency exclusions for Flutter and NestJS.
- **Improved Stability**: Fixed `GITHUB_BASE_REF` fallback logic for GitHub Actions environments.
- **Async Consistencies** - Migrated `calculate-tokens` script to `fs-extra` for non-blocking I/O alignment.
- **Validation Accuracy** - Reduced false positive warnings in skill validation for valid conversational comments.

### Changed

- Migrated from legacy testing patterns to Vitest for faster execution and better developer tooling.

## [1.3.0] - 2026-01-21

**Category**: High-Density Standards & CLI Architecture Refactor

### Added (Common Skills v1.1.0)

- **Enhanced Skill Creator** - Major improvements with three-level loading system (Core, Examples, Resources) and lifecycle documentation.
- **Architecture References** - Added comprehensive templates and lifecycle guides for skill developers.
- **Service Refactor** - Migrated universal architecture guidelines to standard modules.

### Updated (Framework & Language Skills)

- **Flutter Skills (v1.1.1)** - Refined BLoC, GetX, and Riverpod patterns with enhanced triggers and modular references.
- **Dart Skills (v1.0.2)** - Updated best practices and language patterns for better agent decision masking.
- **TypeScript/React Skills (v1.0.1)** - Enriched type-safety standards, hooks documentation, and security best practices.
- **NestJS Skills (v1.0.1)** - Major update to skill triggers (v1 & v2) across all 18 enterprise modules for precise agent activation.
- **Next.js Skills (v1.0.1)** - Improved App Router and RSC guidelines with optimized token economy.

### Changed (CLI v1.3.0)

- **Service-Based Architecture** - Fully migrated CLI commands to a modular service pattern (`DetectionService`, `RegistryService`, `GithubService`, `ConfigService`) for better maintainability and testability.
- **Improved Skill Discovery** - Integrated `GithubService` for more robust remote skill listing and metadata fetching.
- **Simplified Configuration (Breaking)** - Removed the redundant `enabled` flag. The CLI now follows a "Presence = Active" pattern for skills in `.skillsrc`.
- **Enhanced Validation** - The `validate` command now performs deeper structural checks and token efficiency analysis.

### Fixed (CLI v1.3.0)

- **CLI Validation Fix** - Corrected the `validate` command to properly use `node` for execution across different environments.
- **Dependency Exclusions** - Refined the initial configuration logic to better exclude unnecessary sub-skills based on project dependencies.

## [1.2.0] - 2026-01-20

**Category**: Universal "Common" Skills & Windsurf Support

### Added (Common Skills v1.0.0)

Major expansion of framework-agnostic standards to ensure high-quality software engineering across all languages.

- **Universal Common Category** - Added 7 new universal skill modules that apply to any framework/project.
- **Security Standards** - Zero Trust architecture, Least Privilege access, and Injection prevention (SQL/XSS) guidelines.
- **Performance Engineering** - Resource management (Memory/CPU), Network I/O optimization, and UI virtualization standards.
- **System Design & Architecture** - SoC (Separation of Concerns), Loose Coupling, DIP, and clean architecture implementation logic.
- **Best Practices (Enriched)** - Added Guard Clauses, Naming Conventions, and Modular Design standards.
- **Documentation Standards** - Code comments, READMEs, Architecture Decision Records (ADRs), and API documentation guidelines.
- **Quality Assurance (Enriched)** - Integrated Red-Green-Refactor TDD cycle and PR feedback standards.
- **Git & Collaboration (Enriched)** - Mandatory high-density **Git Rebase** and linear history workflows.
- **Reference Repository** - Added heavyweight code examples for all common skills in lazy-loaded `/references` subfolders where applicable.

### Added (CLI v1.2.0)

- **Windsurf Support** - Full support for the **Windsurf** agent with auto-detection of `.windsurf` and `.windsurfrules`.
- **Auto-Common Sync** - `ags init` now automatically includes the `common` skill category for all new projects.
- **Token Optimization Report** - Added `EFFECTIVENESS.md` documenting the verifiable **4-10x token savings** of the high-density standard.

### Changed (CLI v1.2.0)

- **Architecture Refactor** - Migrated `InitCommand` to a service-based architecture (`DetectionService`, `RegistryService`, `ConfigService`) following SOLID principles for better maintainability.
- **Simplified Configuration** - Removed the redundant `enabled: true/false` flag from `.skillsrc`. The CLI now follows a "Presence = Active" pattern for skills.
- **Improved Initialization** - Enhanced sub-skill detection logic to automatically populate the `exclude` list for parent frameworks, giving users clearer visibility and control.
- **Centralized Universal Skills** - Implemented `UNIVERSAL_SKILLS` registry to ensure global standards (like `common`) are consistently applied across all framework types.
- **Enhanced Skill Creator** - Major improvements to the `skill-creator` skill with token-optimized guidelines, three-level loading system, comprehensive lifecycle documentation, and resource organization strategies inspired by Anthropics' best practices.
- **Skill Validation System** - Added `validate` command to CLI with automated checks for token efficiency, format compliance, and structural integrity. Integrated into CI pipeline to ensure quality standards.

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

### Fixed (CLI v1.1.2)

- **Node.js ESM Conflict** - Resolved `ERR_REQUIRE_ESM` by downgrading `inquirer` to v8 for CommonJS compatibility. (Fixes [#11](https://github.com/HoangNguyen0403/agent-skills-standard/issues/11))

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
