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
- [**Configuration**](nestjs/configuration/SKILL.md) (P1) - Environment management.
- [**Error Handling**](nestjs/error-handling/SKILL.md) (P1) - Global filters.
- [**Performance**](nestjs/performance/SKILL.md) (P1) - Fastify, Caching.
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

### 💎 Ruby (Language)

Core Ruby standards.

- [**Language**](ruby/language/SKILL.md) (P0) - Idioms and fundamentals.
- [**Best Practices**](ruby/best-practices/SKILL.md) (P1) - Maintainability and boundaries.
- [**Tooling**](ruby/tooling/SKILL.md) (P1) - Bundler, RuboCop, CI checks.

### 🛤 Ruby on Rails (Framework)

Rails standards for web applications and APIs.

- [**Best Practices**](rails/best-practices/SKILL.md) (P0) - Transactions, locking, correctness.
- [**Architecture**](rails/architecture/SKILL.md) (P0) - Boundaries and conventions.
- [**Security**](rails/security/SKILL.md) (P0) - Params, secrets, OWASP.
- [**Testing**](rails/testing/SKILL.md) (P1) - RSpec/Minitest guidance.
- [**RSpec**](rails/rspec/SKILL.md) (P1) - RSpec conventions for Rails.
- [**RuboCop**](rails/rubocop/SKILL.md) (P1) - Linting rules for Rails codebases.

### 🚀 Coming Soon

- **Go** (Language)
- **Angular** (Framework)
- **Java** (Language)
- **Kotlin** (Language)

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
