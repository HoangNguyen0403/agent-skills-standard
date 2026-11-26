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

- **Outcome before procedure**: State outcome, acceptance criteria, scope/authority, delegated method, required evidence, and stop condition. Prescribe exact order only where dependency, auditability, or safety requires it.
- **Templates for results, labels for illustrations**: Never pre-fill result rows with fictional data; report tables use headers plus at most one skeleton row. When an ambiguous output shape needs a sample, label it `Illustrative`, keep it distinct from reported results, and never present it as an observed run.
- **Concise rationale for non-obvious constraints**: One clause is allowed when it improves generalization. Delete narrative preambles, restatement, and "how to X" sections a command or bullet already covers.
- **No pre-answered questions**: Don't document what agent _will_ output — let it output it.
- **Evidence-driven correction**: mismatch → cited evidence → failed criterion → repair boundary → focused verification. On unchanged evidence, stop and name the missing evidence/input before any retry or method change.
- **Merge sequential steps**: If two steps always happen together, they are one step.

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
3. Output template (headers only; mark any `Illustrative` sample as not a result)
4. Stop or escalation (only when a criterion cannot be met)
```

## Anti-Patterns

- **No verbose step preambles**: `"Before we start, it's important to understand..."` → Delete; keep one clause only for a genuinely non-obvious constraint
- **No fabricated results**: `| Security | P0 | ✅ PASS | CLIENT_ID moved to env |` → Delete; a labeled illustration is not a result row
- **No repeated examples**: Same concept shown twice in different formats → Keep one
- **No "How to X" sections**: step instruction
- **No caution blocks for obvious rules**: Reserve `> ⚠️` for genuinely non-obvious risks
- **No blind retries**: unchanged evidence → stop and name the missing input; do not retry or switch method without new evidence
- **Portable output contracts**: Use `feature_status`, missing evidence, decision needed, and adapter-neutral language; avoid runtime-specific tool names, chat channels, containers, and mount paths in canonical workflows.

## Quick Self-Check Before Saving

- [ ] Can agent reconstruct any removed content at runtime from context? If yes → remove it
- [ ] every table row real structure, not example data; illustration clearly labeled?
- [ ] there any paragraphs bullet list could replace?
- [ ] Would cutting this in half still give agent enough to act on?
- [ ] Can the agent choose method inside the stated constraints without losing a required gate?
