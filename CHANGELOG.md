# Changelog

All notable changes to the Programming Languages and Frameworks Agent Skills will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.2] - 2026-02-01

**Category**: Hybrid Rule Injection & GitHub Copilot Optimization

### Added (CLI v1.6.2)

- **🚀 Hybrid Rule Injection**: Implemented a new "Discovery Pointer" strategy for agent rules.
  - Instead of prepending to existing rule files, the CLI now creates a dedicated `agent-skill-standard-rule.md` (or `.mdc`) in the agent's rules directory.
  - Standardized naming across all agents to avoid file pollution and conflicts.
- **🤖 GitHub Copilot Specialized Support**:
  - Automatically generates `.instructions.md` files in `.github/instructions/`.
  - Injects YAML frontmatter with `applyTo: "**/*"` for repository-wide skill discovery.
- **✨ Cursor & Antigravity Enhancements**:
  - Specialized YAML frontmatter for `.mdc` and `.agent` rules with `globs: ["**/*"]` and `alwaysApply: true`.
- **🛠️ Robust Rule Scoping**: Improved directory detection for rule targets, ensuring hidden folders (dots) are treated as directories, not files.

## [1.6.1] - 2026-02-01

**Category**: Skill Indexing Robustness & Bug Fixes

### Fixed (CLI v1.6.1)

- **🩹 AGENTS.md Indexing Fix**: Resolved a critical parsing bug in `SyncService.applyIndices` where skill IDs were incorrectly extracted from markdown table rows.
  - Corrected row splitting logic to skip leading pipe characters.
  - Added whitespace trimming for robust Skill ID matching against synced skills.
  - Verified across multiple frameworks (Flutter, NestJS, React).

## [1.6.0] - 2026-01-31

**Category**: Global Skill Compliance Audit & Progressive Disclosure Architecture & CLI Type-Safety

### Changed (⚡ Skill Registry v1.6.0)

- **⚖️ 100% Token Compliance** - Successfully refactored and compressed all 208 skills to meet the **< 70-line limit**:
  - **Progressive Disclosure**: Extracted heavyweight implementation patterns and code blocks into `references/` directories.
  - **Categories Audited**: Flutter, Android, iOS, React Native, Next.js, NestJS, and Common Skills.
- **🎨 Refined Mobile Patterns**:
  - **Common**: Integrated high-density animation and UX core guidelines.
  - **Flutter**: Optimized GetX navigation and state management triggers.
  - **React Native**: Modularized DLS, Deployment, and State Management patterns.
- **🛠️ Refined Backend Patterns**:
  - **NestJS**: Streamlined architecture and modularity standards.
  - **Next.js**: Enhanced rendering and data fetching guidelines for App Router.

### Changed (CLI v1.6.0)

- **⚡ Agent Activation Index (`AGENTS.md`)**: New high-density index generator that creates/injects a centralized skill manifest for 100% activation reliability in Cursor, Windsurf, and Claude Code.
- **🔗 Unified Semantic Triggering**: Logic to bridge native agent rule files (`.cursorrules`, etc.) to the `AGENTS.md` index using compressed metadata.
- **🛡️ Type-Safety Hardening**: Fixed critical `Agent` enum and `ConfigService` type mismatches.
- **📊 Optimized Metrics**: Improved token calculation accuracy and metadata synchronization.

### Versions

- **Common Skills**: v1.4.0 (Minor)
- **Flutter Skills**: v1.2.0 (Minor)
- **React Native Skills**: v1.1.0 (Minor)
- **Android Skills**: v1.0.1 (Patch)
- **iOS Skills**: v1.0.1 (Patch)
- **NestJS Skills**: v1.0.4 (Patch)
- **Next.js Skills**: v1.1.1 (Patch)

**Category**: Next.js 15/16 Vercel Standards Audit & Quality Engineering Expansion

### Added (Quality Engineering v1.0.0)

- **Comprehensive Release** - Introduced a new specialized category for high-density requirement analysis.
- **Business Analysis** - Standards for logic truth tables, domain modeling, and Jira user story parsing.
- **Zephyr Test Generation** - Automated test case creation from business requirements with impact analysis.
- **Jira Integration** - Operational standards for bi-directional requirement mapping.

### Changed (Next.js v1.1.0 - Major Audit)

- **Next.js 15/16 Alignment** - Integrated Vercel's latest best practices for Async APIs (`params`, `searchParams`, `cookies`, `headers`).
- **Cache Components** - Full integration of the `'use cache'` directive and Cache Component architecture.
- **Advanced Routing** - Standardized Parallel Routes, Intercepting Routes, and Suspense Bailout protocols.
- **Architectural Hardening** - New references for RSC Boundaries, Runtime Selection (Edge/Node), and Bundling.

### Changed (Common Skills v1.3.0)

- **TDD & Testing Hardening** - Split QA into QE, added explicit "Iron Laws" for TDD and testing anti-patterns.
- **Security Protocols** - Added dedicated reference for Injection Testing (SQLi/HTMLi).

### Changed (CLI v1.5.2)

- **`.skillsrc` Enhancement** - Improved initialization template with opt-in guidance for Quality Engineering skills.

## [1.5.1] - 2026-01-26

**Category**: Systematic Token Optimization & Adaptive Model Selection & Sub-Agent Delegation Protocol

### Added (Common Skills v1.2.4)

### Changed (Skill Registry v1.5.2)

- **⚡ Global Token Optimization** - Achieved **98.6% compliance** with the 70-line limit:
  - **Next.js Rendering**: Refactored (91 → 70 lines) using progressive disclosure (Strategy Matrix/Scaling Patterns).
  - **Removed Redundancy**: Deleted descriptions after Priority sections in Flutter, TS, JS, NestJS, and Common categories.
  - **Compressed Patterns**: Rewrote verbose anti-patterns into high-density imperative format.
- **🛡️ Enhanced Creator Standards** - Updated `skill-creator` with stricter formatting rules and progressive disclosure checklists.

### Changed (Infrastructure)

- **📊 Metrics Update** - Recalculated token fingerprints for all 191 skills (~76k tokens total).

**Category**: Enhanced Feedback Automation & Build-Time Configuration & PHP/Laravel Expert Standards & Next.js Expansion

### Added (Laravel Skillset v1.0.0)

- **Comprehensive Release** - 10 new high-density skills for modern Laravel 11.x/12.x development.
- **Clean Architecture** - Domain-Driven Design (DDD), Actions, DTOs, and Repository patterns.
- **Background Processing** - Expert standards for Queues, Jobs, Events, and Batching/Chaining.
- **Database Expert** - Advanced Query Builder, Redis caching, and Read/Write scalability.
- **Sessions & Middleware** - Hardened driver configuration and security header middleware.
- **Foundational Pillars** - Architecture, Eloquent, Security, API, Testing, and Tooling.

### Added (Next.js v1.0.2 - Skillset Expansion)

- **Testing** - New high-density module for Vitest, RTL, and Playwright for App Router.
- **Security** - New module for Server Action validation, Zod integration, and Data Boundaries (DTOs).
- **Tooling** - New module for Turbopack optimization, Standalone builds, and CI/CD best practices.

### Added (PHP Skillset v1.0.0)

- **Comprehensive Release** - 7 new high-density skills for modern PHP 8.x development.
- **Language & Features** - PHP 8.1+ patterns: Constructor promotion, Match expressions, Readonly properties, and Strict Typing.
- **Error Handling** - Modern Exception hierarchies (`Throwable`), Custom Exceptions, and PSR-3 logging standards.
- **Security** - Strict PDO prepared statements, Argon2id password hashing, and XSS/CSRF hardened patterns.
- **Concurrency** - Non-blocking I/O standards using Fibers and event-loop awareness.
- **Testing** - TDD standards for PHPUnit and Pest with advanced mocking patterns.
- **Best Practices** - PSR-12 coding standards, PSR-4 autoloading, and SOLID principles.
- **Tooling** - Dependency management (Composer), Static Analysis (PHPStan/Psalm), and Linting workflows.

### Added (CLI v1.5.1)

- **🚀 Build-Time Configuration** - Implemented Vite-based environment variable injection:
  - `FEEDBACK_API_URL` is now baked into the production bundle during build.
  - Zero-config usage for `npx` users while maintaining runtime overrides.
  - Migrated from `tsup` to `vite` for more robust Node.js SSR/Lib bundling.
- **🤖 Enhanced Feedback Automation** - Added new fields for 100% automated skill reporting:
  - `--skill-instruction`: Quotes the exact skill guideline violated.
  - `--actual-action`: Describes what the AI agent did instead.
  - `--decision-reason`: Captures the AI's rationale for deviation.
  - `--loaded-skills`: Tracks active skills at the time of the issue.

### Added (Common Skills v1.2.2)

- **Optimized Feedback Reporter** - Major refactor for token efficiency and detection logic:
  - **Self-Monitoring Protocol**: Added explicit instructions for AI agents to check adherence _before_ code execution.
  - **Observable Triggers**: Replaced generic triggers with specific behavioral patterns (e.g., 'deviated from loaded skill').
  - **Token Optimization**: 58% reduction in skill size while increasing actionable context.

### Infrastructure

- **Server-Side Compatibility** - Updated DTOs and Services to support the new automated feedback fields:
  - GitHub issues now display structured "What skill said" vs "What AI did" comparisons.
  - Conditionally formatted issue bodies for cleaner stakeholder triage.

## [1.5.0] - 2026-01-26

**Category**: Automated Feedback System & 100% Test Coverage & Build/Path Robustness

### Added (CLI v1.5.0)

- **`ags feedback` Command** - Integrated automated reporting for skill improvement:
  - Interactive prompts for skill ID, issues, and suggested improvements.
  - Automatic environment detection (loads `.env` via `dotenv`).
  - Zero-token-exposure proxy submission to Render.com backend.
- **🛡️ 100% Test Coverage** - Achieved absolute line coverage across all 13 CLI files.
- **🧭 Workspace-Aware Validation** - Improved `SkillValidator` to robustly detect project root.

### Fixed (CLI v1.5.0)

- **Command Visibility Fix** - Resolved issue where `feedback` and `validate` were missing from build.
- **Environment Discovery** - Added support for loading `FEEDBACK_API_URL` from local `.env`.

### Added (Common Skills v1.2.2)

- **Feedback Reporter Skill** - Specialized skill to guide AI agents in reporting their own performance:
  - Structured prompt injection for self-correction feedback loop.
  - Mandatory issue type categorization for faster triage.
  - Seamless integration with the `ags feedback` CLI component.

### Infrastructure

- **Cloud-Native Deployment** - Streamlined server architecture for Render.com:
  - Standalone Docker builds with script-injection protection (ignore-scripts).
  - Removal of redundant Nginx/Certbot boilerplate in favor of managed platform SSL.
  - Enhanced deployment automation via `server-v*` GitHub Action tags.

## [1.4.1] - 2026-01-23

**Category**: CLI Architectural Refactor & SOLID Principles Enforcement & Security Standards Consistency & React Native Support

### Added (CLI v1.4.1)

- **Test Suite Expansion** - Added 12 new test cases covering edge cases and error paths (166 total tests, up from 154).
- **Defensive Programming** - Added tests for recursion depth limits, error logging, and edge case handling.
- **🏗️ Architectural Overhaul** - Refactored all core CLI commands (`init`, `sync`, `list-skills`) to use **Dependency Injection (DI)**.
- **🛠️ New Service Layer** - Introduced specialized services to separate domain logic from CLI interaction:
  - `InitService`: Manages environment detection and bootstrapping logic.
  - `SyncService`: Centralized business logic for skill discovery and file projection.
  - `SkillService`: Unified logic for skill listing and status detection.
- **📦 Centralized Configuration** - Unified registry URL resolution and config building in `ConfigService`.
- **🧪 Enhanced Test Robustness** - Achieved near-perfect test quality and maintainability:
  - **DI-Mocking Pattern**: All command tests now use type-safe injection, removing `any` usage and private field manipulation.
  - **Zero Linter Errors**: Resolved all TSLint/ESLint issues in the test suite.
  - **100% Line Coverage**: Maintained across all core services and commands (221 total tests).
- **🛡️ Type Safety** - Enforced strict typing for CLI prompts and configuration assembly.

### Added (Golang Skills v1.0.2)

- **Security Expert Skill** - Comprehensive security standards covering:
  - `crypto/rand` vs `math/rand` enforcement
  - SQL injection prevention with parameterized queries
  - Password hashing (bcrypt/argon2)
  - JWT validation with algorithm enforcement
  - Secret management best practices
- **Reference Implementation** - Full code examples for security patterns in `references/implementation.md`.

### Added (React Native Skillset v1.0.0)

- **Comprehensive Release** - 10 new high-density skills for professional React Native development.
- **Architecture & Patterns** - Clean architecture, Component composition, and Hooks standards.
- **State & Navigation** - Modern state management patterns and React Navigation best practices.
- **Mobile Expertise** - Platform-specific logic (Native Modules), Security (Keychain), and Performance optimization.
- **DevOps** - Standardized Deployment workflows including CodePush integration.
- **Testing** - Comprehensive testing standards with React Native Testing Library and Jest.

### Added (Common Skills v1.2.1)

- **Feedback Reporter Skill** - Enables users and AI agents to report skill improvement opportunities:
  - Structured `@agent-skills-feedback` annotation format
  - Self-reporting protocol for AI when uncertain about guidance
  - Privacy-first design with opt-out controls
  - No telemetry or analytics collection
  - GitHub integration for community-driven skill improvements

### Fixed (Security Skills - All Frameworks)

- **Standardized Priority Labels** - All security skills now use consistent `## **Priority: P0 (CRITICAL)**` format.
  - Affected: Android, iOS, NestJS, Spring Boot, Common, TypeScript (7 skills)
- **Android Security Markdown** - Fixed malformed anti-patterns section with broken nested backticks.
- **Spring Boot JWT Validation** - Added explicit JWT algorithm validation guidance (reject `none` algorithm).
- **Flutter Obfuscation Caveat** - Added realistic expectations about obfuscation limits.
- **iOS Biometrics Phrasing** - Improved `canEvaluatePolicy(_:error:)` description.
- **Cross-References** - Added "Related Topics" linking all framework security skills to `common/security-standards`:
  - Flutter, React, NestJS, Android, iOS, Spring Boot, TypeScript, Angular, Next.js
- **Next.js Auth Links** - Simplified verbose reference link format.
- **React Hooks Example** - Changed to named function for better DevTools clarity.
- **README Emoji** - Fixed broken emoji character (� → 🌐).
- **Common Security** - Removed redundant subtitle (saved 12 tokens).

### Changed

- **Token Metrics Updated** - Recalculated for all 159 skills (64,003 tokens total).
  - Golang: 3,570 tokens (357 avg, largest: security 458 tokens)
  - Spring Boot: 3,405 tokens (up from 3,323 due to JWT additions)
  - Android: 5,282 tokens (up from 5,271 due to markdown fixes)

## [1.4.0] - 2026-01-23

**Category**: Dynamic Skill Re-detection & Multi-module Android Support

### Added (CLI v1.4.0)

- **🔄 Dynamic Skill Re-detection** - Automatically re-enables excluded skills if matching dependencies (Retrofit, Room, BLoC, etc.) are added to the project.
- **📂 Recursive Gradle Detection** - Scans sub-modules (up to 3 levels deep) to find dependencies in complex Android projects.
- **📦 Version Catalog Support** - Native parsing for `libs.versions.toml` files.
- **🏗️ Refactored Detection Logic** - Clean architecture implementation of dependency parsers using specialized strategies for better maintainability.
- **Maven Improvement** - Enhanced `pom.xml` detection and dependency parsing.

### Added (Android Native Skillset v1.0.0)

- **Comprehensive Release** - 19 high-density skills covering Modern (Compose) and Legacy (XML) development.
- **Paradigm Coverage** - UDF, Clean Architecture, Jetpack Compose, DI (Hilt), and Navigation standards.
- **Reliability** - Verified with automated Gradle/TOML dependency parsing logic.

**Category**: Spring Boot Expert Standards & Tooling with Enterprise & Production-Ready modules

### Added (Spring Boot Skillset (v1.0.0))

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
