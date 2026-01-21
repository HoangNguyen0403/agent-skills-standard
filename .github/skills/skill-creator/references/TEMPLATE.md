# Skill Template (Token-Optimized)

Copy the structure below to start a new skill. Follow the three-level loading system for maximum token efficiency.

````markdown
---
name: { Skill Name }
description: { What it does + when to use it (triggers activation) }
metadata:
  labels: [{ tag1 }, { tag2 }, token-efficient]
  triggers:
    files: ['**.{ext}']
    keywords: [{ keyword1 }, { keyword2 }]
---

# {Skill Name}

## **Priority: {P0|P1|P2}**

{One-line imperative summary of what to do}.

## Structure

```text
{project-structure}/
├── {primary-file}.{ext}
└── {supporting-files}
```
````

## Implementation Guidelines

- **{Action}**: {Imperative instruction}.
- **{Action}**: {Imperative instruction}.
- **{Action}**: {Imperative instruction}.

## Anti-Patterns

- **No {Bad Pattern}**: {Why it wastes tokens}.
- **Avoid {Bad Pattern}**: {Why it wastes tokens}.

## Reference & Examples

For detailed patterns: [references/patterns.md](references/patterns.md)
For complex examples: [references/examples.md](references/examples.md)
For automation scripts: [scripts/automation.py](scripts/automation.py)

## Token Budget Checklist

- [ ] SKILL.md under 500 lines
- [ ] Frontmatter under 100 words
- [ ] No verbose explanations
- [ ] Complex code moved to references/
- [ ] Templates in assets/ (never loaded)
- [ ] Deterministic tasks in scripts/

## Resource Organization

### **scripts/** (If needed)

- Place executable automation here
- Never loaded into context
- Use for repetitive, deterministic tasks

### **references/** (If needed)

- Detailed examples and patterns
- Loaded only when agent requests
- Keep SKILL.md focused on core workflow

### **assets/** (If needed)

- Boilerplate files and templates
- Never loaded into context
- Copied to output when needed

## Creation Phases

1. **Understanding**: Define concrete use cases
2. **Planning**: Map content to loading levels
3. **Implementation**: Write compressed guidelines
4. **Validation**: Test token efficiency across agents
