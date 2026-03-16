---
name: common-skill-creator
description: "Standards for creating, testing, and optimizing Agent Skills. (triggers: SKILL.md, metadata.json, evals/evals.json, create skill, new standard, writing rules, high density, test skill, optimize)"
---

# Agent Skill Creator Standard

## **Priority: P0 (CRITICAL)**

Strict guidelines for High-Density Agent Skills. Maximize info/token ratio.

## ⚡ Token Economy First

- **Progressive Loading**: Keep `SKILL.md` under 100 lines. Move examples to `references/`.
- **Imperative Compression**: Start with verbs. Skip articles. Bullets > paragraphs.
- **Three-Level System**: Metadata (Triggers) -> `SKILL.md` (Rules) -> `references/` (Deep Dives).

## 📝 Writing Rules

- **Structure**: Mandatory Frontmatter -> Priority -> Core Rules -> Anti-Patterns -> References.
- **Anti-Patterns**: Format as `**No X**: Do Y[, not Z].` Keep under 15 words.
- **Descriptions**: Explicitly list what situations trigger the skill in the frontmatter.

## 🚫 Anti-Patterns

- **No Long Code Blocks**: >10 lines belong in `references/`.
- **No Redundancy**: Do not repeat frontmatter metadata in the body.
- **No YAML Bloat**: Use `description: ... (triggers: x, y)` instead of `keywords` arrays.

## References
- [Size & Limits Checklist](references/size-limits.md)
