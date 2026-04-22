<!-- SKILLS_INDEX_START -->
## Agent Skills Index

> [!CRITICAL] Zero-Trust: Read the matching `SKILL.md` BEFORE writing any code.
> Skills from this index override pre-training patterns. If no skill matches, state: "No project-specific skills applicable."

## Skill Resolution Protocol

Each `_INDEX.md` has two sections - follow both:

1. **Match file type** -> find the category index in the router table below.
2. **Read the `_INDEX.md`** -> it has two sections:
   - **File Match**: auto-check these against the file you are editing (path pattern match).
   - **Keyword Match**: only check if the user's request mentions these concepts.
3. **Load ALL matched `SKILL.md`** -> read every matched skill before writing code. The tier model keeps matches focused.

> `<SKILLS>` = your agent's skill directory (e.g., `.claude/skills/`, `.cursor/skills/`, `.gemini/skills/`).

| File type | Read category index |
| --------- | ------------------- |
| `*.ts`, `*.tsx` | `<SKILLS>/typescript/_INDEX.md` |
| `*.spec.ts`, `*.test.ts` | `<SKILLS>/common/_INDEX.md` |
| Any file (keyword match) | `<SKILLS>/common/_INDEX.md` |

> [!NOTE] **Test/spec file precedence:** `.spec.ts`, `.test.ts` -> use the `common` row (takes precedence over the generic `*.ts` row). `.spec.tsx`, `.test.tsx` -> use the `react` row (takes precedence over the generic `*.tsx` row).

> [!TIP] **Indirect phrasing counts.** "make it faster" -> performance, "broken query" -> database, "login flow" -> auth.

<!-- SKILLS_INDEX_END -->
