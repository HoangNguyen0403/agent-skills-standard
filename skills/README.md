# Agent Skills Registry

This directory contains the source of truth for all AI agent skills. Skills are organized by **Category** (Language or Framework) and then by **Domain**.

## 📂 Structure

Each skill must follow the standard directory structure:
`skills/{category}/{skill-name}/SKILL.md`

## 🛠 Active Categories

<!-- SKILLS_INDEX_START -->
### 🌐 Common (Universal)

Cross-framework standards and best practices applicable to all development.

- [**Best Practices**](common/common-best-practices/SKILL.md) (P0) - Universal clean-code principles for any environment.
- [**Feedback Reporter**](common/common-feedback-reporter/SKILL.md) (P0) - CRITICAL - Before ANY file write, audit loaded skills for violations.
- [**Git Collaboration**](common/common-git-collaboration/SKILL.md) (P0) - Universal standards for version control, branching, and team collaboration.
- [**Mobile Ux Core**](common/common-mobile-ux-core/SKILL.md) (P0) - Universal mobile UX principles for touch-first interfaces.
- [**Performance Engineering**](common/common-performance-engineering/SKILL.md) (P0) - Universal standards for high-performance development.
- [**Product Requirements**](common/common-product-requirements/SKILL.md) (P0) - Expert process for gathering requirements and drafting PRDs (Iterative Discovery).
- [**Protocol Enforcement**](common/common-protocol-enforcement/SKILL.md) (P0) - Standards for Red-Team verification and adversarial protocol audit.
- [**Security Audit**](common/common-security-audit/SKILL.md) (P0) - Adversarial security probing and vulnerability assessments across Node, Go, Dart, Java, Python, and Rust.
- [**Security Standards**](common/common-security-standards/SKILL.md) (P0) - Universal security protocols for safe, resilient software.
- [**Skill Creator**](common/common-skill-creator/SKILL.md) (P0) - Standards for creating, testing, and optimizing Agent Skills.
- [**System Design**](common/common-system-design/SKILL.md) (P0) - Universal architectural standards for robust, scalable systems.
- [**Workflow Writing**](common/common-workflow-writing/SKILL.md) (P0) - Rules for writing concise, token-efficient workflow and skill files.
- [**Accessibility**](common/common-accessibility/SKILL.md) (P1) - WCAG 2.
- [**Api Design**](common/common-api-design/SKILL.md) (P1) - REST API conventions — HTTP semantics, status codes, versioning, pagination, and OpenAPI standards applicable to any framework.
- [**Architecture Audit**](common/common-architecture-audit/SKILL.md) (P1) - Protocol for auditing structural debt, logic leakage, and fragmentation across Web, Mobile, and Backend.
- [**Architecture Diagramming**](common/common-architecture-diagramming/SKILL.md) (P1) - Standards for creating clear, effective, and formalized software architecture diagrams (C4, UML).
- [**Code Review**](common/common-code-review/SKILL.md) (P1) - Standards for high-quality, persona-driven code reviews.
- [**Context Optimization**](common/common-context-optimization/SKILL.md) (P1) - Techniques to maximize context window efficiency, reduce latency, and prevent ''lost in middle'' issues through strategic masking and compaction.
- [**Debugging**](common/common-debugging/SKILL.md) (P1) - Systematic troubleshooting using the Scientific Method.
- [**Error Handling**](common/common-error-handling/SKILL.md) (P1) - Cross-cutting standards for error design, response shapes, error codes, and boundary placement.
- [**Mobile Animation**](common/common-mobile-animation/SKILL.md) (P1) - Motion design principles for mobile apps.
- [**Observability**](common/common-observability/SKILL.md) (P1) - Standards for structured logging, distributed tracing, and metrics across all backend services.
- [**Session Retrospective**](common/common-session-retrospective/SKILL.md) (P1) - Analyze conversation corrections to detect skill gaps and auto-improve the skills library.
- [**Tdd**](common/common-tdd/SKILL.md) (P1) - Enforces Test-Driven Development (Red-Green-Refactor).
- [**Documentation**](common/common-documentation/SKILL.md) (P2) - Essential rules for code comments, READMEs, and technical docs.

### �🎯 Flutter (Framework)

High-density standards for modern Flutter development.

- [**Bloc State Management**](flutter/flutter-bloc-state-management/SKILL.md) (P0) - Standards for predictable state management using flutter_bloc, freezed, and equatable.
- [**Design System**](flutter/flutter-design-system/SKILL.md) (P0) - Enforce Design Language System adherence in Flutter.
- [**Feature Based Clean Architecture**](flutter/flutter-feature-based-clean-architecture/SKILL.md) (P0) - Standards for organizing Flutter code by feature for scalability.
- [**Getx Navigation**](flutter/flutter-getx-navigation/SKILL.md) (P0) - Context-less navigation, named routes, and middleware using GetX.
- [**Getx State Management**](flutter/flutter-getx-state-management/SKILL.md) (P0) - Simple and powerful reactive state management using GetX.
- [**Go Router Navigation**](flutter/flutter-go-router-navigation/SKILL.md) (P0) - Typed routes, route state, and redirection using go_router.
- [**Layer Based Clean Architecture**](flutter/flutter-layer-based-clean-architecture/SKILL.md) (P0) - Standards for separation of concerns, layer dependency rules, and DDD in Flutter.
- [**Retrofit Networking**](flutter/flutter-retrofit-networking/SKILL.md) (P0) - HTTP networking standards using Dio and Retrofit with Auth interceptors.
- [**Riverpod State Management**](flutter/flutter-riverpod-state-management/SKILL.md) (P0) - Reactive state management using Riverpod 2.
- [**Security**](flutter/flutter-security/SKILL.md) (P0) - Security standards for Flutter applications based on OWASP Mobile.
- [**Testing**](flutter/flutter-testing/SKILL.md) (P0) - Unit, widget, and integration testing with robots, widget keys, and Patrol.
- [**Auto Route Navigation**](flutter/flutter-auto-route-navigation/SKILL.md) (P1) - Typed routing, nested routes, and guards using auto_route.
- [**Cicd**](flutter/flutter-cicd/SKILL.md) (P1) - Continuous Integration and Deployment standards for Flutter apps.
- [**Dependency Injection**](flutter/flutter-dependency-injection/SKILL.md) (P1) - Standards for automated service locator setup using injectable and get_it.
- [**Error Handling**](flutter/flutter-error-handling/SKILL.md) (P1) - Functional error handling using Dartz and Either.
- [**Idiomatic Flutter**](flutter/flutter-idiomatic-flutter/SKILL.md) (P1) - Modern layout and widget composition standards.
- [**Localization**](flutter/flutter-localization/SKILL.md) (P1) - Standards for multi-language support using easy_localization with CSV or JSON.
- [**Navigation**](flutter/flutter-navigation/SKILL.md) (P1) - Flutter navigation patterns including go_router, deep linking, and named routes.
- [**Notifications**](flutter/flutter-notifications/SKILL.md) (P1) - Push and local notifications for Flutter using FCM and flutter_local_notifications.
- [**Performance**](flutter/flutter-performance/SKILL.md) (P1) - Optimization standards for rebuilds and memory.
- [**Widgets**](flutter/flutter-widgets/SKILL.md) (P1) - Principles for maintainable UI components.

### 🤖 Android (Framework)

Modern Android development with Jetpack Compose and Hilt.

- [**Architecture**](android/android-architecture/SKILL.md) (P0) - Standards for Clean Architecture, Modularization, and Unidirectional Data Flow.
- [**Compose**](android/android-compose/SKILL.md) (P0) - Standards for high-performance Declarative UI and State Hoisting.
- [**Concurrency**](android/android-concurrency/SKILL.md) (P0) - Standards for Coroutines, Flow, and Threading.
- [**Deployment**](android/android-deployment/SKILL.md) (P0) - Standards for App Distribution (Signing, Obfuscation, App Bundles).
- [**Di**](android/android-di/SKILL.md) (P0) - Standards for Hilt Setup, Scoping, and Modules.
- [**Legacy Security**](android/android-legacy-security/SKILL.md) (P0) - Standards for Intents, WebViews, and FileProvider.
- [**Navigation Type Safe**](android/android-navigation-type-safe/SKILL.md) (P0) - Standards for Jetpack Navigation Compose (Type-safe).
- [**Networking**](android/android-networking/SKILL.md) (P0) - Standards for Retrofit, OkHttp, and API Communication.
- [**Persistence**](android/android-persistence/SKILL.md) (P0) - Standards for Room Database and DataStore.
- [**Security**](android/android-security/SKILL.md) (P0) - Standards for Data Encryption, Network Security, and Permissions.
- [**State**](android/android-state/SKILL.md) (P0) - Standards for ViewModel, StateFlow, and UI State Patterns.
- [**Testing**](android/android-testing/SKILL.md) (P0) - Standards for Unit Tests, UI Tests (Compose), and Hilt Integration.
- [**Background Work**](android/android-background-work/SKILL.md) (P1) - Standards for WorkManager and Background Processing.
- [**Legacy Navigation**](android/android-legacy-navigation/SKILL.md) (P1) - Standards for Jetpack Navigation Component (XML) and SafeArgs.
- [**Legacy State**](android/android-legacy-state/SKILL.md) (P1) - Standards for State integration with Views using Coroutines and Lifecycle.
- [**Performance**](android/android-performance/SKILL.md) (P1) - Standards for Baseline Profiles, Startup Time, and UI Rendering.
- [**Tooling**](android/android-tooling/SKILL.md) (P1) - Standards for Static Analysis (Detekt, Ktlint) and CI/CD Checks.
- [**Xml Views**](android/android-xml-views/SKILL.md) (P1) - Standards for ViewBinding, RecyclerView, and XML Layouts.
- [**Design System**](android/android-design-system/SKILL.md) (P2) - Enforce Material Design 3 and design token usage in Jetpack Compose apps.
- [**Navigation**](android/android-navigation/SKILL.md) (P2) - Navigation for Android using Jetpack Compose Navigation and App Links.
- [**Notifications**](android/android-notifications/SKILL.md) (P2) - Push notifications for Android using Firebase Cloud Messaging and NotificationCompat.
- [**Resources**](android/android-resources/SKILL.md) (P2) - Standards for Strings, Drawables, and Localization.

### 🅰️ Angular (Framework)

Modern Angular standards (Standalone components, Signals).

- [**Architecture**](angular/angular-architecture/SKILL.md) (P0) - Standards for Angular project structure, feature modules, and lazy loading.
- [**Component Patterns**](angular/angular-component-patterns/SKILL.md) (P0) - Standards for OnPush components and strict Signals usage.
- [**Components**](angular/angular-components/SKILL.md) (P0) - Standards for Standalone Components, Signals inputs, and Control Flow.
- [**Dependency Injection**](angular/angular-dependency-injection/SKILL.md) (P0) - Best practices for DI, inject() usage, and providers.
- [**Routing**](angular/angular-routing/SKILL.md) (P0) - Standards for Angular Router, Lazy Loading, and Guards.
- [**Security**](angular/angular-security/SKILL.md) (P0) - Security best practices for Angular (XSS, CSP, Route Guards).
- [**Style Guide**](angular/angular-style-guide/SKILL.md) (P0) - Naming conventions, file structure, and coding standards for Angular projects.
- [**Http Client**](angular/angular-http-client/SKILL.md) (P1) - Best practices for HttpClient, Interceptors, and API interactions.
- [**Performance**](angular/angular-performance/SKILL.md) (P1) - Optimization techniques including OnPush, @defer, and Image Optimization.
- [**Rxjs Interop**](angular/angular-rxjs-interop/SKILL.md) (P1) - Bridging Observables and Signals using toSignal and toObservable.
- [**State Management**](angular/angular-state-management/SKILL.md) (P1) - Signals-based state management and NgRx Signal Store.
- [**Testing**](angular/angular-testing/SKILL.md) (P1) - Standards for Component Test Harnesses and TestBed.
- [**Directives Pipes**](angular/angular-directives-pipes/SKILL.md) (P2) - Composition patterns using HostDirectives and Pure Pipes.
- [**Forms**](angular/angular-forms/SKILL.md) (P2) - Standards for Typed Reactive Forms and Validators.
- [**Ssr**](angular/angular-ssr/SKILL.md) (P2) - Hydration, TransferState, and Prerendering standards.

### 🔷 Dart (Language)

Core language idioms and patterns.

- [**Language**](dart/dart-language/SKILL.md) (P0) - Modern Dart standards (3.
- [**Best Practices**](dart/dart-best-practices/SKILL.md) (P1) - General purity standards for Dart development.
- [**Tooling**](dart/dart-tooling/SKILL.md) (P1) - Standards for analysis, linting, formatting, and automation.

### 🔷 TypeScript (Language)

Modern TypeScript standards for type-safe development.

- [**Language**](typescript/typescript-language/SKILL.md) (P0) - Modern TypeScript standards for type safety and maintainability.
- [**Security**](typescript/typescript-security/SKILL.md) (P0) - Secure coding practices for TypeScript.
- [**Best Practices**](typescript/typescript-best-practices/SKILL.md) (P1) - Idiomatic TypeScript patterns for clean, maintainable code.
- [**Tooling**](typescript/typescript-tooling/SKILL.md) (P1) - Development tools, linting, and build config for TypeScript.

### 🟨 JavaScript (Language)

Modern JavaScript (ES2022+) patterns.

- [**Language**](javascript/javascript-language/SKILL.md) (P0) - Modern JavaScript (ES2022+) patterns for clean, maintainable code.
- [**Best Practices**](javascript/javascript-best-practices/SKILL.md) (P1) - Idiomatic JavaScript patterns and conventions for maintainable code.
- [**Tooling**](javascript/javascript-tooling/SKILL.md) (P1) - Development tools, linting, and testing for JavaScript projects.

### ⚛️ React (Framework)

Modern React development patterns.

- [**Component Patterns**](react/react-component-patterns/SKILL.md) (P0) - Modern React component architecture and composition patterns.
- [**Hooks**](react/react-hooks/SKILL.md) (P0) - Standards for efficient React functional components and hooks usage.
- [**Performance**](react/react-performance/SKILL.md) (P0) - Optimization strategies for React applications (Client & Server).
- [**Security**](react/react-security/SKILL.md) (P0) - Security practices for React (XSS, Auth, Dependencies).
- [**State Management**](react/react-state-management/SKILL.md) (P0) - Standards for managing local, global, and server state.
- [**Typescript**](react/react-typescript/SKILL.md) (P1) - TypeScript patterns specific to React components and hooks.
- [**Testing**](react/react-testing/SKILL.md) (P2) - Testing strategies with RTL and Jest/Vitest.
- [**Tooling**](react/react-tooling/SKILL.md) (P2) - Debugging, build analysis, and ecosystem tools.

### 📱 React Native (Framework)

Mobile app standards for iOS and Android.

- [**Architecture**](react-native/react-native-architecture/SKILL.md) (P0) - Feature-first project structure and separation of concerns for React Native.
- [**Components**](react-native/react-native-components/SKILL.md) (P0) - Modern component patterns using function components and composition.
- [**Navigation V6**](react-native/react-native-navigation-v6/SKILL.md) (P0) - React Navigation 6+ standards for stack, tab, and deep linking.
- [**Performance**](react-native/react-native-performance/SKILL.md) (P0) - Optimization strategies for smooth 60fps mobile apps.
- [**Security**](react-native/react-native-security/SKILL.md) (P0) - Secure storage, deep linking security, and certificate pinning for mobile.
- [**Dls**](react-native/react-native-dls/SKILL.md) (P1) - Enforce design token usage in React Native.
- [**Navigation**](react-native/react-native-navigation/SKILL.md) (P1) - Navigation and deep linking for React Native using React Navigation.
- [**Notifications**](react-native/react-native-notifications/SKILL.md) (P1) - Push notifications for React Native using Firebase or Expo Notifications.
- [**Platform Specific**](react-native/react-native-platform-specific/SKILL.md) (P1) - Handling iOS and Android differences with Platform API and native modules.
- [**State Management**](react-native/react-native-state-management/SKILL.md) (P1) - Local and global state patterns with Context, Zustand, and Redux Toolkit.
- [**Styling**](react-native/react-native-styling/SKILL.md) (P1) - StyleSheet API, Flexbox, theming, and responsive design.
- [**Testing**](react-native/react-native-testing/SKILL.md) (P1) - Jest and React Native Testing Library for component and integration tests.
- [**Deployment**](react-native/react-native-deployment/SKILL.md) (P2) - OTA updates with CodePush, EAS Build, and release configurations.

### 🦁 NestJS (Framework)

Enterprise-grade Node.js backend development.

- [**Architecture**](nestjs/nestjs-architecture/SKILL.md) (P0) - Standards for scalable, modular NestJS backend architecture.
- [**Bullmq**](nestjs/nestjs-bullmq/SKILL.md) (P0) - Standard workflow for BullMQ jobs in NestJS.
- [**Controllers Services**](nestjs/nestjs-controllers-services/SKILL.md) (P0) - Controller/Service separation and Custom Decorators.
- [**Database**](nestjs/nestjs-database/SKILL.md) (P0) - Data access patterns, Scaling, Migrations, and ORM selection.
- [**File Uploads**](nestjs/nestjs-file-uploads/SKILL.md) (P0) - Secure file handling, Validation, and S3 streaming.
- [**Notification**](nestjs/nestjs-notification/SKILL.md) (P0) - Standards for Notification Types, Service Architecture, and FCM Integration.
- [**Security Isolation**](nestjs/nestjs-security-isolation/SKILL.md) (P0) - Standards for multi-tenant isolation and PostgreSQL Row Level Security.
- [**Security**](nestjs/nestjs-security/SKILL.md) (P0) - Authentication, RBAC, and Hardening standards.
- [**Transport**](nestjs/nestjs-transport/SKILL.md) (P0) - gRPC, RabbitMQ standards and Monorepo contracts.
- [**Api Standards**](nestjs/nestjs-api-standards/SKILL.md) (P1) - Response wrapping, pagination, and error standardization.
- [**Caching**](nestjs/nestjs-caching/SKILL.md) (P1) - Multi-level caching, Invalidation patterns, and Stampede protection.
- [**Configuration**](nestjs/nestjs-configuration/SKILL.md) (P1) - Environment variables validation and ConfigModule setup.
- [**Deployment**](nestjs/nestjs-deployment/SKILL.md) (P1) - Docker builds, Memory tuning, and Graceful shutdown.
- [**Error Handling**](nestjs/nestjs-error-handling/SKILL.md) (P1) - Global Exception Filters and standard error formats.
- [**Observability**](nestjs/nestjs-observability/SKILL.md) (P1) - Structured logging (Pino) and Prometheus metrics.
- [**Performance**](nestjs/nestjs-performance/SKILL.md) (P1) - Fastify adapter, Scope management, and Compression.
- [**Real Time**](nestjs/nestjs-real-time/SKILL.md) (P1) - WebSocket and SSE selection strategies and scaling.
- [**Scheduling**](nestjs/nestjs-scheduling/SKILL.md) (P1) - Distributed cron jobs and locking patterns.
- [**Search**](nestjs/nestjs-search/SKILL.md) (P1) - Elasticsearch integration and Sync patterns.
- [**Documentation**](nestjs/nestjs-documentation/SKILL.md) (P2) - Swagger automation and Generic response documentation.
- [**Testing**](nestjs/nestjs-testing/SKILL.md) (P2) - Unit and E2E testing with Jest, mocking strategies, and database isolation.

### ▲ Next.js (Framework)

Modern fullstack React framework standards (App Router).

- [**App Router**](nextjs/nextjs-app-router/SKILL.md) (P0) - File-system routing, Layouts, and Route Groups.
- [**Authentication**](nextjs/nextjs-authentication/SKILL.md) (P0) - Secure token storage (HttpOnly Cookies) and Middleware patterns.
- [**Data Fetching**](nextjs/nextjs-data-fetching/SKILL.md) (P0) - Fetch API, Caching, and Revalidation strategies.
- [**Pages Router**](nextjs/nextjs-pages-router/SKILL.md) (P0) - Legacy routing, getServerSideProps conventions, and strict architectural constraints.
- [**Rendering**](nextjs/nextjs-rendering/SKILL.md) (P0) - SSG, SSR, ISR, Streaming, and Partial Prerendering (PPR).
- [**Security**](nextjs/nextjs-security/SKILL.md) (P0) - Core security standards for App Router and Server Actions.
- [**Server Components**](nextjs/nextjs-server-components/SKILL.md) (P0) - RSC usage, ''use client'' directive, and Component Purity.
- [**Caching**](nextjs/nextjs-caching/SKILL.md) (P1) - The 4 layers of caching in Next.
- [**Data Access Layer**](nextjs/nextjs-data-access-layer/SKILL.md) (P1) - Secure, reusable data access patterns with DTOs and Taint checks.
- [**Optimization**](nextjs/nextjs-optimization/SKILL.md) (P1) - Image, Font, Script, and Metadata optimization strategies.
- [**Server Actions**](nextjs/nextjs-server-actions/SKILL.md) (P1) - Mutations, Form handling, and RPC-style calls.
- [**Styling**](nextjs/nextjs-styling/SKILL.md) (P1) - Zero-runtime CSS strategies (Tailwind) and RSC compatibility.
- [**Testing**](nextjs/nextjs-testing/SKILL.md) (P1) - Unit, Integration, and E2E testing standards for App Router.
- [**Upgrade**](nextjs/nextjs-upgrade/SKILL.md) (P1) - Next.
- [**Architecture**](nextjs/nextjs-architecture/SKILL.md) (P2) - Scalable project structure using Feature-Sliced Design (FSD).
- [**I18n**](nextjs/nextjs-i18n/SKILL.md) (P2) - Best practices for multi-language handling, locale routing, and detection strategies across App and Pages Router.
- [**State Management**](nextjs/nextjs-state-management/SKILL.md) (P2) - Best practices for managing state (Server URL vs Client Hooks).
- [**Tooling**](nextjs/nextjs-tooling/SKILL.md) (P2) - Ecosystem optimization, deployment, and developer flow.

### 🐘 Laravel (Framework)

Expert standards for scalable Laravel 11.x/12.x applications.

- [**Architecture**](laravel/laravel-architecture/SKILL.md) (P0) - Core architectural standards for scalable Laravel applications.
- [**Eloquent**](laravel/laravel-eloquent/SKILL.md) (P0) - Advanced Eloquent ORM patterns for performance and query reuse.
- [**Security**](laravel/laravel-security/SKILL.md) (P0) - Security standards for hardening Laravel applications.
- [**Api**](laravel/laravel-api/SKILL.md) (P1) - REST and JSON API standards for modern Laravel backends.
- [**Background Processing**](laravel/laravel-background-processing/SKILL.md) (P1) - Scalable asynchronous workflows using Queues, Jobs, and Events.
- [**Clean Architecture**](laravel/laravel-clean-architecture/SKILL.md) (P1) - Expert patterns for DDD, DTOs, and Ports & Adapters in Laravel.
- [**Database Expert**](laravel/laravel-database-expert/SKILL.md) (P1) - Expert patterns for advanced queries, Redis caching, and database scalability.
- [**Sessions Middleware**](laravel/laravel-sessions-middleware/SKILL.md) (P1) - Expert standards for session drivers, security headers, and middleware logic.
- [**Testing**](laravel/laravel-testing/SKILL.md) (P1) - Automated testing standards with Pest and PHPUnit.
- [**Tooling**](laravel/laravel-tooling/SKILL.md) (P2) - Ecosystem management, Artisan, and asset bundling.

### 🐹 Golang (Language)

High-performance system and backend development with Go.

- [**Api Server**](golang/golang-api-server/SKILL.md) (P0) - Standards for building HTTP services, REST APIs, and middleware in Golang.
- [**Architecture**](golang/golang-architecture/SKILL.md) (P0) - Standards for structural design, Clean Architecture, and project layout in Golang.
- [**Concurrency**](golang/golang-concurrency/SKILL.md) (P0) - Standards for safe concurrent programming using Goroutines, Channels, and Context.
- [**Database**](golang/golang-database/SKILL.md) (P0) - Standards for database interaction, connection pooling, and repository patterns in Golang.
- [**Error Handling**](golang/golang-error-handling/SKILL.md) (P0) - Standards for error wrapping, checking, and definition in Golang.
- [**Language**](golang/golang-language/SKILL.md) (P0) - Core idioms, style guides, and best practices for writing idiomatic Go code.
- [**Security**](golang/golang-security/SKILL.md) (P0) - Security standards for Go backend services.
- [**Testing**](golang/golang-testing/SKILL.md) (P0) - Standards for unit testing, table-driven tests, and mocking in Golang.
- [**Configuration**](golang/golang-configuration/SKILL.md) (P1) - Standards for application configuration using environment variables and libraries.
- [**Logging**](golang/golang-logging/SKILL.md) (P1) - Standards for structured logging and observability in Golang.

### 🍎 iOS (Framework)

Modern iOS development with Swift, SwiftUI, and TCA/MVVM.

- [**App Lifecycle**](ios/ios-app-lifecycle/SKILL.md) (P0) - Standards for AppDelegate, SceneDelegate, Deep Linking, and Background Tasks.
- [**Architecture**](ios/ios-architecture/SKILL.md) (P0) - Standards for MVVM, Coordinators, and Clean Architecture (VIP/VIPER).
- [**Dependency Injection**](ios/ios-dependency-injection/SKILL.md) (P0) - Standards for Protocol-based DI, Property Wrappers, and Factory/Needle.
- [**Networking**](ios/ios-networking/SKILL.md) (P0) - Standards for URLSession, Alamofire, and API communication.
- [**Performance**](ios/ios-performance/SKILL.md) (P0) - Standards for Instruments, Memory Management, and Optimization.
- [**Persistence**](ios/ios-persistence/SKILL.md) (P0) - Standards for SwiftData, Core Data, and Local Storage.
- [**Security**](ios/ios-security/SKILL.md) (P0) - Standards for Keychain, Biometrics, and Data Protection.
- [**State Management**](ios/ios-state-management/SKILL.md) (P0) - Standards for Combine, Observation, and Reactive Programming.
- [**Swiftui**](ios/ios-swiftui/SKILL.md) (P0) - Standards for declarative UI construction and data flow in iOS.
- [**Ui Navigation**](ios/ios-ui-navigation/SKILL.md) (P0) - Standards for UIKit, Auto Layout, and Apple Human Interface Guidelines.
- [**Deployment**](ios/ios-deployment/SKILL.md) (P1) - Standards for Provisioning, Signing, and Fastlane.
- [**Localization**](ios/ios-localization/SKILL.md) (P1) - Standards for String Catalogs, L10n, and Asset Management.
- [**Design System**](ios/ios-design-system/SKILL.md) (P2) - Enforce design token usage in SwiftUI apps using iOS Human Interface Guidelines.
- [**Navigation**](ios/ios-navigation/SKILL.md) (P2) - SwiftUI navigation and deep linking using NavigationStack and Universal Links.
- [**Notifications**](ios/ios-notifications/SKILL.md) (P2) - Push notifications for iOS using UserNotifications framework and APNS.

### ☕ Java (Language)

Modern enterprise Java standards (17/21+).

- [**Language**](java/java-language/SKILL.md) (P0) - Modern Java standards (21+) including Records, Pattern Matching, and Virtual Threads.
- [**Testing**](java/java-testing/SKILL.md) (P0) - Modern testing practices using JUnit 5, AssertJ, and Mockito.
- [**Best Practices**](java/java-best-practices/SKILL.md) (P1) - Core engineering principles inspired by Effective Java and Clean Code.
- [**Concurrency**](java/java-concurrency/SKILL.md) (P1) - Modern concurrency patterns using Virtual Threads and Structured Concurrency.
- [**Tooling**](java/java-tooling/SKILL.md) (P2) - Standards for build tools (Maven/Gradle) and static analysis.

### 🐘 Kotlin (Language)

Modern Kotlin for Android and Server-side.

- [**Coroutines**](kotlin/kotlin-coroutines/SKILL.md) (P0) - Standards for safe, structured concurrency in Kotlin.
- [**Language**](kotlin/kotlin-language/SKILL.md) (P0) - Idiomatic Kotlin 1.
- [**Best Practices**](kotlin/kotlin-best-practices/SKILL.md) (P1) - Core patterns for robust Kotlin code (Scope Functions, Backing Properties).
- [**Tooling**](kotlin/kotlin-tooling/SKILL.md) (P2) - Build tools (Gradle KTS), Static Analysis (Detekt), and Testing standards.

### 🐘 PHP (Language)

Modern PHP standards (8.x+).

- [**Error Handling**](php/php-error-handling/SKILL.md) (P0) - Modern PHP error and exception handling standards.
- [**Language**](php/php-language/SKILL.md) (P0) - Core PHP language standards and modern 8.
- [**Security**](php/php-security/SKILL.md) (P0) - PHP security standards for database access, password handling, and input validation.
- [**Best Practices**](php/php-best-practices/SKILL.md) (P1) - PHP best practices, PSR standards, and code quality guidelines.
- [**Testing**](php/php-testing/SKILL.md) (P1) - Unit and integration testing standards for PHP applications.
- [**Concurrency**](php/php-concurrency/SKILL.md) (P2) - Handling concurrency and non-blocking I/O in modern PHP.
- [**Tooling**](php/php-tooling/SKILL.md) (P2) - PHP ecosystem tooling, dependency management, and static analysis.

### 📈 Quality Engineering (Process)

Advanced standards for requirements, QA, and tool integration.

- [**Business Analysis**](quality-engineering/quality-engineering-business-analysis/SKILL.md) (P0) - Standard for deep requirement investigation, logic validation, and technical impact mapping.
- [**Jira Integration**](quality-engineering/quality-engineering-jira-integration/SKILL.md) (P1) - Standards for retrieving Jira issue details and linking Zephyr test cases back to Jira.
- [**Quality Assurance**](quality-engineering/quality-engineering-quality-assurance/SKILL.md) (P1) - Standards for creating high-quality, granular manual test cases and QA processes.
- [**Zephyr Test Generation**](quality-engineering/quality-engineering-zephyr-test-generation/SKILL.md) (P1) - Workflow for generating or updating Zephyr Scale Test Cases from requirements.

### 🍃 Spring Boot (Framework)

Enterprise Java backend development with Spring Boot.

- [**Api Design**](spring-boot/spring-boot-api-design/SKILL.md) (P0) - Standards for OpenAPI, Versioning, and Global Error Handling.
- [**Architecture**](spring-boot/spring-boot-architecture/SKILL.md) (P0) - Standards for project structure and layering in Spring Boot 3+ applications.
- [**Best Practices**](spring-boot/spring-boot-best-practices/SKILL.md) (P0) - Core coding standards, dependency injection, and configuration for Spring Boot 3.
- [**Data Access**](spring-boot/spring-boot-data-access/SKILL.md) (P0) - Best practices for JPA, Hibernate, and Database interactions in Spring Boot.
- [**Deployment**](spring-boot/spring-boot-deployment/SKILL.md) (P0) - Standards for GraalVM Native Images, Docker, and Graceful Shutdown.
- [**Microservices**](spring-boot/spring-boot-microservices/SKILL.md) (P0) - Standards for Feign clients and asynchronous messaging with Spring Cloud Stream.
- [**Observability**](spring-boot/spring-boot-observability/SKILL.md) (P0) - Standards for Micrometer, Distributed Tracing, and Structured Logging.
- [**Scheduling**](spring-boot/spring-boot-scheduling/SKILL.md) (P0) - Standards for scheduled tasks and distributed locking with ShedLock.
- [**Security**](spring-boot/spring-boot-security/SKILL.md) (P0) - Spring Security 6+ standards, Lambda DSL, and Hardening.
- [**Testing**](spring-boot/spring-boot-testing/SKILL.md) (P0) - Standards for unit, integration, and slice testing in Spring Boot 3.

### 🦅 Swift (Language)

Modern Swift language standards (5.9+).

- [**Best Practices**](swift/swift-best-practices/SKILL.md) (P0) - Standards for Guard, Value Types, Immutability, and Naming.
- [**Concurrency**](swift/swift-concurrency/SKILL.md) (P0) - Standards for async/await, Actors, Task Groups, and MainActor.
- [**Error Handling**](swift/swift-error-handling/SKILL.md) (P0) - Standards for Throwing Functions, Result Type, and Never.
- [**Language**](swift/swift-language/SKILL.md) (P0) - Standards for Optionals, Protocols, Extensions, and Type Safety.
- [**Memory Management**](swift/swift-memory-management/SKILL.md) (P0) - Standards for ARC, Weak/Unowned References, and Capture Lists.
- [**Swiftui**](swift/swift-swiftui/SKILL.md) (P0) - Standards for State Management, View Lifecycle, and Property Wrappers.
- [**Testing**](swift/swift-testing/SKILL.md) (P0) - Standards for XCTest, Async Tests, and Test Organization.
- [**Tooling**](swift/swift-tooling/SKILL.md) (P0) - Standards for SPM, Build Configs, and Code Quality.

### 🗄️ Database (Infra)

Expert data access and optimization patterns.

- [**Mongodb**](database/database-mongodb/SKILL.md) (P0) - Expert rules for schema design, indexing, and performance in MongoDB.
- [**Postgresql**](database/database-postgresql/SKILL.md) (P0) - Data access patterns, scaling, migrations, and ORM selection for PostgreSQL.
- [**Redis**](database/database-redis/SKILL.md) (P0) - Expert rules for caching, key management, and performance in Redis.
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
