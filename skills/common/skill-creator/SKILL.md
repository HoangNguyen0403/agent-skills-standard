---
name: Skill Creator
description: Standards for creating, testing, and optimizing Agent Skills. Use when creating, improving, catching regressions, measuring trigger rates, or writing eval cases for any skill.
metadata:
  labels: [meta, standard, instruction-design, token-efficient, eval, testing]
  triggers:
    files: ['SKILL.md', 'metadata.json', 'evals/evals.json']
    keywords:
      [
        create skill,
        new standard,
        writing rules,
        high density,
        test skill,
        eval skill,
        trigger rate,
        optimize,
        description,
        skill regression,
        improve skill,
      ]
---

# Agent Skill Creator Standard

## **Priority: P0 (CRITICAL)**

Strict guidelines for High-Density Agent Skills. Maximize info/token ratio.

## Core Principles (Token Economy First ⚡)

- **Progressive Loading**: Load only essential content initially.
- **Lazy References**: Move detailed examples to `references/`.
- **Imperative Compression**: Use verbs, abbreviations, bullet points.
- **Context Limits**: Cursor(~100k), Claude(~200k), Windsurf(~32k).

## Three-Level Loading System

1. **Metadata**: Triggers → AGENTS.md index (Proactive Activation)
2. **SKILL.md**: Body < 100 lines → Core guidelines (When triggered)
3. **Resources**: `references/`, `scripts/`, `assets/` → Deep knowledge (On-demand)

## Writing Rules

- **Imperative**: Start with verbs. "Use BLoC" not "You should use BLoC".
- **Token Economy**: Skip articles. Use standard abbreviations. Bullets > paragraphs.
- **Structure**:
  1. Mandatory Frontmatter (YAML: name, description, metadata labels & triggers).
  2. Priority: P0 (Critical), P1 (Standard), P2 (Optional).
  3. Guidelines: Imperative Do's.
  4. Anti-Patterns: Strict format Don'ts.
  5. References: Links to lazy-loaded files.

## Strict Size Limits

| Element           | Limit     | Action if Exceeded       |
| ----------------- | --------- | ------------------------ |
| SKILL.md total    | 100 lines | Extract to `references/` |
| Inline code block | 10 lines  | Extract to `references/` |
| Anti-pattern item | 15 words  | Compress to imperative   |
| Tables            | 8 rows    | Extract to `references/` |

## Strict Formatting Rules

- **Anti-Patterns**: `**No X**: Do Y[, not Z]. [Context <= 15 words]`
  - _Example_: `**No Logic in Builder**: Perform calculations in BLoC, not UI.`
- **No Redundancy**: Do not repeat frontmatter descriptions.
- **Oversized Skills**: If SKILL.md >100 lines, extract step-by-step guides and complex scenarios to `references/`.
- **Nested Formatting**: Avoid `**Bold**: \`**More Bold**\``.

## Test, Measure & Iterate

After writing a skill draft, validate it before shipping:

1. **Write eval cases**: Create `evals/evals.json` with 2–3 realistic prompts (see [testing.md](references/testing.md)).
2. **Design trigger queries**: Generate 8–10 should-trigger and 8–10 should-not-trigger queries to measure description accuracy.
3. **Optimize description**: Make it "pushy" — list explicit trigger contexts, not just what it does.
4. **Catch regressions**: Snapshot the skill before editing; compare before/after outputs for existing test cases.
5. **Iterate**: Re-run evals after each change; stop when trigger rate ≥ 80% on held-out queries.

> See [Testing, Trigger Rate & Regression Guide](references/testing.md) for eval schema, query design rules, and regression protocol.

## Resources & Deep Knowledge

- [Resource Organization & Directory Structure](references/resource-organization.md)
- [Skill Creation Lifecycle](references/lifecycle.md)
- [Anti-Patterns Details](references/anti-patterns.md)
- [Creation Template](references/TEMPLATE.md)
- [Testing, Trigger Rate & Regression Guide](references/testing.md)
