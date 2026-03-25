# Skill Template (Token-Optimized)

Copy the structure below to start a new skill. Follow the progressive loading system for maximum token efficiency.

```markdown
---
name: { Skill Name }
description: "{ What it does + when to use it }. (triggers: {keyword1}, {keyword2}, {*.ext})"
---

# {Skill Name}

## **Priority: {P0|P1|P2}**

{One-line imperative summary of what to do}.

## 🏗 Architecture / Structure

- **{Rule 1}**: {Imperative constraint}.
- **{Rule 2}**: {Imperative constraint}.

## ⚙️ Implementation Guidelines

- **{Action 1}**: {Imperative instruction}.
- **{Action 2}**: {Imperative instruction}.

## 🚫 Anti-Patterns

- **No {Bad Pattern}**: {What to do instead}.
- **Avoid {Bad Pattern}**: {What to do instead}.

## References

- [{Topic Name}](references/deep-dive-topic.md)
```

## Token Budget Checklist

- [ ] SKILL.md under 100 lines (Ideal: 60-80).
- [ ] Triggers flattened into `description` frontmatter.
- [ ] No YAML metadata arrays (`keywords:`, `files:` removed).
- [ ] No verbose explanations; use bulleted lists.
- [ ] Complex code blocks (> 10 lines) moved to `references/` directory.
