# Project Context for AI Agents

> [!IMPORTANT]
> **To all AI Agents working ON this repository:**
> This repository is the source code for `agent-skills-standard`.
>
> 1.**Architecture**: Understanding the Registry -> CLI -> Project flow is critical. See `ARCHITECTURE.md`. 2.**Internal Tools**: Use `scripts/` (like `scan-docs.ts`) to maintain the project. 3.**Token Economy**: All changes to `skills/` must be optimized for token usage. 4.**Documentation**: Keep `ARCHITECTURE.md` and `CONTRIBUTING.md` up to date.
>
> ---

<!-- SKILLS_INDEX_START -->
## Agent Skills Index

> [!CRITICAL] Zero-Trust: Read the matching `SKILL.md` BEFORE writing any code.
> Skills from this index override pre-training patterns. If no skill matches, state: "No project-specific skills applicable."

## Skill Resolution Protocol

Each `_INDEX.md` has two sections — follow both:

1. **Match file type** → find the category index in the router table below.
2. **Read the `_INDEX.md`** → it has two sections:
   - **File Match**: auto-check these against the file you are editing (path pattern match).
   - **Keyword Match**: only check if the user's request mentions these concepts.
3. **Load ALL matched `SKILL.md`** → read every matched skill before writing code. The tier model keeps matches focused.

> `<SKILLS>` = your agent's skill directory (e.g., `.claude/skills/`, `.cursor/skills/`, `.gemini/skills/`).

| File type | Read category index |
| --------- | ------------------- |
| `*.go`, `*_test.go` | `<SKILLS>/golang/_INDEX.md` |
| `*.ts` | `<SKILLS>/angular/_INDEX.md`, `<SKILLS>/nestjs/_INDEX.md`, `<SKILLS>/nextjs/_INDEX.md`, `<SKILLS>/react/_INDEX.md`, `<SKILLS>/typescript/_INDEX.md` |
| `*.tsx` | `<SKILLS>/nextjs/_INDEX.md`, `<SKILLS>/react/_INDEX.md`, `<SKILLS>/typescript/_INDEX.md` |
| `*.js`, `*.mjs` | `<SKILLS>/javascript/_INDEX.md` |
| `*.jsx`, `*.test.tsx`, `*.spec.tsx` | `<SKILLS>/react/_INDEX.md` |
| `*.dart` | `<SKILLS>/dart/_INDEX.md`, `<SKILLS>/flutter/_INDEX.md` |
| `*.java` | `<SKILLS>/java/_INDEX.md`, `<SKILLS>/spring-boot/_INDEX.md` |
| `*.kt` | `<SKILLS>/android/_INDEX.md`, `<SKILLS>/kotlin/_INDEX.md` |
| `*.kts` | `<SKILLS>/kotlin/_INDEX.md` |
| `*.swift` | `<SKILLS>/ios/_INDEX.md`, `<SKILLS>/swift/_INDEX.md` |
| `*.php` | `<SKILLS>/laravel/_INDEX.md`, `<SKILLS>/php/_INDEX.md` |
| `*.sql`, `*.entity.ts`, `*.prisma` | `<SKILLS>/database/_INDEX.md` |
| `*.component.ts`, `*.component.html` | `<SKILLS>/angular/_INDEX.md` |
| `*.service.ts`, `*.module.ts` | `<SKILLS>/angular/_INDEX.md`, `<SKILLS>/nestjs/_INDEX.md` |
| `*.spec.ts`, `*.test.ts` | `<SKILLS>/common/_INDEX.md` |
| Any file (keyword match) | `<SKILLS>/common/_INDEX.md` |
| QE workflow | `<SKILLS>/quality-engineering/_INDEX.md` |

> [!NOTE] **Test/spec file precedence:** `.spec.ts`, `.test.ts` → use the `common` row (takes precedence over the generic `*.ts` row). `.spec.tsx`, `.test.tsx` → use the `react` row (takes precedence over the generic `*.tsx` row).

> [!TIP] **Indirect phrasing counts.** "make it faster" → performance, "broken query" → database, "login flow" → auth.

<!-- SKILLS_INDEX_END -->
