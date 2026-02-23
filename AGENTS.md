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

- **[common/architecture-diagramming]**: Standards for creating clear, effective, and formalized software architecture diagrams (C4, UML). (triggers: ARCHITECTURE.md, **/*.mermaid, **/*.drawio, diagram, architecture, c4, system design, mermaid)
- **[common/best-practices]**: 🚨 Universal principles for clean, maintainable, and robust code across all environments. (triggers: solid, kiss, dry, yagni, naming, conventions)
- **[common/code-review]**: Standards for high-quality, persona-driven code reviews. (triggers: review, pr, critique, analyze code)
- **[common/context-optimization]**: Techniques to maximize context window efficiency, reduce latency, and prevent 'lost in middle' issues through strategic masking and compaction. (triggers: *.log, chat-history.json, reduce tokens, optimize context, summarize history, clear output)
- **[common/debugging]**: Systematic troubleshooting using the Scientific Method (Observe, Hypothesize, Experiment, Fix). (triggers: debug, fix bug, crash, error, exception, troubleshooting)
- **[common/documentation]**: Essential rules for code comments, READMEs, and technical documentation. (triggers: comment, docstring, readme, documentation)
- **[common/feedback-reporter]**: 🚨 CRITICAL - Before ANY file write, audit loaded skills for violations. Auto-report via feedback command. (triggers: **/*, write, edit, create, generate, skill, violation)
- **[common/git-collaboration]**: 🚨 Universal standards for version control, branching, and team collaboration. (triggers: commit, branch, merge, pull-request, git)
- **[common/mobile-animation]**: Motion design principles for mobile apps. Covers timing curves, transitions, gestures, and performance-conscious animations. (triggers: **/*_page.dart, **/*_screen.dart, **/*.swift, **/*Activity.kt, **/*Screen.tsx, Animation, AnimationController, Animated, MotionLayout, transition, gesture)
- **[common/mobile-ux-core]**: 🚨 Universal mobile UX principles for touch-first interfaces. Enforces touch targets, safe areas, and mobile-specific interaction patterns. (triggers: **/*_page.dart, **/*_screen.dart, **/*_view.dart, **/*.swift, **/*Activity.kt, **/*Screen.tsx, mobile, responsive, SafeArea, touch, gesture, viewport)
- **[common/performance-engineering]**: Universal standards for high-performance software development across all frameworks. (triggers: performance, optimize, profile, scalability)
- **[common/product-requirements]**: 🚨 Expert process for gathering requirements and drafting PRDs (Iterative Discovery). (triggers: PRD.md, specs/*.md, create prd, draft requirements, new feature spec)
- **[common/security-standards]**: 🚨 Universal security protocols for building safe and resilient software. (triggers: security, encrypt, authenticate, authorize)
- **[common/system-design]**: 🚨 Universal architectural standards for building robust, scalable, and maintainable systems. (triggers: architecture, design, system, scalability)
- **[common/tdd]**: Enforces Test-Driven Development (Red-Green-Refactor) for rigorous code quality.
- **[typescript/best-practices]**: Idiomatic TypeScript patterns for clean, maintainable code. (triggers: **/*.ts, **/*.tsx, class, function, module, import, export, async, promise)
- **[typescript/language]**: 🚨 Modern TypeScript standards for type safety, performance, and maintainability. (triggers: **/*.ts, **/*.tsx, tsconfig.json, type, interface, generic, enum, union, intersection, readonly, const, namespace)
- **[typescript/security]**: 🚨 Secure coding practices for building safe TypeScript applications. (triggers: **/*.ts, **/*.tsx, validate, sanitize, xss, injection, auth, password, secret, token)
- **[typescript/tooling]**: Development tools, linting, and build configuration for TypeScript projects. (triggers: tsconfig.json, .eslintrc.*, jest.config.*, package.json, eslint, prettier, jest, vitest, build, compile, lint)

<!-- SKILLS_INDEX_END -->
