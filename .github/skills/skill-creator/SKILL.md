---
name: Skill Creator
description: Standards for creating new High-Density Agent Skills with optimal token economy.
metadata:
  labels:
    [meta, standard, instruction-design, prompt-engineering, token-efficient]
  triggers:
    files: ['SKILL.md', 'metadata.json']
    keywords:
      [create skill, new standard, writing rules, high density, token economy]
---

# Agent Skill Creator Standard

## **Priority: P0 (CRITICAL)**

Strict guidelines for authoring High-Density Agent Skills. Maximize information density through progressive disclosure.

## Core Principles

1. **Token Economy First**: Every word costs tokens. Maximize information/token ratio.
   - Use **Progressive Loading**: Metadata -> SKILL.md -> References.
   - Use **Imperative Compression**: Verbs, abbreviations, bullet points.
2. **Context Awareness**: Design for ~32k token limits (Windsurf) to ~200k (Claude).

## ⚠️ CRITICAL: Package Detection

**🚨 NEVER consolidate skills that serve different packages.**
Skills are separated by package (e.g., `bloc` vs `riverpod`) for CLI detection.
See [references/package-detection.md](references/package-detection.md) for details.

## Directory Structure

```text
skills/
└── {category}/
    └── {skill-name}/
        ├── SKILL.md                # Core Logic (High Density, <300 lines)
        ├── scripts/                # Executable code (Deterministic tasks)
        ├── references/             # Heavy Examples (Lazy loaded)
        └── assets/                 # Output templates (Never loaded)
```

See [references/resource-organization.md](references/resource-organization.md) for full folder rules.

## Writing Rules (Token-Optimized)

1. **Imperative Compression**: Start with verbs. No "Please/You should".
   - _Bad_: "You should use BLoC for state management."
   - _Good_: "Use BLoC for state management."
2. **Token Economy**: Skip articles ("the", "a") if readable. Bullet points > paragraphs.
3. **Progressive Disclosure**: Core workflow in `SKILL.md`. Complex examples in `references/`.

## Content Sections (Budget < 300 lines)

1. **Frontmatter**: Metadata for triggering (100 words max).
2. **Priority**: P0 (Critical), P1 (Standard), or P2 (Optional).
3. **Structure**: ASCII tree of expected file layout.
4. **Guidelines**: Imperative "Do this".
5. **Anti-Patterns**: "Don't do this".
6. **Reference Links**: Links to `references/` files.

## Lifecycle & Validation

Follow the 4-phase lifecycle: **Understanding -> Planning -> Implementation -> Validation**.

See [references/lifecycle.md](references/lifecycle.md) for the full process.

## Reference & Examples

- Template: [references/TEMPLATE.md](references/TEMPLATE.md)
- Resource Org: [references/resource-organization.md](references/resource-organization.md)
