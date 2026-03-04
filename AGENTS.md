# Project Context for AI Agents

> [!IMPORTANT]
> **To all AI Agents working ON this repository:**
> This repository is the source code for `agent-skills-standard`.
>
> 1. **Architecture**: Understanding the Registry -> CLI -> Project flow is critical. See `ARCHITECTURE.md`.
> 2. **Internal Tools**: Use `scripts/` (like `scan-docs.ts`) to maintain the project.
> 3. **Token Economy**: All changes to `skills/` must be optimized for token usage.
> 4. **Documentation**: Keep `ARCHITECTURE.md` and `CONTRIBUTING.md` up to date.
>
> ---

<!-- SKILLS_INDEX_START -->
# Agent Skills Index

> [!IMPORTANT]
> **Prefer retrieval-led reasoning over pre-training-led reasoning.**
> Before writing any code, you MUST CHECK if a relevant skill exists in the index below.
> If a skill matches your task, READ the file using `view_file`.

## **Rule Zero: Zero-Trust Engineering**

- **Skill Authority:** Loaded skills always override existing code patterns.
- **Audit Before Write:** Audit every file write against the `common/feedback-reporter` skill.

## **Reading This Index**

Each entry lists `(triggers: ...)` conditions. Three trigger types:
- **File globs** (`**/*.ts`) — activate when working with matching files.
- **Keywords** (`auth`, `refactor`) — activate when these appear in the task.
- **Composite** (`+other/skill`) — activate THIS skill whenever `other/skill` is also active. Used by foundational skills to co-load with their framework peers automatically.

- **[common/accessibility]**: WCAG 2.2, ARIA, semantic HTML, keyboard navigation, and color contrast standards for web UIs. Legal compliance baseline. (triggers: **/*.tsx, **/*.jsx, **/*.html, **/*.vue, **/*.component.html, accessibility, a11y, wcag, aria, screen reader, focus, alt text)
- **[common/api-design]**: REST API conventions — HTTP semantics, status codes, versioning, pagination, and OpenAPI standards applicable to any framework. (triggers: **/*.controller.ts, **/*.router.ts, **/*.routes.ts, **/routes/**, **/controllers/**, **/handlers/**, rest api, endpoint, http method, status code, versioning, pagination, openapi, api design, api contract)
- **[common/architecture-audit]**: Protocol for auditing structural debt, logic leakage, and fragmentation across Web, Mobile, and Backend. (triggers: package.json, pubspec.yaml, go.mod, pom.xml, nest-cli.json, architecture audit, code review, tech debt, logic leakage, refactor)
- **[common/architecture-diagramming]**: Standards for creating clear, effective, and formalized software architecture diagrams (C4, UML). (triggers: ARCHITECTURE.md, **/*.mermaid, **/*.drawio, diagram, architecture, c4, system design, mermaid)
- **[common/best-practices]**: 🚨 Universal clean-code principles for any environment. Use when writing functions, designing classes, or applying SOLID/DRY/KISS patterns to any codebase. (triggers: **/*.ts, **/*.tsx, **/*.go, **/*.dart, **/*.java, **/*.kt, **/*.swift, **/*.py, solid, kiss, dry, yagni, naming, conventions, refactor, clean code)
- **[common/code-review]**: Standards for high-quality, persona-driven code reviews. Use when reviewing PRs, critiquing code quality, or analyzing changes for team feedback. (triggers: review, pr, critique, analyze code)
- **[common/context-optimization]**: Techniques to maximize context window efficiency, reduce latency, and prevent 'lost in middle' issues through strategic masking and compaction. (triggers: *.log, chat-history.json, reduce tokens, optimize context, summarize history, clear output)
- **[common/debugging]**: Systematic troubleshooting using the Scientific Method. Use when debugging crashes, tracing errors, diagnosing unexpected behavior, or investigating exceptions. (triggers: debug, fix bug, crash, error, exception, troubleshooting)
- **[common/documentation]**: Essential rules for code comments, READMEs, and technical docs. Use when adding comments, writing docstrings, creating READMEs, or updating any documentation. (triggers: comment, docstring, readme, documentation)
- **[common/error-handling]**: Cross-cutting standards for error design, response shapes, error codes, and boundary placement. Use when handling errors, designing exception flows, or standardizing error responses. (triggers: **/*.service.ts, **/*.handler.ts, **/*.controller.ts, **/*.go, **/*.java, **/*.kt, **/*.py, error handling, exception, try catch, error boundary, error response, error code, throw, Result)
- **[common/feedback-reporter]**: 🚨 CRITICAL - Before ANY file write, audit loaded skills for violations. Auto-report via feedback command. (triggers: **/*, write, edit, create, generate, skill, violation)
- **[common/git-collaboration]**: 🚨 Universal standards for version control, branching, and team collaboration. Use when writing commits, creating branches, merging, or opening pull requests. (triggers: commit, branch, merge, pull-request, git)
- **[common/mobile-animation]**: Motion design principles for mobile apps. Covers timing curves, transitions, gestures, and performance-conscious animations. (triggers: **/*_page.dart, **/*_screen.dart, **/*.swift, **/*Activity.kt, **/*Screen.tsx, Animation, AnimationController, Animated, MotionLayout, transition, gesture)
- **[common/mobile-ux-core]**: 🚨 Universal mobile UX principles for touch-first interfaces. Enforces touch targets, safe areas, and mobile-specific interaction patterns. (triggers: **/*_page.dart, **/*_screen.dart, **/*_view.dart, **/*.swift, **/*Activity.kt, **/*Screen.tsx, mobile, responsive, SafeArea, touch, gesture, viewport)
- **[common/observability]**: Standards for structured logging, distributed tracing, and metrics across all backend services. Use when adding logs, setting up tracing, or implementing service observability. (triggers: **/*.service.ts, **/*.handler.ts, **/*.middleware.ts, **/*.interceptor.ts, **/*.go, **/*.java, **/*.kt, **/*.py, logging, tracing, metrics, opentelemetry, observability, correlation, structured log, slo)
- **[common/performance-engineering]**: 🚨 Universal standards for high-performance development. Use when optimizing, reducing latency, fixing memory leaks, profiling, or improving throughput. (triggers: **/*.ts, **/*.tsx, **/*.go, **/*.dart, **/*.java, **/*.kt, **/*.swift, **/*.py, performance, optimize, profile, scalability, latency, throughput, memory leak, bottleneck)
- **[common/product-requirements]**: 🚨 Expert process for gathering requirements and drafting PRDs (Iterative Discovery). Use when creating a PRD, speccing a new feature, or clarifying requirements. (triggers: PRD.md, specs/*.md, create prd, draft requirements, new feature spec)
- **[common/security-audit]**: 🚨 Adversarial security probing and vulnerability assessments across Node, Go, Dart, Java, Python, and Rust. (triggers: package.json, go.mod, pubspec.yaml, pom.xml, Dockerfile, security audit, vulnerability scan, secrets detection, injection probe, pentest)
- **[common/security-standards]**: 🚨 Universal security protocols for safe, resilient software. Use when implementing authentication, encryption, authorization, or any security-sensitive feature. (triggers: **/*.ts, **/*.tsx, **/*.go, **/*.dart, **/*.java, **/*.kt, **/*.swift, **/*.py, security, encrypt, authenticate, authorize)
- **[common/session-retrospective]**: Analyze conversation corrections to detect skill gaps and auto-improve the skills library. Use after any session with user corrections, rework, or retrospective requests. (triggers: **/*.spec.ts, **/*.test.ts, SKILL.md, AGENTS.md, retrospective, self-learning, improve skills, session review, correction, rework)
- **[common/skill-creator]**: 🚨 Standards for creating, testing, and optimizing Agent Skills. Use when creating, improving, catching regressions, measuring trigger rates, or writing eval cases for any skill. (triggers: SKILL.md, metadata.json, evals/evals.json, create skill, new standard, writing rules, high density, test skill, eval skill, trigger rate, optimize, description, skill regression, improve skill)
- **[common/system-design]**: 🚨 Universal architectural standards for robust, scalable systems. Use when designing new features, evaluating architecture, or resolving scalability concerns. (triggers: architecture, design, system, scalability)
- **[common/tdd]**: Enforces Test-Driven Development (Red-Green-Refactor). Use when writing unit tests, implementing TDD, or improving test coverage for any feature. (triggers: **/*.test.ts, **/*.spec.ts, **/*_test.go, **/*Test.java, **/*_test.dart, **/*_spec.rb, tdd, unit test, write test, red green refactor, failing test, test coverage)
- **[common/workflow-writing]**: 🚨 Rules for writing concise, token-efficient workflow and skill files. Prevents over-building that requires costly optimization passes. (triggers: .agent/workflows/*.md, SKILL.md, create workflow, write workflow, new skill, new workflow)
- **[typescript/best-practices]**: Idiomatic TypeScript patterns for clean, maintainable code. Use when writing or refactoring TypeScript classes, functions, modules, or async logic. (triggers: **/*.ts, **/*.tsx, class, function, module, import, export, async, promise)
- **[typescript/language]**: 🚨 Modern TypeScript standards for type safety and maintainability. Use when working with types, interfaces, generics, enums, unions, or tsconfig settings. (triggers: **/*.ts, **/*.tsx, tsconfig.json, type, interface, generic, enum, union, intersection, readonly, const, namespace)
- **[typescript/security]**: 🚨 Secure coding practices for TypeScript. Use when validating input, handling auth tokens, sanitizing data, or managing secrets and sensitive configuration. (triggers: **/*.ts, **/*.tsx, validate, sanitize, xss, injection, auth, password, secret, token)
- **[typescript/tooling]**: Development tools, linting, and build config for TypeScript. Use when configuring ESLint, Prettier, Jest, Vitest, tsconfig, or any TS build tooling. (triggers: tsconfig.json, .eslintrc.*, jest.config.*, package.json, eslint, prettier, jest, vitest, build, compile, lint)

<!-- SKILLS_INDEX_END -->
