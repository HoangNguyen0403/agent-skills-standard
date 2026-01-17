# Skill Template

Copy the structure below to start a new skill.

````markdown
---
name: { Skill Name }
description: { Short description for the CLI list }
metadata:
  labels: [{ tag1 }, { tag2 }]
  triggers:
    files: ['**.{ext}']
    keywords: [{ keyword1 }, { keyword2 }]
---

# {Skill Name}

## **Priority: {P0|P1|P2}**

{One-line high-density summary of the skill's purpose}.

## Structure

```text
lib/feature/
├── {file}.dart
└── {file}_test.dart
```
````

## Implementation Guidelines

- **Rule 1**: Description.
- **Rule 2**: Description.
- **Rule 3**: Description.

## Anti-Patterns

- **No {Bad Pattern}**: Explanation.
- **Avoid {Bad helper}**: Explanation.

## Reference & Examples

For advanced usage:
See [references/REFERENCE.md](references/REFERENCE.md).
