# Agent Skills Registry

This directory contains the source of truth for all AI agent skills. Skills are organized by **Category** (Language or Framework) and then by **Domain**.

## 📂 Structure

Each skill must follow the standard directory structure:
`skills/{category}/{skill-name}/SKILL.md`

## 🛠 Active Categories

### 🌐 Common (Universal)

Cross-framework standards and best practices applicable to all development.

- [**Best Practices**](common/best-practices/SKILL.md) (P0) - SOLID, Clean Code, KISS/DRY/YAGNI.
- [**Protocol Enforcement**](common/protocol-enforcement/SKILL.md) (P0) - Red-Team verification & adversarial audit.
- [**Security Standards**](common/security-standards/SKILL.md) (P0) - Universal security protocols.
- [**System Design**](common/system-design/SKILL.md) (P0) - Architecture & scalability patterns.
- [**Accessibility**](common/accessibility/SKILL.md) (P0) - WCAG 2.2, ARIA, and inclusive design.
- [**Mobile UX Core**](common/mobile-ux-core/SKILL.md) (P0) - Touch-first interface principles & safe areas.
- [**Code Review**](common/code-review/SKILL.md) (P1) - Principal Engineer review standards.
- [**Git Collaboration**](common/git-collaboration/SKILL.md) (P1) - Version control & team workflows.
- [**Performance Engineering**](common/performance-engineering/SKILL.md) (P1) - Optimization & monitoring.
- [**TDD & Quality**](common/tdd/SKILL.md) (P1) - Test-Driven Development & hygiene.
- [**Documentation**](common/documentation/SKILL.md) (P1) - Code comments & technical docs.
- [**API Design**](common/api-design/SKILL.md) (P0) - REST conventions & HTTP semantics.
- [**Architecture Audit**](common/architecture-audit/SKILL.md) (P1) - Structural debt & refactoring logic.
- [**Debugging**](common/debugging/SKILL.md) (P1) - Systematic troubleshooting (Scientific Method).
- [**Error Handling**](common/error-handling/SKILL.md) (P1) - Universal error design & response shapes.
- [**Observability**](common/observability/SKILL.md) (P1) - Logging, Tracing, and Metrics.
- [**Product Requirements**](common/product-requirements/SKILL.md) (P1) - PRDs & Iterative Discovery.
- [**Skill Creator**](common/skill-creator/SKILL.md) (P0) - Standard for creating & optimizing Agent Skills.
- [**Workflow Writing**](common/workflow-writing/SKILL.md) (P1) - Concise, token-efficient agent workflows.
- [**Architecture Diagramming**](common/architecture-diagramming/SKILL.md) (P1) - C4, Mermaid, and UML standards.
- [**Context Optimization**](common/context-optimization/SKILL.md) (P1) - Strategies for managing context window.
- [**Feedback Reporter**](common/feedback-reporter/SKILL.md) (P1) - Protocol for reporting skill violations.
- [**Mobile Animation**](common/mobile-animation/SKILL.md) (P1) - Motion design & timing curves.
- [**Security Audit**](common/security-audit/SKILL.md) (P1) - Adversarial probing & vulnerability assessment.
- [**Session Retrospective**](common/session-retrospective/SKILL.md) (P1) - Analyzing corrections to improve skills.

### �🎯 Flutter (Framework)

High-density standards for modern Flutter development.

- [**Layer-based Clean Architecture**](flutter/layer-based-clean-architecture/SKILL.md) (P0) - Dependency flow & modularity.
- [**BLoC State Management**](flutter/bloc-state-management/SKILL.md) (P0) - Predictable state flows.
- [**GetX State Management**](flutter/getx-state-management/SKILL.md) (P0) - Simple and powerful reactive state management.
- [**Riverpod State Management**](flutter/riverpod-state-management/SKILL.md) (P0) - Reactive state management with code generation.
- [**Flutter Design System**](flutter/flutter-design-system/SKILL.md) (P0) - Enforce Design Language System adherence.
- [**Security**](flutter/security/SKILL.md) (P0) - OWASP & data safety.
- [**GetX Navigation**](flutter/getx-navigation/SKILL.md) (P0) - Context-less navigation, named routes, and middleware.
- [**Feature-based Clean Architecture**](flutter/feature-based-clean-architecture/SKILL.md) (P1) - Scalable directory structures.
- [**Idiomatic Flutter**](flutter/idiomatic-flutter/SKILL.md) (P1) - Modern layout & composition.
- [**Performance**](flutter/performance/SKILL.md) (P1) - 60fps & memory optimization.
- [**Widgets**](flutter/widgets/SKILL.md) (P1) - Reusable components.
- [**Error Handling**](flutter/error-handling/SKILL.md) (P1) - Functional error handling.
- [**Retrofit Networking**](flutter/retrofit-networking/SKILL.md) (P1) - API client standards.
- [**Dependency Injection**](flutter/dependency-injection/SKILL.md) (P1) - GetIt & Provider patterns.
- [**CI/CD**](flutter/cicd/SKILL.md) (P1) - GitHub Actions, Fastlane, Automation.
- [**Testing**](flutter/testing/SKILL.md) (P1) - Unit, Widget & Integration Strategies.
- [**Flutter Navigation**](flutter/flutter-navigation/SKILL.md) (P1) - Navigation patterns including go_router.
- [**Flutter Notifications**](flutter/flutter-notifications/SKILL.md) (P1) - Push and local notifications.
- [**Localization**](flutter/localization/SKILL.md) (P1) - Multi-language support using easy_localization.
- [**AutoRoute Navigation**](flutter/auto-route-navigation/SKILL.md) (P2) - Type-safe routing.
- [**GoRouter Navigation**](flutter/go-router-navigation/SKILL.md) (P2) - URI-based routing.

### 🤖 Android (Framework)

Modern Android development with Jetpack Compose and Hilt.

- [**Compose**](android/compose/SKILL.md) (P0) - Declarative UI & State Hoisting.
- [**Architecture**](android/architecture/SKILL.md) (P0) - Clean Architecture & Modularization.
- [**DI (Hilt)**](android/di/SKILL.md) (P0) - Dependency Injection standards.
- [**State**](android/state/SKILL.md) (P0) - ViewModel & StateFlow patterns.
- [**Navigation**](android/navigation/SKILL.md) (P0) - Jetpack Navigation Compose (Type-safe).
- [**Design System**](android/android-design-system/SKILL.md) (P0) - Material Design 3 & design tokens.
- [**Performance**](android/performance/SKILL.md) (P1) - Baseline Profiles & UI Rendering.
- [**Persistence**](android/persistence/SKILL.md) (P1) - Room Database & DataStore.
- [**Networking**](android/networking/SKILL.md) (P1) - Retrofit & OkHttp standards.
- [**Background Work**](android/background-work/SKILL.md) (P1) - WorkManager & Processing.
- [**Testing**](android/testing/SKILL.md) (P1) - Unit & UI Tests (Compose).
- [**Security**](android/security/SKILL.md) (P1) - Encryption & Network Security.
- [**Concurrency**](android/concurrency/SKILL.md) (P1) - Coroutines & Flow concurrency.
- [**Notifications**](android/android-notifications/SKILL.md) (P1) - Push & local notification patterns.
- [**Tooling**](android/tooling/SKILL.md) (P2) - Detekt, Ktlint & CI/CD.
- [**Resources**](android/resources/SKILL.md) (P2) - Strings, Drawables & Localization.
- [**XML Views**](android/xml-views/SKILL.md) (P2) - Legacy ViewBinding & RecyclerViews.
- [**Legacy Navigation**](android/legacy-navigation/SKILL.md) (P2) - XML-based Navigation Component.
- [**Legacy Security**](android/legacy-security/SKILL.md) (P2) - Intents, WebViews & FileProvider.
- [**Legacy State**](android/legacy-state/SKILL.md) (P2) - State with Fragments & views.

### 🅰️ Angular (Framework)

Modern Angular standards (Standalone components, Signals).

- [**Architecture**](angular/architecture/SKILL.md) (P0) - Feature modules & lazy loading.
- [**Signals & State**](angular/state-management/SKILL.md) (P0) - Signals-based state management.
- [**Component Patterns**](angular/component-patterns/SKILL.md) (P0) - OnPush & strict Signals usage.
- [**Dependency Injection**](angular/dependency-injection/SKILL.md) (P0) - DI & inject() usage.
- [**Security**](angular/security/SKILL.md) (P0) - XSS, CSP & Route Guards.
- [**Forms**](angular/forms/SKILL.md) (P1) - Typed Reactive Forms.
- [**Routing**](angular/routing/SKILL.md) (P1) - Router & Guards standards.
- [**HTTP Client**](angular/http-client/SKILL.md) (P1) - Interceptors & API interactions.
- [**RxJS Interop**](angular/rxjs-interop/SKILL.md) (P1) - Bridging Observables and Signals.
- [**SSR & Hydration**](angular/ssr/SKILL.md) (P1) - Hydration & TransferState.
- [**Testing**](angular/testing/SKILL.md) (P2) - Component Harnesses & TestBed.
- [**Performance**](angular/performance/SKILL.md) (P1) - Optimization & change detection.
- [**Style Guide**](angular/style-guide/SKILL.md) (P2) - Naming conventions & structure.
- [**Components**](angular/components/SKILL.md) (P2) - Reusable UI component standards.
- [**Directives & Pipes**](angular/directives-pipes/SKILL.md) (P2) - Composition & Pure Pipes.

### 🔷 Dart (Language)

Core language idioms and patterns.

- [**Language Patterns**](dart/language/SKILL.md) (P0) - Records, Patterns, Sealed classes.
- [**Best Practices**](dart/best-practices/SKILL.md) (P1) - Scoping, Imports, Config.
- [**Tooling**](dart/tooling/SKILL.md) (P1) - Linting, Formatting, Analysis.

### 🔷 TypeScript (Language)

Modern TypeScript standards for type-safe development.

- [**Language Patterns**](typescript/language/SKILL.md) (P0) - Types, Generics, Type Guards.
- [**Security**](typescript/security/SKILL.md) (P0) - Input Validation, Auth, Secrets.
- [**Best Practices**](typescript/best-practices/SKILL.md) (P1) - Naming, Modules, Conventions.
- [**Tooling**](typescript/tooling/SKILL.md) (P1) - ESLint, Testing, Build Tools.

### 🟨 JavaScript (Language)

Modern JavaScript (ES2022+) patterns.

- [**Language Patterns**](javascript/language/SKILL.md) (P0) - Modern Syntax, Async/Await.
- [**Best Practices**](javascript/best-practices/SKILL.md) (P1) - Conventions, Error Handling.
- [**Tooling**](javascript/tooling/SKILL.md) (P1) - ESLint, Jest, Build Tools.

### ⚛️ React (Framework)

Modern React development patterns.

- [**Component Patterns**](react/component-patterns/SKILL.md) (P0) - Function Components, Composition.
- [**State Management**](react/state-management/SKILL.md) (P0) - useState, Context, Zustand.
- [**TypeScript**](react/typescript/SKILL.md) (P0) - React-specific Types.
- [**Security**](react/security/SKILL.md) (P0) - XSS Prevention, Auth Patterns.
- [**Hooks**](react/hooks/SKILL.md) (P1) - Custom Hooks, Best Practices.
- [**Performance**](react/performance/SKILL.md) (P1) - Memoization, Code Splitting.
- [**Tooling**](react/tooling/SKILL.md) (P1) - Debugging & Profiling.
- [**Testing**](react/testing/SKILL.md) (P2) - React Testing Library, Jest.

### 📱 React Native (Framework)

Mobile app standards for iOS and Android.

- [**Architecture**](react-native/architecture/SKILL.md) (P0) - Feature-first, module boundaries.
- [**Components**](react-native/components/SKILL.md) (P0) - Pattern-driven UI.
- [**Performance**](react-native/performance/SKILL.md) (P0) - 60fps & bundle optimization.
- [**Navigation**](react-native/navigation/SKILL.md) (P0) - Type-safe routing (React Navigation).
- [**Security**](react-native/security/SKILL.md) (P0) - Mobile threat safety & secure storage.
- [**State Management**](react-native/state-management/SKILL.md) (P1) - Context, Zustand, RTK.
- [**Styling**](react-native/styling/SKILL.md) (P1) - Flexbox & Design Systems.
- [**Platform-Specific**](react-native/platform-specific/SKILL.md) (P1) - Native modules & bridge logic.
- [**Testing**](react-native/testing/SKILL.md) (P1) - Unit & Integration (RNTL).
- [**React Native DLS**](react-native/react-native-dls/SKILL.md) (P1) - Design Language System for Mobile.
- [**React Native Navigation**](react-native/react-native-navigation/SKILL.md) (P1) - Native-driven navigation (Wix).
- [**Mobile Notifications**](react-native/react-native-notifications/SKILL.md) (P1) - Push & local mobile alerts.
- [**Deployment**](react-native/deployment/SKILL.md) (P2) - CodePush, EAS, Fastlane.

### 🦁 NestJS (Framework)

Enterprise-grade Node.js backend development.

- [**Architecture**](nestjs/architecture/SKILL.md) (P0) - Modules, DI, Scalability.
- [**Controllers & Services**](nestjs/controllers-services/SKILL.md) (P0) - Layer separation standards.
- [**Database**](nestjs/database/SKILL.md) (P0) - TypeORM, Prisma, Mongoose patterns.
- [**Security**](nestjs/security/SKILL.md) (P0) - Auth, Guards, Headers.
- [**Data Isolation & RLS Security**](nestjs/security-isolation/SKILL.md) (P0) - Multi-tenant isolation and PostgreSQL RLS.
- [**File Uploads**](nestjs/file-uploads/SKILL.md) (P0) - Secure file handling patterns.
- [**Transport**](nestjs/transport/SKILL.md) (P0) - Microservices communication.
- [**NestJS BullMQ Implementation**](nestjs/nestjs-bullmq/SKILL.md) (P0) - Standard workflow for background jobs.
- [**NestJS Notification System**](nestjs/nestjs-notification/SKILL.md) (P0) - Notification Types and FCM Integration.
- [**API Standards**](nestjs/api-standards/SKILL.md) (P1) - Response wrapping, pagination.
- [**Configuration**](nestjs/configuration/SKILL.md) (P1) - Environment management.
- [**Error Handling**](nestjs/error-handling/SKILL.md) (P1) - Global filters.
- [**Performance**](nestjs/performance/SKILL.md) (P1) - Fastify, Caching.
- [**Observability**](nestjs/observability/SKILL.md) (P1) - Logging, monitoring.
- [**Real-Time**](nestjs/real-time/SKILL.md) (P1) - WebSocket patterns.
- [**Scheduling**](nestjs/scheduling/SKILL.md) (P1) - Background jobs.
- [**Search**](nestjs/search/SKILL.md) (P1) - Full-text search patterns.
- [**Caching**](nestjs/caching/SKILL.md) (P1) - Request & data caching.
- [**Deployment**](nestjs/deployment/SKILL.md) (P1) - Docker, Kubernetes patterns.
- [**Documentation**](nestjs/documentation/SKILL.md) (P2) - OpenAPI/Swagger automation.
- [**Testing**](nestjs/testing/SKILL.md) (P2) - Unit & E2E strategies.

### ▲ Next.js (Framework)

Modern fullstack React framework standards (App Router).

- [**App Router**](nextjs/app-router/SKILL.md) (P0) - Routing conventions, Layouts, Loading.
- [**Server Components**](nextjs/server-components/SKILL.md) (P0) - RSC patterns, "use client" boundaries.
- [**Rendering**](nextjs/rendering/SKILL.md) (P0) - SSG, SSR, PPR, Streaming.
- [**Data Fetching**](nextjs/data-fetching/SKILL.md) (P0) - Extended fetch, Caching control.
- [**Authentication**](nextjs/authentication/SKILL.md) (P0) - Auth.js / Middleware patterns.
- [**Data Access Layer**](nextjs/data-access-layer/SKILL.md) (P1) - DAL patterns & DTOs.
- [**Caching**](nextjs/caching/SKILL.md) (P1) - Request & Data caching layers.
- [**Styling**](nextjs/styling/SKILL.md) (P1) - Tailwind, Fonts, CSS-in-JS constraints.
- [**Optimization**](nextjs/optimization/SKILL.md) (P1) - Images, Scripts, Core Web Vitals.
- [**Server Actions**](nextjs/server-actions/SKILL.md) (P1) - Mutations & Forms.
- [**Testing**](nextjs/testing/SKILL.md) (P1) - Vitest & Playwright standards.
- [**Security**](nextjs/security/SKILL.md) (P0) - Action safety & DTOs.
- [**Tooling**](nextjs/tooling/SKILL.md) (P2) - Turbopack & Standalone builds.
- [**State Management**](nextjs/state-management/SKILL.md) (P2) - URL-state, avoiding global stores.
- [**Internationalization**](nextjs/i18n/SKILL.md) (P2) - i18n routing & translation patterns.
- [**Pages Router**](nextjs/pages-router/SKILL.md) (P2) - Legacy Pages directory standards.
- [**System Upgrade**](nextjs/upgrade/SKILL.md) (P2) - Strategies for Next.js version upgrades.

### 🐘 Laravel (Framework)

Expert standards for scalable Laravel 11.x/12.x applications.

- [**Clean Architecture**](laravel/clean-architecture/SKILL.md) (P0) - DDD, Actions, and DTO patterns.
- [**Architecture**](laravel/architecture/SKILL.md) (P0) - Slim controllers & Service layer.
- [**Security**](laravel/security/SKILL.md) (P0) - Hardened input & Policy authorization.
- [**Eloquent**](laravel/eloquent/SKILL.md) (P0) - N+1 prevention & reusable scopes.
- [**Background Processing**](laravel/background-processing/SKILL.md) (P1) - Queues, Jobs, & Events.
- [**Database Expert**](laravel/database-expert/SKILL.md) (P1) - Advanced SQL & Redis caching.
- [**API**](laravel/api/SKILL.md) (P1) - Resources & modern auth standards.
- [**Testing**](laravel/testing/SKILL.md) (P1) - Integrated Pest & TDD standards.
- [**Sessions & Middleware**](laravel/sessions-middleware/SKILL.md) (P1) - Scalable session management.
- [**Tooling**](laravel/tooling/SKILL.md) (P2) - Artisan, Vite, & Pint optimization.

### 🐹 Golang (Language)

High-performance system and backend development with Go.

- [**Architecture**](golang/architecture/SKILL.md) (P0) - Module structure & clean patterns.
- [**API Server**](golang/api-server/SKILL.md) (P0) - REST API & Middleware.
- [**Concurrency**](golang/concurrency/SKILL.md) (P0) - Goroutines & Channels.
- [**Security**](golang/security/SKILL.md) (P0) - Auth, Encryption & Validation.
- [**Language**](golang/language/SKILL.md) (P1) - Idiomatic Go & Generics.
- [**Database**](golang/database/SKILL.md) (P1) - SQL, GORM & Migrations.
- [**Error Handling**](golang/error-handling/SKILL.md) (P1) - Wrap/Unwrap patterns.
- [**Testing**](golang/testing/SKILL.md) (P1) - Unit & Integration tests.
- [**Configuration**](golang/configuration/SKILL.md) (P2) - Env & Config management.
- [**Logging**](golang/logging/SKILL.md) (P2) - Structured logging standards.

### 🍎 iOS (Framework)

Modern iOS development with Swift, SwiftUI, and TCA/MVVM.

- [**SwiftUI**](ios/swiftui/SKILL.md) (P0) - Declarative UI patterns.
- [**Architecture**](ios/architecture/SKILL.md) (P0) - Clean Architecture (MVVM/TCA).
- [**State Management**](ios/state-management/SKILL.md) (P0) - State, Binding & ObservableObject.
- [**Security**](ios/security/SKILL.md) (P0) - Keychain, BioAuth & Encryption.
- [**Design System**](ios/ios-design-system/SKILL.md) (P0) - Tokens & Typography.
- [**Navigation**](ios/ios-navigation/SKILL.md) (P0) - Modern NavigationStack & Flow.
- [**Networking**](ios/networking/SKILL.md) (P1) - URLSession & Combine/Async patterns.
- [**Persistence**](ios/persistence/SKILL.md) (P1) - SwiftData & CoreData.
- [**Performance**](ios/performance/SKILL.md) (P1) - Memory management & Instruments.
- [**Localization**](ios/localization/SKILL.md) (P1) - String Catalogs & L10n.
- [**Testing**](ios/testing/SKILL.md) (P1) - XCTest & UI Testing.
- [**App Lifecycle**](ios/app-lifecycle/SKILL.md) (P2) - AppDelegate & SceneDelegate.
- [**Notifications**](ios/ios-notifications/SKILL.md) (P2) - UserNotifications & Push.
- [**Deployment**](ios/deployment/SKILL.md) (P2) - App Store Connect & TestFlight.

### ☕ Java (Language)

Modern enterprise Java standards (17/21+).

- [**Language**](java/language/SKILL.md) (P0) - Modern Java (17/21+) patterns.
- [**Concurrency**](java/concurrency/SKILL.md) (P0) - Virtual Threads & Loom.
- [**Best Practices**](java/best-practices/SKILL.md) (P1) - Clean Code & SOLID in Java.
- [**Testing**](java/testing/SKILL.md) (P1) - JUnit 5 & Mockito.
- [**Tooling**](java/tooling/SKILL.md) (P2) - Maven/Gradle & CI/CD.

### 🐘 Kotlin (Language)

Modern Kotlin for Android and Server-side.

- [**Language**](kotlin/language/SKILL.md) (P0) - Idiomatic Kotlin & Safeties.
- [**Coroutines**](kotlin/coroutines/SKILL.md) (P0) - Structured Concurrency & Flow.
- [**Best Practices**](kotlin/best-practices/SKILL.md) (P1) - Scoping & Functional patterns.
- [**Tooling**](kotlin/tooling/SKILL.md) (P2) - Gradle & Static Analysis.

### 🐘 PHP (Language)

Modern PHP standards (8.x+).

- [**Language**](php/language/SKILL.md) (P0) - Modern PHP (8.x+) patterns.
- [**Security**](php/security/SKILL.md) (P0) - OWASP & Data Safety.
- [**Best Practices**](php/best-practices/SKILL.md) (P1) - Clean Code & PSR standards.
- [**Error Handling**](php/error-handling/SKILL.md) (P1) - Exception handling patterns.
- [**Testing**](php/testing/SKILL.md) (P1) - PHPUnit & Pest.
- [**Concurrency**](php/concurrency/SKILL.md) (P2) - Fiber & Async patterns.
- [**Tooling**](php/tooling/SKILL.md) (P2) - Composer & Pint.

### 📈 Quality Engineering (Process)

Advanced standards for requirements, QA, and tool integration.

- [**Business Analysis**](quality-engineering/business-analysis/SKILL.md) (P0) - Requirement discovery & PRDs.
- [**Quality Assurance**](quality-engineering/quality-assurance/SKILL.md) (P0) - Strategy & test planning.
- [**Zephyr Test Gen**](quality-engineering/zephyr-test-generation/SKILL.md) (P1) - AI-driven test case generation.
- [**Jira Integration**](quality-engineering/jira-integration/SKILL.md) (P2) - Workflow & ticket management.

### 🍃 Spring Boot (Framework)

Enterprise Java backend development with Spring Boot.

- [**Architecture**](spring-boot/architecture/SKILL.md) (P0) - Layered & Hexagonal patterns.
- [**Security**](spring-boot/security/SKILL.md) (P0) - Spring Security & OAuth2.
- [**API Design**](spring-boot/api-design/SKILL.md) (P0) - REST & Documentation.
- [**Data Access**](spring-boot/data-access/SKILL.md) (P0) - Spring Data JPA & Transactions.
- [**Microservices**](spring-boot/microservices/SKILL.md) (P1) - Discovery, Config & Gateway.
- [**Testing**](spring-boot/testing/SKILL.md) (P1) - MockMvc & Testcontainers.
- [**Observability**](spring-boot/observability/SKILL.md) (P1) - Micrometer & Actuator.
- [**Best Practices**](spring-boot/best-practices/SKILL.md) (P1) - Beans & Scopes.
- [**Scheduling**](spring-boot/scheduling/SKILL.md) (P2) - Task execution.
- [**Deployment**](spring-boot/deployment/SKILL.md) (P2) - Docker & Cloud Native.

### 🦅 Swift (Language)

Modern Swift language standards (5.9+).

- [**Language**](swift/language/SKILL.md) (P0) - Modern Swift (5.9+) patterns.
- [**Concurrency**](swift/concurrency/SKILL.md) (P0) - Async/Await & Actors.
- [**Best Practices**](swift/best-practices/SKILL.md) (P1) - Clean Code in Swift.
- [**SwiftUI**](swift/swiftui/SKILL.md) (P1) - View composition & state.
- [**Memory Management**](swift/memory-management/SKILL.md) (P1) - ARC & Retain cycles.
- [**Error Handling**](swift/error-handling/SKILL.md) (P1) - Do/Catch & Result patterns.
- [**Testing**](swift/testing/SKILL.md) (P1) - XCTest & Swift Testing.
- [**Tooling**](swift/tooling/SKILL.md) (P2) - SwiftPM & Mint.

### 🗄️ Database (Infra)

Expert data access and optimization patterns.

- [**PostgreSQL**](database/postgresql/SKILL.md) (P0) - Performance, Migrations & RLS.
- [**MongoDB**](database/mongodb/SKILL.md) (P0) - Schema design & aggregation.
- [**Redis**](database/redis/SKILL.md) (P1) - Caching & Real-time patterns.

---

## ✍️ Contribution Guide

To add or update a skill:

1. **Token Efficiency**: `SKILL.md` must be **≤ 100 lines**. This is a strict limit to maximize agent context.
2. **Progressive Disclosure**: Move all code samples > 10 lines to `references/REFERENCE.md` or specialized reference files.
3. **Imperative Standards**: Use "Compressed Syntax" (starting with verbs, minimal articles) for 40% higher density.
4. **Format Verification**: Ensure YAML frontmatter triggers are precise and categories are lowercase kebab-case.
5. **Validation Checklist**:
   - [ ] SKILL.md ≤ 100 lines (Ideal: 60-80)
   - [ ] No inline code blocks > 10 lines
   - [ ] No redundant frontmatter context in body
   - [ ] Triggers verified for all supported agents
6. **Priority Matrix**:
   - **P0**: Foundational (Architecture, Types, Security).
   - **P1**: Operational (Performance, Idioms, UI).
   - **P2**: Maintenance (Testing, Tooling, Docs).
