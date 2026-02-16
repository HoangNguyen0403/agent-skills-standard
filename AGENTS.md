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

## **Rule Zero: Zero-Trust Engineering**

🚨 **IMPORTANT:** Never assume existing code follows the standard. Existing files may contain legacy technical debt or non-compliant patterns (e.g., hardcoded colors).

- **Skill Authority:** Loaded skills always override existing code patterns.
- **Retrieval-First:** Before writing a single line of code, identify and read relevant skill files listed below.
- **Audit Before Write:** Audit every file write against the `common/feedback-reporter` skill.

IMPORTANT: Prefer retrieval-led reasoning. Consult skill files before acting.

| Skill ID | Triggers | Description |
| :--- | :--- | :--- |
| common/best-practices | `solid,kiss,dry,yagni,naming,conventions` | 🚨 Universal principles for clean, maintainable, and robust code across all environments. |
| common/code-review | `review,pr,critique,analyze code` | Standards for high-quality, persona-driven code reviews. |
| common/context-optimization | `*.log,chat-history.json,reduce tokens,optimize context,summarize history,clear output` | Techniques to maximize context window efficiency, reduce latency, and prevent 'lost in middle' issues through strategic masking and compaction. |
| common/debugging | `debug,fix bug,crash,error,exception,troubleshooting` | Systematic troubleshooting using the Scientific Method (Observe, Hypothesize, Experiment, Fix). |
| common/documentation | `comment,docstring,readme,documentation` | Essential rules for code comments, READMEs, and technical documentation. |
| common/feedback-reporter | `**/*,write,edit,create,generate,skill,violation` | 🚨 CRITICAL - Before ANY file write, audit loaded skills for violations. Auto-report via feedback command. |
| common/git-collaboration | `commit,branch,merge,pull-request,git` | 🚨 Universal standards for version control, branching, and team collaboration. |
| common/mobile-animation | `**/*_page.dart,**/*_screen.dart,**/*.swift,**/*Activity.kt,**/*Screen.tsx,Animation,AnimationController,Animated,MotionLayout,transition,gesture` | Motion design principles for mobile apps. Covers timing curves, transitions, gestures, and performance-conscious animations. |
| common/mobile-ux-core | `**/*_page.dart,**/*_screen.dart,**/*_view.dart,**/*.swift,**/*Activity.kt,**/*Screen.tsx,mobile,responsive,SafeArea,touch,gesture,viewport` | 🚨 Universal mobile UX principles for touch-first interfaces. Enforces touch targets, safe areas, and mobile-specific interaction patterns. |
| common/performance-engineering | `performance,optimize,profile,scalability` | Universal standards for high-performance software development across all frameworks. |
| common/product-requirements | `PRD.md,specs/*.md,create prd,draft requirements,new feature spec` | 🚨 Expert process for gathering requirements and drafting PRDs (Iterative Discovery). |
| common/security-standards | `security,encrypt,authenticate,authorize` | 🚨 Universal security protocols for building safe and resilient software. |
| common/system-design | `architecture,design,system,scalability` | 🚨 Universal architectural standards for building robust, scalable, and maintainable systems. |
| common/tdd | `` | Enforces Test-Driven Development (Red-Green-Refactor) for rigorous code quality. |
| typescript/best-practices | `**/*.ts,**/*.tsx,class,function,module,import,export,async,promise` | Idiomatic TypeScript patterns for clean, maintainable code. |
| typescript/language | `**/*.ts,**/*.tsx,tsconfig.json,type,interface,generic,enum,union,intersection,readonly,const,namespace` | 🚨 Modern TypeScript standards for type safety, performance, and maintainability. |
| typescript/security | `**/*.ts,**/*.tsx,validate,sanitize,xss,injection,auth,password,secret,token` | 🚨 Secure coding practices for building safe TypeScript applications. |
| typescript/tooling | `tsconfig.json,.eslintrc.*,jest.config.*,package.json,eslint,prettier,jest,vitest,build,compile,lint` | Development tools, linting, and build configuration for TypeScript projects. |

<!-- SKILLS_INDEX_END -->
