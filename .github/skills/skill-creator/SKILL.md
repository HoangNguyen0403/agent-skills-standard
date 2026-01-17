---
name: Skill Creator
description: Standards for creating new High-Density Agent Skills.
metadata:
  labels: [meta, standard, instruction-design, prompt-engineering]
  triggers:
    files: ['SKILL.md', 'metadata.json']
    keywords: [create skill, new standard, writing rules, high density]
---

# Agent Skill Creator Standard

## **Priority: P0 (CRITICAL)**

Strict guidelines for authoring new Agent Skills. Ensure high token density and low latency context loading.

## Directory Structure

```text
skills/
└── {category}/                     # e.g., "flutter" (lowercase)
    └── {skill-name}/               # e.g., "bloc-state-management" (kebab-case)
        ├── SKILL.md                # The Core Logic (High Density)
        └── references/             # Heavy Examples (Lazy Loaded)
            ├── REFERENCE.md
            └── complex_example.md
```

## Writing Rules (High Density)

1. **Imperative Mood**: Start sentences with verbs. No "Please/You should".
   - _Bad_: "You should use BLoC." -> _Good_: "Use BLoC."
2. **Token Economy**: Maximize info/token ratio.
   - Skip articles ("the", "a") if readable.
   - Use standard abbr (cfg, param, spec).
   - Bullet points > Paragraphs.
3. **Code Compression**: Inline code < 15 lines. Move heavy logic to `references/`.
4. **No Fluff**: Zero conversational text. No intros/outros.
5. **Delete > Comment**: No commented-out legacy code.

## Content Sections

Required sections in `SKILL.md`:

1. **Frontmatter (Mandatory)**: Must include `name`, `description`, `labels`, and `triggers`.

   ```yaml
   ---
   name: Skill Name
   description: Short description.
   metadata:
     labels: [tag1, tag2]
     triggers:
       files: ['**/*.ext']
       keywords: [term1, term2]
   ---
   ```

2. **Priority**: P0 (Critical), P1 (Standard), or P2 (Optional).
3. **Structure**: ASCII tree of expected file layout.
4. **Guidelines**: Bullet points of "Do this".
5. **Anti-Patterns**: Bullet points of "Don't do this".
6. **Reference**: Link to the `references/` folder.

## Metadata (YAML)

- `labels`: Semantic tags for searching.
- `triggers`:
  - `files`: File extensions/patterns that activate this skill (e.g., `['**_bloc.dart']`).
  - `keywords`: User query terms (e.g., `['state management']`).

## Reference & Examples

Use the template below to generate new skills:
[references/TEMPLATE.md](references/TEMPLATE.md)
