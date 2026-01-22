# Agent Skills Registry

This directory contains the source of truth for all AI agent skills. Skills are organized by **Category** (Language or Framework) and then by **Domain**.

## 📂 Structure

Each skill must follow the standard directory structure:
`skills/{category}/{skill-name}/SKILL.md`

## 🛠 Active Categories

### � Common (Universal)

Cross-framework standards and best practices applicable to all development.

- [**Best Practices**](common/best-practices/SKILL.md) (P0) - SOLID, Clean Code, KISS/DRY/YAGNI.
- [**Code Review**](common/code-review/SKILL.md) (P1) - Principal Engineer review standards.
- [**Security Standards**](common/security-standards/SKILL.md) (P0) - Universal security protocols.
- [**System Design**](common/system-design/SKILL.md) (P0) - Architecture & scalability patterns.
- [**Git Collaboration**](common/git-collaboration/SKILL.md) (P1) - Version control & team workflows.
- [**Performance Engineering**](common/performance-engineering/SKILL.md) (P1) - Optimization & monitoring.
- [**Quality Assurance**](common/quality-assurance/SKILL.md) (P1) - Code hygiene & testing standards.
- [**Documentation**](common/documentation/SKILL.md) (P1) - Code comments & technical docs.

### �🎯 Flutter (Framework)

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
- [**CI/CD**](flutter/cicd/SKILL.md) (P1) - GitHub Actions, Fastlane, Automation.
- [**Testing**](flutter/testing/SKILL.md) (P1) - Unit, Widget & Integration Strategies.
- [**AutoRoute Navigation**](flutter/auto-route-navigation/SKILL.md) (P2) - Type-safe routing.
- [**GoRouter Navigation**](flutter/go-router-navigation/SKILL.md) (P2) - URI-based routing.

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

### 🦁 NestJS (Framework)

Enterprise-grade Node.js backend development.

- [**Architecture**](nestjs/architecture/SKILL.md) (P0) - Modules, DI, Scalability.
- [**Controllers & Services**](nestjs/controllers-services/SKILL.md) (P0) - Layer separation standards.
- [**Database**](nestjs/database/SKILL.md) (P0) - TypeORM, Prisma, Mongoose patterns.
- [**Security**](nestjs/security/SKILL.md) (P0) - Auth, Guards, Headers.
- [**File Uploads**](nestjs/file-uploads/SKILL.md) (P0) - Secure file handling patterns.
- [**Transport**](nestjs/transport/SKILL.md) (P0) - Microservices communication.
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
- [**Internationalization**](nextjs/internationalization/SKILL.md) (P2) - i18n routing.
- [**Architecture**](nextjs/architecture/SKILL.md) (P2) - Feature-Sliced Design (FSD).
- [**State Management**](nextjs/state-management/SKILL.md) (P2) - URL-state, avoiding global stores.

### 🚀 Coming Soon

- **Go** (Language)
- **Angular** (Framework)
- **Java** (Language)
- **Kotlin** (Language)

---

## ✍️ Contribution Guide

To add or update a skill:

1. **Token Efficiency**: `SKILL.md` must be **≤ 70 lines**. This is a strict limit to maximize agent context.
2. **Progressive Disclosure**: Move all code samples > 10 lines to `references/REFERENCE.md` or specialized reference files.
3. **Imperative Standards**: Use "Compressed Syntax" (starting with verbs, minimal articles) for 40% higher density.
4. **Format Verification**: Ensure YAML frontmatter triggers are precise and categories are lowercase kebab-case.
5. **Validation Checklist**:
   - [ ] SKILL.md ≤ 70 lines (Ideal: 40-60)
   - [ ] No inline code blocks > 10 lines
   - [ ] No redundant frontmatter context in body
   - [ ] Triggers verified for all supported agents
6. **Priority Matrix**:
   - **P0**: Foundational (Architecture, Types, Security).
   - **P1**: Operational (Performance, Idioms, UI).
   - **P2**: Maintenance (Testing, Tooling, Docs).
