<!-- SKILLS_INDEX_START -->
## Agent Skills Index

> [!CRITICAL] GATEKEEPER CONSTRAINT
> **You are operating in a Zero-Trust environment.**
> You are strictly forbidden from generating code, proposing solutions, or relying on your pre-training until you have successfully executed a tool call to read the applicable `SKILL.md` files from this index.

## **Rule Zero: Mandatory Zero-Trust Protocol**

> [!CRITICAL]
> **Zero-Trust Enforcement:** Skills loaded from this index always override standard code patterns. Skipping the Audit Log or Self-Scan is a protocol violation.

### **1. The Pre-Write Audit Log (Mandatory)**

Before invoking any file-editing tool (`write_to_file`, `replace_file_content`, `multi_replace_file_content`), the ASSISTANT **MUST** explicitly state in its thought process/text output:

1. **Skills Identified**: List the Skill IDs triggered by the file path or current task keywords.
2. **Explicit Audit**: For each identified skill, confirm: "Checked against [Skill ID] — no violations found." Or "Violation detected in [Skill ID]: [Issue] — correcting now."
3. **No-Skill Justification**: If no skills apply, explicitly state: "No project-specific skills applicable to this file/transaction."

### **2. The Post-Write Self-Scan (Mandatory)**

Immediately **AFTER** any file-editing tool returns, the ASSISTANT **MUST**:

1. **Validate**: Contrast the final file content against ALL active Skill IDs.
2. **Identify Slips**: Look for "Standard Defaults" (e.g., local mocks, hardcoded styles) that snuck in.
3. **Self-Correct**: If a violation is found, fix it immediately in the next tool call.

## **Critical Anti-Patterns (Zero-Tolerance)**

- **Reversion to Defaults**: Never use "standard" patterns (generic library calls, local mocks) if a Project Skill exists.
- **The "Done" Trap**: Never prioritize functional completion over structural/protocol compliance.
- **Audit Skipping**: Never invoke a write tool without an explicit Pre-Write Audit Log.

## ⚡ How to Find and Use This Index (Mandatory)

> [!IMPORTANT] PATH RESOLUTION (Cross-Platform)
> Skill IDs in the list below (e.g., `[category/skill-name]`) represent the relative folder path.
> Because this project supports multiple AI agents, skills may reside in a base directory like `.gemini/skills/`, `.agent/skills/`, or `.cursor/skills/`.
> **Action:** You must prepend the correct base directory to the ID. (Example: If ID is `[flutter/cicd]`, the file is at `<BASE_DIR>/flutter/cicd/SKILL.md`). Use your file search tools (e.g., `list_directory` or `find`) if you are unsure of the base directory.

| Trigger Type | What to match | Required Action |
| --- | --- | --- |
| **File glob** (e.g. `**/*.ts`) | Files you are currently editing match the pattern | Call `view_file` on `<BASE_DIR>/[Skill ID]/SKILL.md` |
| **Keyword** (e.g. `auth`, `refactor`) | These words appear in the user\'s request | Call `view_file` on `<BASE_DIR>/[Skill ID]/SKILL.md` |
| **Composite** (e.g. `+other/skill`) | Another listed skill is already active | Also load this skill via `view_file` |

> [!TIP]
> **Indirect phrasing still counts.** Match keywords by intent, not just exact words.
> Examples: "make it faster" → `performance`, "broken query" → `database`, "login flow" → `auth`, "clean up this file" → `refactor`.

- **[common/common-accessibility]**: WCAG 2.2, ARIA, semantic HTML, keyboard navigation, and color contrast standards for web UIs. Legal compliance baseline. (triggers: `**/*.tsx, **/*.jsx, **/*.html, **/*.vue, **/*.component.html, accessibility, a11y, wcag, aria, screen reader, focus, alt text`)
- **[common/common-api-design]**: REST API conventions — HTTP semantics, status codes, versioning, pagination, and OpenAPI standards applicable to any framework. (triggers: `**/*.controller.ts, **/*.router.ts, **/*.routes.ts, **/routes/**, **/controllers/**, **/handlers/**, rest api, endpoint, http method, status code, versioning, pagination, openapi, api design, api contract`)
- **[common/common-architecture-audit]**: Protocol for auditing structural debt, logic leakage, and fragmentation across Web, Mobile, and Backend. (triggers: `package.json, pubspec.yaml, go.mod, pom.xml, nest-cli.json, architecture audit, code review, tech debt, logic leakage, refactor`)
- **[common/common-architecture-diagramming]**: Standards for creating clear, effective, and formalized software architecture diagrams (C4, UML). (triggers: `ARCHITECTURE.md, **/*.mermaid, **/*.drawio, diagram, architecture, c4, system design, mermaid`)
- **[common/common-best-practices]**: 🚨 Universal clean-code principles for any environment. (triggers: `**/*.ts, **/*.tsx, **/*.go, **/*.dart, **/*.java, **/*.kt, **/*.swift, **/*.py, solid, kiss, dry, yagni, naming, conventions, refactor, clean code`)
- **[common/common-code-review]**: Standards for high-quality, persona-driven code reviews. Use when reviewing PRs, critiquing code quality, or analyzing changes for team feedback. (triggers: `review, pr, critique, analyze code`)
- **[common/common-context-optimization]**: Techniques to maximize context window efficiency, reduce latency, and prevent 'lost in middle' issues through strategic masking and compaction. (triggers: `*.log, chat-history.json, reduce tokens, optimize context, summarize history, clear output`)
- **[common/common-debugging]**: Systematic troubleshooting using the Scientific Method. Use when debugging crashes, tracing errors, diagnosing unexpected behavior, or investigating exceptions. (triggers: `debug, fix bug, crash, error, exception, troubleshooting`)
- **[common/common-documentation]**: Essential rules for code comments, READMEs, and technical docs. Use when adding comments, writing docstrings, creating READMEs, or updating any documentation. (triggers: `comment, docstring, readme, documentation`)
- **[common/common-error-handling]**: Cross-cutting standards for error design, response shapes, error codes, and boundary placement. (triggers: `**/*.service.ts, **/*.handler.ts, **/*.controller.ts, **/*.go, **/*.java, **/*.kt, **/*.py, error handling, exception, try catch, error boundary, error response, error code, throw`)
- **[common/common-feedback-reporter]**: 🚨 Pre-write skill violation audit. Checks planned code against loaded skill anti-patterns before any file write. Use when writing Flutter/Dart code, editing SKILL.md files, or generating any code where project skills are active. Load as composite alongside other skills. (triggers: `skill violation, pre-write audit, audit violations, SKILL.md, **/*.dart, **/*.ts, **/*.tsx`)
- **[common/common-git-collaboration]**: 🚨 Universal standards for version control, branching, and team collaboration. Use when writing commits, creating branches, merging, or opening pull requests. (triggers: `commit, branch, merge, pull-request, git`)
- **[common/common-llm-security]**: 🚨 OWASP LLM Top 10 (2025) audit checklist for AI applications, agent tools, RAG pipelines, and prompt construction. Load during any security review touching LLM client code, prompt templates, agent tools, or vector stores. (triggers: `LLM security, prompt injection, agent security, RAG security, AI security, openai, anthropic, langchain, LLM review`)
- **[common/common-mobile-animation]**: Motion design principles for mobile apps. Covers timing curves, transitions, gestures, and performance-conscious animations. (triggers: `**/*_page.dart, **/*_screen.dart, **/*.swift, **/*Activity.kt, **/*Screen.tsx, Animation, AnimationController, Animated, MotionLayout, transition, gesture`)
- **[common/common-mobile-ux-core]**: 🚨 Universal mobile UX principles for touch-first interfaces. Enforces touch targets, safe areas, and mobile-specific interaction patterns. (triggers: `**/*_page.dart, **/*_screen.dart, **/*_view.dart, **/*.swift, **/*Activity.kt, **/*Screen.tsx, mobile, responsive, SafeArea, touch, gesture, viewport`)
- **[common/common-observability]**: Standards for structured logging, distributed tracing, and metrics. (triggers: `**/*.service.ts, **/*.handler.ts, **/*.middleware.ts, **/*.interceptor.ts, **/*.go, **/*.java, **/*.kt, **/*.py, logging, tracing, metrics, opentelemetry, observability, slo`)
- **[common/common-owasp]**: 🚨 OWASP Top 10 audit checklist for Web Applications (2021) and APIs (2023). Load during any security review, PR review, or codebase audit touching web, mobile backend, or API code. (triggers: `security review, OWASP, broken access control, IDOR, BOLA, injection, broken auth, API review, authorization, access control`)
- **[common/common-performance-engineering]**: 🚨 Universal standards for high-performance development. Use when optimizing, reducing latency, fixing memory leaks, profiling, or improving throughput. (triggers: `**/*.ts, **/*.tsx, **/*.go, **/*.dart, **/*.java, **/*.kt, **/*.swift, **/*.py, performance, optimize, profile, scalability, latency, throughput, memory leak, bottleneck`)
- **[common/common-product-requirements]**: 🚨 Expert process for gathering requirements and drafting PRDs (Iterative Discovery). Use when creating a PRD, speccing a new feature, or clarifying requirements. (triggers: `PRD.md, specs/*.md, create prd, draft requirements, new feature spec`)
- **[common/common-protocol-enforcement]**: 🚨 Standards for Red-Team verification and adversarial protocol audit. Use when verifying tasks, performing self-scans, or checking for protocol violations. Load as composite for all sessions. (triggers: `verify done, protocol check, self-scan, pre-write audit, task complete, audit violations, retrospective, scan, red-team`)
- **[common/common-security-audit]**: 🚨 Adversarial security probing and vulnerability assessments across Node, Go, Dart, Java, Python, and Rust. (triggers: `package.json, go.mod, pubspec.yaml, pom.xml, Dockerfile, security audit, vulnerability scan, secrets detection, injection probe, pentest`)
- **[common/common-security-standards]**: 🚨 Universal security protocols for safe, resilient software. Use when implementing authentication, encryption, authorization, or any security-sensitive feature. (triggers: `**/*.ts, **/*.tsx, **/*.go, **/*.dart, **/*.java, **/*.kt, **/*.swift, **/*.py, security, encrypt, authenticate, authorize`)
- **[common/common-session-retrospective]**: Analyze conversation corrections to detect skill gaps and auto-improve the skills library. Use after any session with user corrections, rework, or retrospective requests. (triggers: `**/*.spec.ts, **/*.test.ts, SKILL.md, AGENTS.md, retrospective, self-learning, improve skills, session review, correction, rework`)
- **[common/common-skill-creator]**: 🚨 Standards for creating, testing, and optimizing Agent Skills for any AI Agent (Claude, Cursor, Windsurf, Copilot). Use when: writing SKILL.md, auditing a skill, improving trigger accuracy, checking size limits, structuring references/, writing anti-patterns, starting a new skill from scratch, or reviewing skill quality.
- **[common/common-system-design]**: 🚨 Universal architectural standards for robust, scalable systems. Use when designing new features, evaluating architecture, or resolving scalability concerns. (triggers: `architecture, design, system, scalability`)
- **[common/common-tdd]**: Enforces Test-Driven Development (Red-Green-Refactor). Use when writing unit tests, implementing TDD, or improving test coverage for any feature. (triggers: `**/*.test.ts, **/*.spec.ts, **/*_test.go, **/*Test.java, **/*_test.dart, **/*_spec.rb, tdd, unit test, write test, red green refactor, failing test, test coverage`)
- **[common/common-ui-design]**: 🚨 Create distinctive, production-grade frontend UI with bold aesthetic choices. Use when building web components, pages, interfaces, dashboards, or applications in any framework (React, Next.js, Angular, Vue, HTML/CSS). Triggers: 'build a page', 'create a component', 'design a dashboard', 'landing page', 'UI for', 'build a layout', 'make it look good', 'improve the design', build UI, create interface, design screen
- **[common/common-workflow-writing]**: 🚨 Rules for writing concise, token-efficient workflow and skill files. Prevents over-building that requires costly optimization passes. (triggers: `.agent/workflows/*.md, SKILL.md, create workflow, write workflow, new skill, new workflow`)
- **[typescript/typescript-best-practices]**: Idiomatic TypeScript patterns for clean, maintainable code. Use when writing or refactoring TypeScript classes, functions, modules, or async logic. (triggers: `**/*.ts, **/*.tsx, class, function, module, import, export, async, promise`)
- **[typescript/typescript-language]**: 🚨 Modern TypeScript standards for type safety and maintainability. Use when working with types, interfaces, generics, enums, unions, or tsconfig settings. (triggers: `**/*.ts, **/*.tsx, tsconfig.json, type, interface, generic, enum, union, intersection, readonly, const, namespace`)
- **[typescript/typescript-security]**: 🚨 Secure coding practices for TypeScript. Use when validating input, handling auth tokens, sanitizing data, or managing secrets and sensitive configuration. (triggers: `**/*.ts, **/*.tsx, validate, sanitize, xss, injection, auth, password, secret, token`)
- **[typescript/typescript-tooling]**: Development tools, linting, and build config for TypeScript. Use when configuring ESLint, Prettier, Jest, Vitest, tsconfig, or any TS build tooling. (triggers: `tsconfig.json, .eslintrc.*, jest.config.*, package.json, eslint, prettier, jest, vitest, build, compile, lint`)

<!-- SKILLS_INDEX_END -->
