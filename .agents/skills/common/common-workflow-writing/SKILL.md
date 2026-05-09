---
name: common-workflow-writing
description: Rules for writing concise, token-efficient workflow and skill files. Prevents over-building that requires costly optimization passes. Use when creating or editing workflow files, SKILL.md files, or new skill definitions.
metadata:
  triggers:
    files:
    - '.agents/workflows/*.md'
    - 'SKILL.md'
    keywords:
    - create workflow
    - write workflow
    - new skill
    - new workflow
---
# Workflow Writing Standard

## **Priority: P0 (CRITICAL)**

## Core Rules

- **Templates, not examples**: Workflows define _structure_, not pre-filled data. agent generates data at runtime.
- **No example rows in tables**: Include headers + 1 skeleton row only. Never populate with fake data.
- **No prose explanations**: If bullet or command achieves same result, delete paragraph.
- **No pre-answered questions**: Don't document what agent _will_ output — let it output it.
- **Merge sequential steps**: If two steps always happen together, they one step.

## Size Limits

| File type | Limit | If exceeded |
| ----------------- | --------- | --------------------------------- |
| Workflow `.md` | 80 lines | Extract detail to `references/` |
| SKILL.md | 100 lines | Extract examples to `references/` |
| Table rows | 8 | Extract to `references/` |
| Inline code block | 10 lines | Extract to `references/` |

## Workflow Structure (Required order)

```
1. Goal (1 sentence)
2. Steps (imperative verb → command or checklist)
3. Output template (headers only, no pre-filled rows)
```

## Anti-Patterns

- **No verbose step preambles**: `"Before we start, it's important to understand..."` → Delete
- **No pre-filled report rows**: `| Security | P0 | ✅ PASS | CLIENT_ID moved to env |` → Delete
- **No repeated examples**: Same concept shown twice in different formats → Keep one
- **No "How to X" sections**: step instruction
- **No caution blocks for obvious rules**: Reserve `> ⚠️` for genuinely non-obvious risks

## Quick Self-Check Before Saving

- [ ] Can agent reconstruct any removed content at runtime from context? If yes → remove it
- [ ] every table row real structure, not example data?
- [ ] there any paragraphs bullet list could replace?
- [ ] Would cutting this in half still give agent enough to act on?