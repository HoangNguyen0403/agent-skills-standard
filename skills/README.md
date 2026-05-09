# Agent Skills Registry

This directory contains the source of truth for all AI agent skills. Skills are organized by **Category** (Language or Framework) and then by **Domain**.

## 📂 Structure

Each skill must follow the standard directory structure:
`skills/{category}/{skill-name}/SKILL.md`

## 🛠 Active Categories

<!-- SKILLS_INDEX_START -->
### 🌐 Common (Universal)

Cross-framework standards and best practices applicable to all development.

- [**Best Practices**](common/common-best-practices/SKILL.md) (P0) - Enforce SOLID principles, guard-clause style, function size limits, and intention-revealing naming across all languages. Use when refactoring for readability, applying clean-code patterns, reviewing naming conventions, or reducing function complexity.
- [**Feedback Reporter**](common/common-feedback-reporter/SKILL.md) (P0) - Pre-write skill violation audit. Checks planned code against loaded skill anti-patterns before any file write. Use when writing Flutter/Dart code, editing SKILL.md files, or generating any code where project skills are active. Load as composite alongside other skills. When a violation is detected and Auto-fixed: YES, also load +common/common-learning-log to record the mistake.
- [**Git Collaboration**](common/common-git-collaboration/SKILL.md) (P0) - Enforce version control best practices for commits, branching, pull requests, and repository security. Use when writing commits, creating branches, merging, or opening pull requests.
- [**Llm Security**](common/common-llm-security/SKILL.md) (P0) - OWASP LLM Top 10 (2025) audit checklist for AI applications, agent tools, RAG pipelines, and prompt construction. Use when performing any security review touching LLM client code, prompt templates, agent tools, or vector stores.
- [**Mobile Ux Core**](common/common-mobile-ux-core/SKILL.md) (P0) - Enforce universal mobile UX principles for touch-first interfaces including touch targets, safe areas, and mobile-specific interaction patterns. Use when building mobile screens, handling touch interactions, or validating safe area compliance.
- [**Owasp**](common/common-owasp/SKILL.md) (P0) - OWASP Top 10 audit checklist for Web Applications (2021) and APIs (2023). Use when performing any security review, PR review, or codebase audit touching web, mobile backend, or API code.
- [**Performance Engineering**](common/common-performance-engineering/SKILL.md) (P0) - Enforce universal standards for high-performance development. Use when profiling bottlenecks, reducing latency, fixing memory leaks, improving throughput, or optimizing algorithm complexity in any language.
- [**Product Requirements**](common/common-product-requirements/SKILL.md) (P0) - Expert process for gathering requirements and drafting PRDs (Iterative Discovery). Use when creating a PRD, speccing a new feature, or clarifying requirements.
- [**Protocol Enforcement**](common/common-protocol-enforcement/SKILL.md) (P0) - Enforce Red-Team verification and adversarial protocol audit. Use when verifying tasks, performing self-scans, or checking for protocol violations. Load as composite for all sessions.
- [**Security Audit**](common/common-security-audit/SKILL.md) (P0) - Probe for hardcoded secrets, injection surfaces, unguarded routes, and infrastructure weaknesses across Node, Go, Dart, Java, Python, and Rust codebases. Use when performing security audits, vulnerability scans, secrets detection, or penetration testing.
- [**Security Standards**](common/common-security-standards/SKILL.md) (P0) - Enforce universal security protocols for safe, resilient software. Use when implementing authentication, encryption, authorization, input validation, secret management, or any security-sensitive feature across any language or framework.
- [**Skill Creator**](common/common-skill-creator/SKILL.md) (P0) - Standardizes the creation and evaluation of high-density Agent Skills (Claude, Cursor, Windsurf). Ensures skills achieve high Activation (specificity/completeness) and Implementation (conciseness/actionability) scores. Use when: writing or auditing SKILL.md, improving trigger accuracy, or refactoring skills to reduce redundancy and maximize token ROI.
- [**System Design**](common/common-system-design/SKILL.md) (P0) - Enforce separation of concerns, dependency inversion, and resilience patterns across layered and distributed architectures. Use when designing new features, evaluating module boundaries, selecting architectural patterns, or resolving scalability bottlenecks.
- [**Tdd**](common/common-tdd/SKILL.md) (P0) - Implements a strict Red-Green-Refactor loop to ensure zero production code is written without a prior failing test. Use when: creating new features, fixing bugs, or expanding test coverage.
- [**Ui Design**](common/common-ui-design/SKILL.md) (P0) - Design distinctive, production-grade frontend UI with bold aesthetic choices. Use when building web components, pages, interfaces, dashboards, or applications in any framework (React, Next.js, Angular, Vue, HTML/CSS).
- [**Workflow Writing**](common/common-workflow-writing/SKILL.md) (P0) - Rules for writing concise, token-efficient workflow and skill files. Prevents over-building that requires costly optimization passes. Use when creating or editing workflow files, SKILL.md files, or new skill definitions.
- [**Accessibility**](common/common-accessibility/SKILL.md) (P1) - Enforce WCAG 2.2 AA compliance with semantic HTML, ARIA roles, keyboard navigation, and color contrast standards for web UIs. Use when building interactive components, adding form labels, fixing focus traps, or auditing a11y compliance.
- [**Api Design**](common/common-api-design/SKILL.md) (P1) - Apply REST API conventions — HTTP semantics, status codes, versioning, pagination, and OpenAPI standards for any framework. Use when designing endpoints, choosing HTTP methods, implementing pagination, or writing OpenAPI specs.
- [**Architecture Audit**](common/common-architecture-audit/SKILL.md) (P1) - Audit structural debt, logic leakage, and monolithic components across Web, Mobile, and Backend codebases. Use when reviewing architecture, assessing tech debt, detecting logic in wrong layers, or identifying God classes.
- [**Architecture Diagramming**](common/common-architecture-diagramming/SKILL.md) (P1) - Standards for creating clear, audience-appropriate C4 and UML architecture diagrams with Mermaid. Use when producing system context diagrams, container views, sequence diagrams, or updating ARCHITECTURE.md files.
- [**Code Review**](common/common-code-review/SKILL.md) (P1) - Conduct high-quality, persona-driven code reviews. Use when reviewing PRs, critiquing code quality, or analyzing changes for team feedback.
- [**Context Optimization**](common/common-context-optimization/SKILL.md) (P1) - Maximize context window efficiency, reduce latency, and prevent lost-in-middle issues through strategic masking and compaction. Use when token budgets are tight, tool outputs flood the context, conversations drift from intent, or latency spikes from cache misses.
- [**Dast Tooling**](common/common-dast-tooling/SKILL.md) (P1) - Standardize usage of Dynamic Application Security Testing (DAST) tools (ZAP, Nuclei, Nikto) and custom AI-driven curl probes for adversarial system testing. Use when advising on or running dynamic security scans on local/staging environments.
- [**Debugging**](common/common-debugging/SKILL.md) (P1) - Troubleshoot systematically using the Scientific Method. Use when debugging crashes, tracing errors, diagnosing unexpected behavior, or investigating exceptions.
- [**Error Handling**](common/common-error-handling/SKILL.md) (P1) - Cross-cutting standards for error design, response shapes, error codes, and boundary placement across API, domain, and infrastructure layers. Use when defining error hierarchies, wrapping exceptions, building standardized error responses, or placing error boundaries in layered architectures.
- [**Learning Log**](common/common-learning-log/SKILL.md) (P1) - Append a structured learning entry to AGENTS_LEARNING.md whenever an AI agent makes a mistake. Auto-activates as a composite skill when: a pre-write skill violation is detected and auto-fixed, or when the session retrospective finds a correction loop. Also triggers directly when the user corrects the AI mid-session. Use when: mistake, wrong, redo, that's not right, correction, my bad, fix that error, I made a mistake, agent error, learning log, log mistake, AGENTS_LEARNING.md
- [**Mobile Animation**](common/common-mobile-animation/SKILL.md) (P1) - Apply motion design principles for mobile apps covering timing curves, transitions, gestures, and performance-conscious animations. Use when implementing screen transitions, gesture-driven interactions, shared-element animations, or optimizing animation frame rates on iOS, Android, or Flutter.
- [**Mobile Visual Testing**](common/common-mobile-visual-testing/SKILL.md) (P1) - Standardizes mobile UI audits, RTL verification, and state-specific testing on iOS/Android.
- [**Observability**](common/common-observability/SKILL.md) (P1) - Enforce structured JSON logging, OpenTelemetry distributed tracing, and RED metrics across backend services. Use when adding request correlation, setting up tracing spans, defining SLO burn-rate alerts, or instrumenting middleware.
- [**Session Retrospective**](common/common-session-retrospective/SKILL.md) (P1) - Analyze conversation corrections to detect skill gaps and auto-improve the skills library. Use after any session with user corrections, rework, or retrospective requests. After finding correction loops, also load +common/common-learning-log to persist mistake entries to AGENTS_LEARNING.md.
- [**Store Changelog**](common/common-store-changelog/SKILL.md) (P1) - Generate user-facing release notes for the Apple App Store and Google Play Store by collecting git history, triaging user-impacting changes, and drafting store-compliant changelogs. Enforces character limits (App Store ≤4000, Google Play ≤500), tone, and bullet format. Use when generating release notes, app store changelog, play store release, what's new, or version release notes for any mobile app.
- [**Web Visual Testing**](common/common-web-visual-testing/SKILL.md) (P1) - Standardizes visual audits, responsive design, and behavioral testing for web apps.
- [**Documentation**](common/common-documentation/SKILL.md) (P2) - Write effective code comments, READMEs, and technical documentation following intent-first principles. Use when adding comments, writing docstrings, creating READMEs, or updating any documentation.

### 🎯 Flutter (Framework)

High-density standards for modern Flutter development.

- [**Bloc State Management**](flutter/flutter-bloc-state-management/SKILL.md) (P0) - Implement BLoC/Cubit state management correctly in Flutter. Use when writing, modifying, reviewing, or testing any BLoC, Cubit, state, or event file.
- [**Design System**](flutter/flutter-design-system/SKILL.md) (P0) - Enforce Design Language System adherence in Flutter. Use when implementing design tokens, preventing hardcoded colors/spacing, or building a DLS.
- [**Feature Based Clean Architecture**](flutter/flutter-feature-based-clean-architecture/SKILL.md) (P0) - Organize Flutter apps with modular feature-based clean architecture. Use when creating features under lib/features/ with domain, data, and presentation layers.
- [**Getx Navigation**](flutter/flutter-getx-navigation/SKILL.md) (P0) - Implement context-less navigation, named routes, and middleware using GetX. Use when building navigation with GetX routing in Flutter.
- [**Getx State Management**](flutter/flutter-getx-state-management/SKILL.md) (P0) - Implement reactive state with GetX controllers and observables in Flutter. Use when managing state with GetxController, Obx, or reactive observables.
- [**Go Router Navigation**](flutter/flutter-go-router-navigation/SKILL.md) (P0) - Implement typed routes, redirection, and guards using go_router in Flutter. Use when building declarative navigation with go_router.
- [**Layer Based Clean Architecture**](flutter/flutter-layer-based-clean-architecture/SKILL.md) (P0) - Enforce inward dependency flow, pure domain layers, and DTO-to-entity mapping in Flutter DDD architecture. Use when structuring domain, infrastructure, application, or presentation layers.
- [**Retrofit Networking**](flutter/flutter-retrofit-networking/SKILL.md) (P0) - Build type-safe HTTP networking with Dio and Retrofit including auth interceptors in Flutter. Use when integrating REST APIs with Dio or Retrofit.
- [**Riverpod State Management**](flutter/flutter-riverpod-state-management/SKILL.md) (P0) - Implement reactive state management using Riverpod 2.0 with code generation in Flutter. Use when defining providers, building AsyncNotifiers, or overriding providers in tests.
- [**Security**](flutter/flutter-security/SKILL.md) (P0) - Enforce OWASP Mobile security standards for Flutter apps. Use when storing sensitive data, making network calls, handling tokens/PII, or preparing release builds.
- [**Testing**](flutter/flutter-testing/SKILL.md) (P0) - Write unit, widget, and integration tests with robot patterns, widget keys, and Patrol in Flutter. Use when writing tests or implementing test automation.
- [**Auto Route Navigation**](flutter/flutter-auto-route-navigation/SKILL.md) (P1) - Implement typed routing, nested routes, and guards using auto_route in Flutter. Use when adding navigation flows, nested routes, or route guards with auto_route.
- [**Cicd**](flutter/flutter-cicd/SKILL.md) (P1) - Set up CI/CD pipelines for Flutter apps. Use when configuring automated testing, build, or deployment workflows with GitHub Actions or Fastlane.
- [**Concurrency**](flutter/flutter-concurrency/SKILL.md) (P1) - Execute long-running tasks in background isolates to keep the UI responsive. Use when performing heavy computations, parsing large datasets, or choosing between async/await and isolates.
- [**Dependency Injection**](flutter/flutter-dependency-injection/SKILL.md) (P1) - Configure service locator setup using injectable and get_it in Flutter. Use when wiring dependency injection with get_it or injectable.
- [**Error Handling**](flutter/flutter-error-handling/SKILL.md) (P1) - Implement functional error recovery with Either/Failure patterns in Flutter. Use when writing repositories, handling exceptions, or using dartz Either types.
- [**Idiomatic Flutter**](flutter/flutter-idiomatic-flutter/SKILL.md) (P1) - Compose modern Flutter layouts and widgets idiomatically. Use when composing widget trees, managing layout constraints, or following idiomatic Flutter patterns.
- [**Localization**](flutter/flutter-localization/SKILL.md) (P1) - Add multi-language support using easy_localization with CSV or JSON assets. Use when implementing localization or translations in Flutter.
- [**Navigation**](flutter/flutter-navigation/SKILL.md) (P1) - Implement navigation patterns with go_router, deep linking, and named routes in Flutter. Use when building navigation, deep linking, or routing.
- [**Notifications**](flutter/flutter-notifications/SKILL.md) (P1) - Integrate push and local notifications using FCM and flutter_local_notifications. Use when adding push or local notification support to Flutter apps.
- [**Performance**](flutter/flutter-performance/SKILL.md) (P1) - Optimize Flutter widget rebuilds, memory usage, and rendering performance. Use when diagnosing jank, reducing rebuilds, or improving list performance.
- [**Widgets**](flutter/flutter-widgets/SKILL.md) (P1) - Build maintainable Flutter UI components with composition and theming. Use when building, refactoring, or reviewing widget implementations.

### 🤖 Android (Framework)

Modern Android development with Jetpack Compose and Hilt.

- [**Architecture**](android/android-architecture/SKILL.md) (P0) - Apply Clean Architecture layering, modularization, and Unidirectional Data Flow in Android projects. Use when setting up project structure, placing code in layers, configuring feature/core modules, or implementing UDF patterns.
- [**Compose**](android/android-compose/SKILL.md) (P0) - Build high-performance declarative UI with Jetpack Compose. Use when writing Composable functions, optimizing recomposition, hoisting state, or working with LazyColumn and side effects.
- [**Concurrency**](android/android-concurrency/SKILL.md) (P0) - Write correct coroutine scopes, Flow collection, and dispatcher injection in Android. Use when writing suspend functions, choosing between StateFlow and SharedFlow, or injecting Dispatchers for testability.
- [**Deployment**](android/android-deployment/SKILL.md) (P0) - Configure release signing, R8 obfuscation, and App Bundle publishing for Android. Use when setting up signing configs, enabling minification, adding ProGuard keep rules, or preparing for Play Store submission.
- [**Di**](android/android-di/SKILL.md) (P0) - Configure Hilt dependency injection with proper scoping, modules, and constructor injection in Android. Use when setting up Hilt DI, defining modules, or configuring component scoping.
- [**Legacy Security**](android/android-legacy-security/SKILL.md) (P0) - Harden Intent handling, WebView configuration, and FileProvider access in Android apps. Use when securing Intent extras, configuring WebViews, or exposing files via FileProvider.
- [**Navigation Type Safe**](android/android-navigation-type-safe/SKILL.md) (P0) - Implement type-safe Jetpack Navigation Compose routes using Kotlin serialization. Use when defining navigation graphs with type-safe destinations in Jetpack Compose.
- [**Networking**](android/android-networking/SKILL.md) (P0) - Integrate Retrofit, OkHttp, and Kotlinx Serialization for type-safe API communication in Android. Use when building API clients, adding interceptors, or configuring network security.
- [**Persistence**](android/android-persistence/SKILL.md) (P0) - Implement Room database schemas and DataStore preferences with proper async patterns in Android. Use when defining Room entities, DAOs, migrations, or replacing SharedPreferences with DataStore.
- [**Security**](android/android-security/SKILL.md) (P0) - Secure data encryption, network configuration, and permissions in Android apps. Use when handling API keys, auth tokens, certificate pinning, EncryptedSharedPreferences, or securing exported components.
- [**State**](android/android-state/SKILL.md) (P0) - Configure ViewModel state emission with StateFlow, sealed UiState classes, and lifecycle-safe collection in Android. Use when working with ViewModels, UiState patterns, or exposing state to Compose UI.
- [**Testing**](android/android-testing/SKILL.md) (P0) - Write unit tests, Compose UI tests, and Hilt-integrated tests for Android. Use when writing test files or testing ViewModels, Composables, or Repositories with MockK and coroutine test utilities.
- [**Agp Upgrade**](android/android-agp-upgrade/SKILL.md) (P1) - Upgrade an Android project to Android Gradle Plugin (AGP) 9. Use when migrating to AGP 9, updating Gradle build files, migrating to built-in Kotlin, or adopting the new AGP DSL.
- [**Background Work**](android/android-background-work/SKILL.md) (P1) - Implement WorkManager and background processing correctly on Android. Use when creating Worker classes, scheduling tasks, choosing between WorkManager and Foreground Services, or setting up Hilt in workers.
- [**Compose Migration**](android/android-compose-migration/SKILL.md) (P1) - Migrate an Android XML View to Jetpack Compose following a structured 10-step workflow. Use when converting XML layouts to Compose, setting up Compose in an existing View-based project, or incrementally adopting Compose.
- [**Edge To Edge**](android/android-edge-to-edge/SKILL.md) (P1) - Migrate a Jetpack Compose app to edge-to-edge display and fix system bar inset issues. Use when UI components are obscured by navigation/status bars, fixing IME insets, or enabling edge-to-edge for SDK 35+.
- [**Legacy Navigation**](android/android-legacy-navigation/SKILL.md) (P1) - Implement Jetpack Navigation Component with XML graphs and SafeArgs for type-safe fragment navigation. Use when working with XML-based navigation or SafeArgs in legacy Android projects.
- [**Legacy State**](android/android-legacy-state/SKILL.md) (P1) - Integrate ViewModel state with Views using Coroutines and Lifecycle on Android. Use when managing state with repeatOnLifecycle or lifecycle-aware coroutines in Fragment/Activity.
- [**Navigation 3**](android/android-navigation-3/SKILL.md) (P1) - Install and migrate to Jetpack Navigation 3. Use when implementing Navigation 3 patterns including NavDisplay, NavKey routes, deep links, multiple backstacks, scenes (dialogs, bottom sheets), or migrating from Navigation 2.
- [**Performance**](android/android-performance/SKILL.md) (P1) - Optimize Android app startup, UI rendering, and frame stability with Baseline Profiles and lazy initialization. Use when reducing startup time, diagnosing jank, or improving rendering performance.
- [**Tooling**](android/android-tooling/SKILL.md) (P1) - Configure static analysis with Detekt, Ktlint, and Android Lint for CI/CD quality gates. Use when adding lint rules, configuring code quality checks, or setting up analysis as a CI gate.
- [**Xml Views**](android/android-xml-views/SKILL.md) (P1) - Implement ViewBinding, RecyclerView, and XML layouts correctly on Android. Use when working with XML layouts, ViewBinding, or RecyclerView adapters in legacy Android projects.
- [**Design System**](android/android-design-system/SKILL.md) (P2) - Enforce Material Design 3 theming and design token usage in Jetpack Compose. Use when implementing M3 components, color schemes, typography, or design tokens.
- [**Navigation**](android/android-navigation/SKILL.md) (P2) - Implement navigation with Jetpack Compose Navigation and App Links on Android. Use when implementing navigation flows, deep links, or backstack handling.
- [**Notifications**](android/android-notifications/SKILL.md) (P2) - Integrate push notifications using Firebase Cloud Messaging and NotificationCompat on Android. Use when setting up FCM, creating notification channels, or handling local notifications.
- [**Resources**](android/android-resources/SKILL.md) (P2) - Organize strings, drawables, and localization resources in Android projects. Use when managing Android resources, plurals, or adding multi-language support.

### 🅰️ Angular (Framework)

Modern Angular standards (Standalone components, Signals).

- [**Architecture**](angular/angular-architecture/SKILL.md) (P0) - Standards for Angular project structure, feature modules, and lazy loading. Use when structuring Angular apps, defining feature modules, or configuring lazy loading.
- [**Components**](angular/angular-components/SKILL.md) (P0) - Build standalone Angular components with Signals inputs, OnPush change detection, Control Flow, and Smart/Dumb patterns. Use when building standalone Angular components, implementing @if/@for control flow, applying OnPush change detection, or implementing Signals in Angular components.
- [**Dependency Injection**](angular/angular-dependency-injection/SKILL.md) (P0) - Configure DI, inject() usage, and providers in Angular. Use when configuring Angular dependency injection, using inject(), or defining providers.
- [**Routing**](angular/angular-routing/SKILL.md) (P0) - Configure Angular Router with lazy-loaded routes, functional guards, and component input binding. Use when defining routes, lazy-loading features, creating route guards, or setting up resolvers.
- [**Security**](angular/angular-security/SKILL.md) (P0) - Harden Angular apps against XSS, CSP violations, and unauthorized access. Use when implementing XSS protection, Content Security Policy, or auth guards in Angular.
- [**Style Guide**](angular/angular-style-guide/SKILL.md) (P0) - Naming conventions, file structure, and coding standards for Angular projects. Use when naming Angular files, organizing project structure, or following Angular style guide.
- [**Http Client**](angular/angular-http-client/SKILL.md) (P1) - Integrate HttpClient, Interceptors, and API interactions in Angular. Use when integrating HttpClient, writing interceptors, or handling API calls in Angular.
- [**Performance**](angular/angular-performance/SKILL.md) (P1) - Optimization techniques including OnPush, @defer, and Image Optimization. Use when optimizing Angular rendering, deferring blocks, or improving Core Web Vitals.
- [**Rxjs Interop**](angular/angular-rxjs-interop/SKILL.md) (P1) - Bridge Observables and Signals using toSignal and toObservable in Angular. Use when converting between RxJS Observables and Angular Signals.
- [**State Management**](angular/angular-state-management/SKILL.md) (P1) - Implement application state with Angular Signals, computed derivations, and NgRx Signal Store. Use when implementing reactive state with signal(), computed(), effect(), or @ngrx/signals in Angular.
- [**Testing**](angular/angular-testing/SKILL.md) (P1) - Write Angular component tests using TestBed, ComponentHarness, and HttpTestingController with proper signal input handling. Use when writing component tests, mocking HTTP calls, or testing signal inputs.
- [**Directives Pipes**](angular/angular-directives-pipes/SKILL.md) (P2) - Compose HostDirectives and Pure Pipes in Angular. Use when creating attribute directives with HostDirectives or writing pure pipes in Angular.
- [**Forms**](angular/angular-forms/SKILL.md) (P2) - Build typed reactive forms with strict FormGroup typing, custom validators, and nonNullable controls in Angular. Use when implementing typed reactive forms, custom validators, or form control patterns.
- [**Ssr**](angular/angular-ssr/SKILL.md) (P2) - Implement Angular SSR with hydration, TransferState caching, and per-route render modes. Use when configuring Angular Universal SSR, client hydration, static prerendering, or preventing double-fetching.
- [**Tooling**](angular/angular-tooling/SKILL.md) (P2) - Angular CLI usage, code generation, build configuration, and bundle optimization. Use when creating Angular projects, generating components/services/guards, configuring builds, running tests, or analyzing bundles.

### 🔷 Dart (Language)

Core language idioms and patterns.

- [**Language**](dart/dart-language/SKILL.md) (P0) - Dart 3.x language feature standards: null safety, records, sealed classes, switch pattern matching, extensions, and async/await. Use when using !, ?., ??, late, sealed classes, record types, switch expressions, or async patterns — and before introducing any new Dart 3.x construct to confirm the modern idiomatic approach.
- [**Best Practices**](dart/dart-best-practices/SKILL.md) (P1) - Dart code quality conventions: naming, const/final/var hierarchy, single quotes, trailing commas, collection idioms, tear-offs, and import organization. Use when writing new Dart code or reviewing for style violations — wrong import style, global variables, var misuse, anonymous lambdas where tear-offs fit, or missing trailing commas.
- [**Tooling**](dart/dart-tooling/SKILL.md) (P1) - Dart static analysis, linting, formatting, and code-generation standards. Use when touching analysis_options.yaml, running build_runner, configuring dart format line length, setting up DCM metrics, or adding pre-commit hooks via lefthook — and whenever a CI job fails on analyze or format steps.

### 🔷 TypeScript (Language)

Modern TypeScript standards for type-safe development.

- [**Language**](typescript/typescript-language/SKILL.md) (P0) - Apply modern TypeScript standards for type safety and maintainability. Use when working with types, interfaces, generics, enums, unions, or tsconfig settings.
- [**Security**](typescript/typescript-security/SKILL.md) (P0) - Validate input, secure auth tokens, and prevent injection attacks in TypeScript. Use when validating input, handling auth tokens, sanitizing data, or managing secrets and sensitive configuration.
- [**Best Practices**](typescript/typescript-best-practices/SKILL.md) (P1) - Write idiomatic TypeScript patterns for clean, maintainable code. Use when writing or refactoring TypeScript classes, functions, modules, or async logic.
- [**Tooling**](typescript/typescript-tooling/SKILL.md) (P1) - Development tools, linting, and build config for TypeScript. Use when configuring ESLint, Prettier, Jest, Vitest, tsconfig, or any TS build tooling.

### 🟨 JavaScript (Language)

Modern JavaScript (ES2022+) patterns.

- [**Language**](javascript/javascript-language/SKILL.md) (P0) - Modern JavaScript (ES2022+) patterns for clean, maintainable code. Use when working with modern JavaScript features like optional chaining, nullish coalescing, or ESM.
- [**Best Practices**](javascript/javascript-best-practices/SKILL.md) (P1) - Idiomatic JavaScript patterns and conventions for maintainable code. Use when writing or refactoring JavaScript following idiomatic patterns and conventions.
- [**Tooling**](javascript/javascript-tooling/SKILL.md) (P1) - Configure development tools, linting, and testing for JavaScript projects. Use when configuring ESLint, Prettier, or test runners for JavaScript projects.

### ⚛️ React (Framework)

Modern React development patterns.

- [**Component Patterns**](react/react-component-patterns/SKILL.md) (P0) - Build modern React component architecture with composition patterns. Use when designing reusable React components, applying composition patterns, or structuring component hierarchies.
- [**Hooks**](react/react-hooks/SKILL.md) (P0) - Write efficient React functional components and hooks. Use when writing custom hooks, optimizing useEffect, or working with useMemo/useCallback in React.
- [**Performance**](react/react-performance/SKILL.md) (P0) - Optimize React rendering, bundle size, and data fetching performance. Use when optimizing React rendering performance, reducing re-renders, or improving bundle size.
- [**Security**](react/react-security/SKILL.md) (P0) - Prevent XSS, secure auth flows, and harden React client-side applications. Use when preventing XSS, securing auth flows, or auditing third-party dependencies in React.
- [**State Management**](react/react-state-management/SKILL.md) (P0) - Select and implement local, global, and server state patterns in React. Use when choosing or implementing state management (Context, Zustand, Redux, React Query) in React.
- [**Typescript**](react/react-typescript/SKILL.md) (P1) - Type React components and hooks with TypeScript patterns. Use when typing React props, hooks, event handlers, or component generics in TypeScript.
- [**Testing**](react/react-testing/SKILL.md) (P2) - Test React components with RTL and Jest/Vitest. Use when writing React component tests with React Testing Library, Jest, or Vitest.
- [**Tooling**](react/react-tooling/SKILL.md) (P2) - Configure debugging, bundle analysis, and ecosystem tools for React applications. Use when setting up Vite/webpack build tooling, analyzing bundle size, debugging re-renders with React DevTools, or configuring ESLint and StrictMode for React projects.

### 📱 React Native (Framework)

Mobile app standards for iOS and Android.

- [**Architecture**](react-native/react-native-architecture/SKILL.md) (P0) - Structure React Native projects with feature-first organization and separation of concerns. Use when structuring a React Native project or applying clean architecture patterns.
- [**Components**](react-native/react-native-components/SKILL.md) (P0) - Build modern React Native components using function components and composition. Use when building or refactoring React Native function components and composable UI.
- [**Navigation V6**](react-native/react-native-navigation-v6/SKILL.md) (P0) - Configure React Navigation 6+ stacks, tabs, and deep linking for React Native. Use when implementing React Navigation stacks, tabs, or deep linking in React Native.
- [**Performance**](react-native/react-native-performance/SKILL.md) (P0) - Optimize React Native rendering for smooth 60fps mobile experiences. Use when optimizing React Native app performance, reducing re-renders, or fixing frame drops.
- [**Security**](react-native/react-native-security/SKILL.md) (P0) - Secure storage, network traffic, and deep links in React Native mobile apps. Use when implementing secure storage, certificate pinning, or deep link validation in React Native.
- [**Dls**](react-native/react-native-dls/SKILL.md) (P1) - Enforce design token usage in React Native. Use when enforcing a design system, preventing hardcoded styles, or implementing theme tokens in React Native.
- [**Navigation**](react-native/react-native-navigation/SKILL.md) (P1) - Set up navigation stacks and deep linking with React Navigation in React Native. Use when setting up navigation stacks or deep linking in React Native with React Navigation.
- [**Notifications**](react-native/react-native-notifications/SKILL.md) (P1) - Push notifications for React Native using Firebase or Expo Notifications. Use when integrating push notifications with Firebase or Expo in React Native.
- [**Platform Specific**](react-native/react-native-platform-specific/SKILL.md) (P1) - Resolve iOS and Android differences using Platform API and native modules in React Native. Use when handling platform-specific behavior or integrating native modules in React Native.
- [**State Management**](react-native/react-native-state-management/SKILL.md) (P1) - Implement local and global state with Context, Zustand, and Redux Toolkit in React Native. Use when choosing or implementing state management in React Native with Context, Zustand, or Redux.
- [**Styling**](react-native/react-native-styling/SKILL.md) (P1) - Style React Native apps with StyleSheet API, Flexbox, theming, and responsive design. Use when implementing React Native styles, theming, Flexbox layouts, or responsive design.
- [**Testing**](react-native/react-native-testing/SKILL.md) (P1) - Test React Native components with Jest and React Native Testing Library. Use when writing Jest or React Native Testing Library tests for React Native components.
- [**Deployment**](react-native/react-native-deployment/SKILL.md) (P2) - OTA updates with CodePush, EAS Build, and release configurations. Use when configuring OTA updates, EAS Build, or managing release configs for React Native.

### 🦁 NestJS (Framework)

Enterprise-grade Node.js backend development.

- [**Architecture**](nestjs/nestjs-architecture/SKILL.md) (P0) - Design decoupled, testable NestJS module boundaries with feature, core, and shared modules. Use when structuring module imports, creating feature modules, or enforcing separation of concerns in NestJS.
- [**Bullmq**](nestjs/nestjs-bullmq/SKILL.md) (P0) - Implement BullMQ job workflows in NestJS. Use when building queue processors, redis-throttler, Upstash limits, idle polling, stalled jobs, and retention policies.
- [**Controllers Services**](nestjs/nestjs-controllers-services/SKILL.md) (P0) - Separate Controllers from Services and build Custom Decorators in NestJS. Use when defining NestJS controllers, services, or custom parameter decorators.
- [**Database**](nestjs/nestjs-database/SKILL.md) (P0) - Implement data access patterns, Scaling, Migrations, and ORM selection in NestJS. Use when implementing TypeORM/Prisma repositories, migrations, or database patterns in NestJS.
- [**File Uploads**](nestjs/nestjs-file-uploads/SKILL.md) (P0) - Validate and stream file uploads securely with Validation and S3 streaming in NestJS. Use when implementing secure file uploads, validation, or S3 streaming in NestJS.
- [**Notification**](nestjs/nestjs-notification/SKILL.md) (P0) - Build dual-write notification services with database persistence and FCM push delivery in NestJS. Use when creating notification entities, sending push via FCM, or implementing in-app notification feeds.
- [**Security Isolation**](nestjs/nestjs-security-isolation/SKILL.md) (P0) - Enforce multi-tenant isolation and PostgreSQL Row Level Security in NestJS. Use when enforcing tenant isolation or PostgreSQL RLS in NestJS multi-tenant apps.
- [**Security**](nestjs/nestjs-security/SKILL.md) (P0) - Implement JWT authentication, RBAC guards, Helmet hardening, and Argon2 hashing in NestJS. Use when adding auth strategies, role-based access control, CSRF protection, or security headers.
- [**Transport**](nestjs/nestjs-transport/SKILL.md) (P0) - Configure gRPC, RabbitMQ, and monorepo contract patterns for NestJS microservices. Use when setting up gRPC service-to-service calls, RabbitMQ event-driven messaging, shared contract libraries, or microservice exception handling in NestJS.
- [**Api Standards**](nestjs/nestjs-api-standards/SKILL.md) (P1) - Create standardized API response envelopes, paginated endpoints, and error interceptors in NestJS. Use when implementing response wrappers, pagination DTOs, or global error formats.
- [**Caching**](nestjs/nestjs-caching/SKILL.md) (P1) - Implement multi-level caching, invalidation patterns, and stampede protection in NestJS. Use when adding Redis caching layers, configuring cache-manager interceptors, implementing stale-while-revalidate, or preventing cache stampedes in NestJS services.
- [**Configuration**](nestjs/nestjs-configuration/SKILL.md) (P1) - Environment variables validation and ConfigModule setup. Use when validating environment variables with Joi/Zod or configuring ConfigModule in NestJS.
- [**Deployment**](nestjs/nestjs-deployment/SKILL.md) (P1) - Containerize NestJS apps with multi-stage Docker builds, tune Node.js memory, and implement graceful shutdown hooks. Use when writing Dockerfiles, configuring K8s deployments, or adding shutdown hooks for NestJS.
- [**Error Handling**](nestjs/nestjs-error-handling/SKILL.md) (P1) - Implement Global Exception Filters and standard error formats in NestJS. Use when implementing global exception filters or standardizing error responses in NestJS.
- [**Observability**](nestjs/nestjs-observability/SKILL.md) (P1) - Configure structured logging with Pino, Prometheus metrics, and health checks for NestJS services. Use when adding JSON logging, request tracing with correlation IDs, Prometheus metric endpoints, or liveness/readiness health checks.
- [**Performance**](nestjs/nestjs-performance/SKILL.md) (P1) - Optimize NestJS throughput with Fastify adapter, singleton scope enforcement, compression, and query projections. Use when switching to Fastify, diagnosing request-scoped bottlenecks, or profiling API overhead.
- [**Real Time**](nestjs/nestjs-real-time/SKILL.md) (P1) - Implement WebSocket gateways with Socket.io and Server-Sent Events endpoints in NestJS. Use when building chat features, live feeds, or choosing between WebSocket and SSE for real-time communication.
- [**Scheduling**](nestjs/nestjs-scheduling/SKILL.md) (P1) - Implement distributed cron jobs with Redis-based locking and BullMQ offloading in NestJS. Use when adding @Cron scheduled tasks, preventing duplicate runs across pods, or delegating heavy work to queue workers.
- [**Search**](nestjs/nestjs-search/SKILL.md) (P1) - Integrate Elasticsearch and implement search index Sync patterns in NestJS. Use when integrating Elasticsearch or implementing search index sync in NestJS.
- [**Documentation**](nestjs/nestjs-documentation/SKILL.md) (P2) - Automate Swagger/OpenAPI documentation and standardize API response schemas in NestJS. Use when generating OpenAPI specs, documenting paginated or generic responses, configuring the Nest CLI Swagger plugin, or publishing versioned API docs.
- [**Testing**](nestjs/nestjs-testing/SKILL.md) (P2) - Write Unit and E2E tests with Jest, mocking strategies, and database isolation in NestJS. Use when writing NestJS unit tests, E2E tests with supertest, or mock providers.

### ▲ Next.js (Framework)

Modern fullstack React framework standards (App Router).

- [**App Router**](nextjs/nextjs-app-router/SKILL.md) (P0) - Configure file-system routing with nested layouts, route groups, parallel routes, and error boundaries in Next.js App Router. Use when creating page routes, adding loading/error states, or organizing routes with groups and dynamic segments.
- [**Authentication**](nextjs/nextjs-authentication/SKILL.md) (P0) - Secure token storage (HttpOnly Cookies) and Middleware patterns. Use when implementing authentication, secure session storage, or auth middleware in Next.js.
- [**Data Fetching**](nextjs/nextjs-data-fetching/SKILL.md) (P0) - Implement Fetch API, Caching, and Revalidation strategies in Next.js. Use when fetching data, configuring cache behavior, or implementing revalidation in Next.js.
- [**Pages Router**](nextjs/nextjs-pages-router/SKILL.md) (P0) - Implement Pages Router data fetching with getServerSideProps, getStaticProps, and API routes in Next.js legacy projects. Use when working in a pages/ directory project, adding SSR/SSG data fetching, or creating API routes.
- [**Rendering**](nextjs/nextjs-rendering/SKILL.md) (P0) - Select and implement SSG, SSR, ISR, Streaming, or Partial Prerendering strategies in Next.js App Router. Use when choosing a rendering mode for a page, configuring generateStaticParams, or enabling PPR.
- [**Security**](nextjs/nextjs-security/SKILL.md) (P0) - Secure Next.js App Router with middleware auth, Server Action validation, CSP headers, and taint APIs. Use when adding authentication middleware, validating Server Action inputs with Zod, or preventing secret leakage to client bundles.
- [**Server Components**](nextjs/nextjs-server-components/SKILL.md) (P0) - Build async React Server Components and place 'use client' boundaries at leaf nodes for interactivity in Next.js App Router. Use when deciding RSC vs Client Component, composing server data into client wrappers, or fixing hydration errors.
- [**Caching**](nextjs/nextjs-caching/SKILL.md) (P1) - Configure the 4 caching layers in Next.js: request memoization, data cache, full-route cache, and router cache. Use when setting revalidation strategies, invalidating cached data with tags, or diagnosing stale data bugs.
- [**Data Access Layer**](nextjs/nextjs-data-access-layer/SKILL.md) (P1) - Build secure, reusable data access patterns with DTOs, taint checks, and colocated authorization in Next.js. Use when centralizing database queries, transforming raw data to DTOs, adding server-only guards, or preventing sensitive data from reaching Client Components.
- [**Optimization**](nextjs/nextjs-optimization/SKILL.md) (P1) - Optimize images, fonts, scripts, and metadata for Next.js performance and Core Web Vitals. Use when configuring next/image for LCP, next/font for zero layout shift, next/script loading strategies, or generateMetadata for SEO.
- [**Server Actions**](nextjs/nextjs-server-actions/SKILL.md) (P1) - Implement mutations, forms, and RPC-style calls with Next.js Server Actions. Use when implementing Server Actions, form mutations, or RPC-style data mutations in Next.js.
- [**Styling**](nextjs/nextjs-styling/SKILL.md) (P1) - Implement zero-runtime CSS with Tailwind, CSS Modules, and the cn() utility for RSC-compatible styling in Next.js. Use when choosing a styling library, creating dynamic class utilities, or optimizing fonts with next/font.
- [**Testing**](nextjs/nextjs-testing/SKILL.md) (P1) - Write Jest or Vitest unit tests with React Testing Library and Playwright E2E tests for Next.js projects. Use when testing components with RTL, mocking APIs with MSW, or creating Playwright user flow tests.
- [**Upgrade**](nextjs/nextjs-upgrade/SKILL.md) (P1) - Next.js version migrations using official guides and codemods. Use when migrating a Next.js project to a new major version using codemods.
- [**Architecture**](nextjs/nextjs-architecture/SKILL.md) (P2) - Structure Next.js projects with Feature-Sliced Design layers, domain-grouped slices, and strict import hierarchy. Use when organizing features into FSD layers, enforcing slice boundaries, or keeping page.tsx thin.
- [**I18n**](nextjs/nextjs-i18n/SKILL.md) (P2) - Best practices for multi-language handling, locale routing, and detection strategies across App and Pages Router. Use when adding i18n, locale routing, or language detection in Next.js.
- [**State Management**](nextjs/nextjs-state-management/SKILL.md) (P2) - Apply best practices for managing URL, server, and client state in Next.js applications. Use when choosing between URL params, SWR/TanStack Query, Zustand, or Context for state, or when fixing hydration mismatches from localStorage.
- [**Tooling**](nextjs/nextjs-tooling/SKILL.md) (P2) - Configure Next.js build tooling, deployment, and developer workflow. Use when setting up Turbopack, standalone Docker output, bundle analysis, CI caching, environment variable validation, or ESLint integration for Next.js projects.

### 🐘 Laravel (Framework)

Expert standards for scalable Laravel 11.x/12.x applications.

- [**Architecture**](laravel/laravel-architecture/SKILL.md) (P0) - Enforce core architectural standards for scalable Laravel applications. Use when structuring controllers, service layers, action classes, Form Requests, or Service Container bindings in Laravel projects.
- [**Eloquent**](laravel/laravel-eloquent/SKILL.md) (P0) - Write performant Eloquent queries with eager loading, reusable scopes, and strict lazy-loading prevention in Laravel. Use when defining model relationships, creating query scopes, or processing large datasets with chunk/cursor.
- [**Security**](laravel/laravel-security/SKILL.md) (P0) - Harden Laravel apps with Policies for model authorization, Gate-based RBAC, validated mass assignment, and CSRF protection. Use when creating authorization policies, securing env config access, or preventing mass assignment vulnerabilities.
- [**Api**](laravel/laravel-api/SKILL.md) (P1) - Build REST endpoints with API Resources, Sanctum authentication, and versioned route groups in Laravel. Use when creating JsonResource classes, adding token-based auth, or defining rate-limited API routes.
- [**Background Processing**](laravel/laravel-background-processing/SKILL.md) (P1) - Build scalable asynchronous workflows using Queues, Jobs, and Events in Laravel. Use when implementing queued jobs, event-driven workflows, or async processing in Laravel.
- [**Clean Architecture**](laravel/laravel-clean-architecture/SKILL.md) (P1) - Implement Domain-Driven Design with typed DTOs, repository interfaces, and single-responsibility Action classes in Laravel. Use when creating domain folders, binding repository contracts in providers, or passing DTOs between layers.
- [**Database Expert**](laravel/laravel-database-expert/SKILL.md) (P1) - Optimize Laravel queries with subqueries, joinSub, Redis cache-aside patterns, and read/write connection splitting. Use when writing complex joins, implementing Cache::remember with tags, or configuring database read replicas.
- [**Sessions Middleware**](laravel/laravel-sessions-middleware/SKILL.md) (P1) - Configure Redis session drivers, register security-header middleware, and prevent session fixation in Laravel. Use when switching session drivers, adding HSTS/CSP headers via middleware, or regenerating sessions after login.
- [**Testing**](laravel/laravel-testing/SKILL.md) (P1) - Write Pest feature tests with RefreshDatabase, mock external services, and create test data with Eloquent Factories in Laravel. Use when adding HTTP tests, configuring SQLite in-memory test database, or mocking payment services.
- [**Tooling**](laravel/laravel-tooling/SKILL.md) (P2) - Configure Laravel ecosystem with custom Artisan commands, Vite asset bundling, Pint code styling, and Horizon queue monitoring. Use when creating Artisan commands, migrating from Mix to Vite, or configuring Pint code standards.

### 🐹 Golang (Language)

High-performance system and backend development with Go.

- [**Api Server**](golang/golang-api-server/SKILL.md) (P0) - Build HTTP services, REST APIs, and middleware in Go. Use when building Go HTTP servers, REST APIs, or custom middleware.
- [**Architecture**](golang/golang-architecture/SKILL.md) (P0) - Structure Go projects with Clean Architecture and standard layout conventions. Use when structuring Go projects or applying Clean Architecture in Go.
- [**Concurrency**](golang/golang-concurrency/SKILL.md) (P0) - Write safe concurrent Go code with goroutines, channels, and context. Use when implementing concurrency with goroutines, channels, or context in Go.
- [**Database**](golang/golang-database/SKILL.md) (P0) - Implement database access with connection pooling and repository patterns in Go. Use when building database access, connection pools, or repositories in Go.
- [**Error Handling**](golang/golang-error-handling/SKILL.md) (P0) - Standards for error wrapping, checking, and definition in Golang. Use when wrapping errors, defining sentinel errors, or handling errors idiomatically in Go.
- [**Language**](golang/golang-language/SKILL.md) (P0) - Core idioms, style guides, and best practices for writing idiomatic Go code. Use when writing Go code following official style guides and idiomatic patterns.
- [**Security**](golang/golang-security/SKILL.md) (P0) - Secure Go backend services against common vulnerabilities. Use when implementing input validation, crypto, or SQL injection prevention in Go.
- [**Testing**](golang/golang-testing/SKILL.md) (P0) - Write unit tests with table-driven patterns and interface mocking in Go. Use when writing Go unit tests, table-driven tests, or using mock interfaces.
- [**Configuration**](golang/golang-configuration/SKILL.md) (P1) - Load and validate application configuration from environment variables and config files. Use when managing Go application config with environment variables or viper.
- [**Logging**](golang/golang-logging/SKILL.md) (P1) - Standards for structured logging and observability in Golang. Use when adding structured logging or tracing to Go services.
- [**Tooling**](golang/golang-tooling/SKILL.md) (P1) - Go developer toolchain — gopls LSP diagnostics, linting, formatting, and vet. Use when setting up Go tooling, running linters, or integrating gopls with Claude Code.

### 🍎 iOS (Framework)

Modern iOS development with Swift, SwiftUI, and TCA/MVVM.

- [**App Lifecycle**](ios/ios-app-lifecycle/SKILL.md) (P0) - Configure AppDelegate, SceneDelegate, deep linking, and background tasks. Use when configuring iOS app lifecycle, deep linking, or background task scheduling.
- [**Architecture**](ios/ios-architecture/SKILL.md) (P0) - Apply MVVM, Coordinators, and Clean Architecture (VIP/VIPER) in iOS apps. Use when applying MVVM, Coordinators, or VIP/VIPER architecture in iOS apps.
- [**Dependency Injection**](ios/ios-dependency-injection/SKILL.md) (P0) - Configure protocol-based DI with property wrappers and Factory/Swinject. Use when setting up dependency injection or factory patterns in iOS.
- [**Networking**](ios/ios-networking/SKILL.md) (P0) - Build API clients with URLSession, Alamofire, and Codable. Use when implementing URLSession networking, Alamofire, or API clients in iOS.
- [**Performance**](ios/ios-performance/SKILL.md) (P0) - Profile and optimize iOS apps with Instruments, memory management, and rendering techniques. Use when profiling iOS apps with Instruments or optimizing memory and rendering.
- [**Persistence**](ios/ios-persistence/SKILL.md) (P0) - Implement local persistence with SwiftData, Core Data, and Keychain. Use when setting up SwiftData models, Core Data stacks, or local persistence in iOS.
- [**Security**](ios/ios-security/SKILL.md) (P0) - Secure iOS apps with Keychain, biometrics, and data protection. Use when implementing Keychain storage, Face ID/Touch ID, or data protection in iOS.
- [**State Management**](ios/ios-state-management/SKILL.md) (P0) - Implement reactive state with Combine, Observation framework, and UDF patterns. Use when implementing state management with Combine, @Observable, or reactive patterns in iOS.
- [**Swiftui**](ios/ios-swiftui/SKILL.md) (P0) - Build declarative UI and manage data flow with SwiftUI in iOS. Use when building declarative SwiftUI views or managing data flow with property wrappers.
- [**Ui Navigation**](ios/ios-ui-navigation/SKILL.md) (P0) - Implement UIKit navigation, Auto Layout, and Apple Human Interface Guidelines in iOS. Use when implementing UIKit navigation, Auto Layout constraints, or HIG compliance.
- [**Deployment**](ios/ios-deployment/SKILL.md) (P1) - Automate provisioning, signing, and deployment with Fastlane. Use when provisioning iOS apps, managing code signing, or automating deployments with Fastlane.
- [**Localization**](ios/ios-localization/SKILL.md) (P1) - Implement String Catalogs, L10n workflows, and asset management for iOS. Use when adding multi-language support using iOS String Catalogs or L10n workflows.
- [**Design System**](ios/ios-design-system/SKILL.md) (P2) - Enforce design token usage in SwiftUI apps using iOS Human Interface Guidelines. Use when implementing design tokens, colors, or typography in SwiftUI.
- [**Navigation**](ios/ios-navigation/SKILL.md) (P2) - SwiftUI navigation and deep linking using NavigationStack and Universal Links. Use when implementing NavigationStack or Universal Links deep linking in iOS.
- [**Notifications**](ios/ios-notifications/SKILL.md) (P2) - Push notifications for iOS using UserNotifications framework and APNS. Use when integrating APNS push notifications in iOS applications.

### ☕ Java (Language)

Modern enterprise Java standards (17/21+).

- [**Language**](java/java-language/SKILL.md) (P0) - Modern Java 21+ standards including Records, Pattern Matching, and Virtual Threads. Use when working with Java records, sealed classes, switch expressions, text blocks, Optional, or upgrading from older Java versions.
- [**Testing**](java/java-testing/SKILL.md) (P0) - Testing standards using JUnit 5, AssertJ, and Mockito for Java. Use when writing or reviewing Java unit tests, setting up parameterized tests, writing integration tests with Testcontainers, or working with Mockito mocks.
- [**Best Practices**](java/java-best-practices/SKILL.md) (P1) - Apply core Effective Java patterns for robust, maintainable code. Use when applying SOLID principles, choosing between inheritance and composition, refactoring Java code smells, or reviewing class design.
- [**Concurrency**](java/java-concurrency/SKILL.md) (P1) - Implement modern concurrency with Virtual Threads and Structured Concurrency in Java. Use when implementing Java Virtual Threads (Java 21), Structured Concurrency with StructuredTaskScope, CompletableFuture pipelines, or debugging race conditions.
- [**Tooling**](java/java-tooling/SKILL.md) (P2) - Configure Maven, Gradle, and static analysis for Java projects. Use when setting up Java build tooling, configuring Spotless or Checkstyle, managing JDK versions with sdkman, writing Dockerfiles for Java services, or adding SpotBugs/SonarLint.

### 🐘 Kotlin (Language)

Modern Kotlin for Android and Server-side.

- [**Coroutines**](kotlin/kotlin-coroutines/SKILL.md) (P0) - Write safe, structured concurrent code with Kotlin Coroutines. Use when writing suspend functions, choosing coroutine scopes, handling cancellation in loops, selecting between StateFlow and SharedFlow, debugging coroutine leaks, or asked why GlobalScope is dangerous.
- [**Language**](kotlin/kotlin-language/SKILL.md) (P0) - Write idiomatic Kotlin 1.9+ with null safety, sealed classes, and expression syntax. Use when working with Kotlin null safety, data classes, sealed interfaces, extension functions, or migrating Java code to Kotlin.
- [**Best Practices**](kotlin/kotlin-best-practices/SKILL.md) (P1) - Core patterns for robust Kotlin code including scope functions and backing properties. Use when writing idiomatic Kotlin, choosing between scope functions (let/apply/run/also/with), encapsulating mutable state with backing properties, or exposing read-only collection interfaces.
- [**Tooling**](kotlin/kotlin-tooling/SKILL.md) (P2) - Configure Gradle Kotlin DSL, Version Catalogs, and MockK for Kotlin projects. Use when configuring build.gradle.kts, setting up libs.versions.toml, adding MockK for tests, or choosing between Kotlin-compatible test assertion libraries.

### 🐘 PHP (Language)

Modern PHP standards (8.x+).

- [**Error Handling**](php/php-error-handling/SKILL.md) (P0) - Implement modern PHP error and exception handling patterns. Use when implementing exception hierarchies, error handlers, or custom exceptions in PHP.
- [**Language**](php/php-language/SKILL.md) (P0) - Apply core PHP language standards and modern 8.x features. Use when working with PHP 8.x features like enums, fibers, readonly properties, or named arguments.
- [**Security**](php/php-security/SKILL.md) (P0) - PHP security standards for database access, password handling, and input validation. Use when securing PHP apps against SQL injection, XSS, or weak password storage.
- [**Best Practices**](php/php-best-practices/SKILL.md) (P1) - Write PHP following best practices, PSR standards, and code quality guidelines. Use when writing PHP following PSR standards, SOLID principles, or improving code quality.
- [**Testing**](php/php-testing/SKILL.md) (P1) - Write unit and integration tests for PHP applications with PHPUnit and Pest. Use when writing PHPUnit unit tests or integration tests for PHP applications.
- [**Concurrency**](php/php-concurrency/SKILL.md) (P2) - Implement concurrency and non-blocking I/O in modern PHP. Use when implementing concurrent requests, async processing, or non-blocking I/O in PHP.
- [**Tooling**](php/php-tooling/SKILL.md) (P2) - Configure PHP ecosystem tooling, dependency management, and static analysis. Use when managing Composer dependencies, running PHPStan, or configuring PHP build tools.

### 📈 Quality Engineering (Process)

Advanced standards for requirements, QA, and tool integration.

- [**Business Analysis**](quality-engineering/quality-engineering-business-analysis/SKILL.md) (P0) - Investigate requirements with atomic AC decomposition, actor/permission matrix, platform parity audit, truth table verification, and edge case discovery. Also enforces User Story authoring standards: story structure, scope fences, platform tags, toggle contracts, market isolation, and deferral patterns. Use when writing, reviewing, or improving User Stories, acceptance criteria, or doing impact analysis — especially for stories with multi-condition AC, feature toggles, market variants (VN/MY/SG), or undefined platform behavior.
- [**Appium Mcp**](quality-engineering/quality-engineering-appium-mcp/SKILL.md) (P1) - Drives iOS/Android mobile devices via Appium MCP. Use for verifying mobile bugs, E2E tests, and navigating real device clouds (LambdaTest/BrowserStack).
- [**Jira Integration**](quality-engineering/quality-engineering-jira-integration/SKILL.md) (P1) - Jira ↔ Zephyr traceability: fetch story AC and components, detect existing TC links, link new Zephyr TCs back to Jira, and apply has-zephyr-tests labels. Use after creating Zephyr test cases that need linking, when fetching a Jira story's details for test generation, or when auditing and cleaning up stale TC links.
- [**Playwright Cli**](quality-engineering/quality-engineering-playwright-cli/SKILL.md) (P1) - Standardizes token-efficient browser automation via playwright-cli. Use for web verification, navigation, and capturing snapshots/logs.
- [**Quality Assurance**](quality-engineering/quality-engineering-quality-assurance/SKILL.md) (P1) - Write manual test cases with 1-condition-per-TC granularity, Module_Action on Screen when Condition naming, platform prefix rules, and High/Normal/Low priority classification. Use when writing or reviewing manual test cases for Zephyr — to split compound TCs, fix naming violations, assign correct platform tags, or determine bug priority.
- [**Zephyr Coverage Analysis**](quality-engineering/quality-engineering-zephyr-coverage-analysis/SKILL.md) (P1) - Audit test coverage health, gaps, and QE debt for Jira stories or epics. Produces coverage_analysis_report.md with AC-to-TC heatmap, risk scores, and prioritized action plan. Use when assessing coverage percentage, pre-release readiness, sprint readiness, or identifying missing test cases. Do NOT use for TC creation — use zephyr-test-generation instead.
- [**Zephyr Test Generation**](quality-engineering/quality-engineering-zephyr-test-generation/SKILL.md) (P1) - Generate Zephyr test cases from Jira stories: parse AC, identify platform and market, impact-analyze existing TCs (update vs create new), draft test cases with correct naming/metadata/preconditions, and link back via Create Test Case Issue Link. Use when converting a Jira story into Zephyr TCs, or when requirement changes require updating existing TCs rather than creating duplicates.

### 🍃 Spring Boot (Framework)

Enterprise Java backend development with Spring Boot.

- [**Api Design**](spring-boot/spring-boot-api-design/SKILL.md) (P0) - Design Spring Boot APIs with OpenAPI, Versioning, and Global Error Handling. Use when designing Spring Boot APIs with OpenAPI specs, versioning, or global error handling.
- [**Architecture**](spring-boot/spring-boot-architecture/SKILL.md) (P0) - Structure Spring Boot 3+ projects with feature packaging and clean layering. Use when structuring Spring Boot 3 projects, defining layers, or applying architecture patterns.
- [**Best Practices**](spring-boot/spring-boot-best-practices/SKILL.md) (P0) - Apply core coding standards, dependency injection, and configuration for Spring Boot 3. Use when applying Spring Boot 3 coding standards or configuring dependency injection.
- [**Data Access**](spring-boot/spring-boot-data-access/SKILL.md) (P0) - Optimize JPA, Hibernate, and database interactions in Spring Boot. Use when implementing JPA entities, repositories, or database access in Spring Boot.
- [**Deployment**](spring-boot/spring-boot-deployment/SKILL.md) (P0) - Deploy Spring Boot apps with Docker, GraalVM native images, and graceful shutdown. Use when deploying Spring Boot apps as GraalVM native images, containers, or configuring shutdown.
- [**Microservices**](spring-boot/spring-boot-microservices/SKILL.md) (P0) - Standards for Feign clients and asynchronous messaging with Spring Cloud Stream. Use when implementing Feign HTTP clients or async event messaging in Spring Boot microservices.
- [**Observability**](spring-boot/spring-boot-observability/SKILL.md) (P0) - Instrument Spring Boot with Micrometer metrics, distributed tracing, and structured logging. Use when adding Micrometer metrics, distributed tracing, or structured logging to Spring Boot.
- [**Scheduling**](spring-boot/spring-boot-scheduling/SKILL.md) (P0) - Configure scheduled tasks and distributed locking with ShedLock in Spring Boot. Use when implementing @Scheduled tasks or distributed locking with ShedLock in Spring Boot.
- [**Security**](spring-boot/spring-boot-security/SKILL.md) (P0) - Configure Spring Security 6+ with Lambda DSL, JWT, and hardening rules. Use when configuring Spring Security 6+, OAuth2, JWT, or security hardening in Spring Boot.
- [**Testing**](spring-boot/spring-boot-testing/SKILL.md) (P0) - Write unit, integration, and slice tests for Spring Boot 3 applications. Use when writing unit tests, integration tests, or slice tests for Spring Boot 3 applications.

### 🦅 Swift (Language)

Modern Swift language standards (5.9+).

- [**Best Practices**](swift/swift-best-practices/SKILL.md) (P0) - Apply Guard, Value Types, Immutability, and Naming conventions in Swift. Use when writing idiomatic Swift using guard, value types, immutability, or naming conventions.
- [**Concurrency**](swift/swift-concurrency/SKILL.md) (P0) - Implement async/await, Actors, and structured concurrency in Swift. Use when implementing Swift async/await, Actors, or structured concurrency in iOS/macOS.
- [**Error Handling**](swift/swift-error-handling/SKILL.md) (P0) - Standards for throwing functions, Result type, and Never. Use when implementing Swift error throwing, designing error hierarchies, using Result types, or adding do-catch blocks.
- [**Language**](swift/swift-language/SKILL.md) (P0) - Apply Optionals, Protocols, Extensions, and Type Safety patterns in Swift. Use when working with Swift Optionals, Protocols, Extensions, or type-safe APIs.
- [**Memory Management**](swift/swift-memory-management/SKILL.md) (P0) - Prevent retain cycles via ARC, weak/unowned references, and Capture Lists in Swift. Use when managing Swift ARC, avoiding retain cycles, or configuring capture lists in closures.
- [**Swiftui**](swift/swift-swiftui/SKILL.md) (P0) - Configure SwiftUI state, view lifecycle, and Property Wrappers correctly. Use when managing SwiftUI state, view lifecycle, or property wrappers like @State and @Binding.
- [**Testing**](swift/swift-testing/SKILL.md) (P0) - Write XCTest cases, async tests, and organized test suites in Swift. Use when writing XCTest cases, async tests, or organizing test suites in Swift.
- [**Tooling**](swift/swift-tooling/SKILL.md) (P0) - Configure SPM packages, SwiftLint, and build settings for Swift projects. Use when managing Swift packages with SPM, configuring build settings, or enforcing Swift code quality.

### 🗄️ Database (Infra)

Expert data access and optimization patterns.

- [**Mongodb**](database/database-mongodb/SKILL.md) (P0) - Apply expert schema design, indexing, and performance rules for MongoDB. Use when designing MongoDB schemas, creating indexes, or optimizing NoSQL query performance.
- [**Postgresql**](database/database-postgresql/SKILL.md) (P0) - Enforce repository patterns, zero-downtime migrations, and indexing standards for PostgreSQL with TypeORM or Prisma. Use when defining entities, writing migrations, adding RLS policies, or optimizing query performance.
- [**Redis**](database/database-redis/SKILL.md) (P0) - Optimize Redis caching, key management, and performance. Use when implementing Redis caching strategies, managing key namespaces, or optimizing Redis performance.

### Specialists

Standards for specialists.

- [**Specialist Tdd Implementer**](specialists/specialist-tdd-implementer/SKILL.md) (P0) - Strict TDD specialist. Enforces RED -> GREEN -> REFACTOR loop, minimal implementation, and zero-noise test conventions.
- [**Specialist Jira Analyst**](specialists/specialist-jira-analyst/SKILL.md) (P1) - High-density JIRA analysis persona. Extracts reproduce steps, ACs, and market requirements with zero-hallucination rigor.
- [**Specialist Security Reviewer**](specialists/specialist-security-reviewer/SKILL.md) (P1) - High-density security audit persona. Enforces OWASP Top 10, {APP_NAME} security standards, and strict tool budgets (<= 8 calls).
<!-- SKILLS_INDEX_END -->

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
