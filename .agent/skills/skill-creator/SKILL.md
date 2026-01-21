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

Strict guidelines for authoring High-Density Agent Skills. Maximize information density while minimizing token consumption through progressive disclosure and strategic content organization.

## Core Principles

### **Token Economy First** ⚡

Every word costs tokens. Design skills for maximum information/token ratio:

- **Progressive Loading**: Load only essential content initially
- **Lazy References**: Move detailed examples to `references/` folder
- **Imperative Compression**: Use verbs, abbreviations, bullet points
- **Context Window Awareness**: Design for 4k-32k token limits across agents

### **Three-Level Loading System**

```ts
Level 1: Metadata (100 words) → Always loaded
Level 2: SKILL.md Body (500 lines) → When triggered
Level 3: References/Scripts/Assets → As needed
```

## Directory Structure

```text
skills/
└── {category}/                     # e.g., "flutter" (lowercase)
    └── {skill-name}/               # e.g., "bloc-state-management" (kebab-case)
        ├── SKILL.md                # Core Logic (High Density, <500 lines)
        ├── scripts/                # Executable code (Deterministic tasks)
        │   └── automation.py
        ├── references/             # Heavy Examples (Lazy loaded)
        │   ├── patterns.md
        │   └── examples.md
        └── assets/                 # Output templates (Never loaded)
            └── template.json
```

## Writing Rules (Token-Optimized)

1. **Imperative Compression**: Start with verbs. No "Please/You should".
   - _Waste_: "You should use BLoC for state management." (8 words)
   - _Efficient_: "Use BLoC for state management." (5 words)

2. **Token Economy**: Maximize info/token ratio.
   - Skip articles ("the", "a") if readable
   - Use standard abbreviations (cfg, param, impl)
   - Bullet points > paragraphs (3x density)

3. **Progressive Disclosure**: Essential info first, details on-demand.
   - Core workflow in SKILL.md
   - Complex examples in references/
   - Templates/assets never loaded

4. **Context-Aware Design**: Different agents have different limits.
   - Cursor: ~100k tokens
   - Claude: ~200k tokens
   - Windsurf: ~32k tokens

## Content Sections (Token-Budgeted)

Required sections in `SKILL.md` (keep under 500 lines):

1. **Frontmatter (Mandatory)**: Metadata for triggering (100 words max)

   ```yaml
   ---
   name: Skill Name
   description: What it does + when to use it (triggers activation)
   metadata:
     labels: [tag1, tag2]
     triggers:
       files: ['**/*.ext']
       keywords: [term1, term2]
   ---
   ```

2. **Priority**: P0 (Critical), P1 (Standard), or P2 (Optional)
3. **Structure**: ASCII tree of expected file layout
4. **Guidelines**: Bullet points of "Do this" (imperative)
5. **Anti-Patterns**: Bullet points of "Don't do this"
6. **Reference Links**: Links to `references/` files (lazy loading)

## Resource Organization (Token-Saving)

### **scripts/** - Executable Code

**When to use**: Deterministic, repeated tasks
**Benefits**: Never loaded into context, executed directly
**Examples**: Code generators, formatters, validators

### **references/** - Documentation

**When to use**: Detailed examples, API docs, complex patterns
**Benefits**: Loaded only when needed, keeps SKILL.md lean
**Examples**: Implementation patterns, error handling guides

### **assets/** - Output Templates

**When to use**: Boilerplate files, images, configs
**Benefits**: Never loaded, copied to output as-needed
**Examples**: Project templates, config files, icons

## Skill Creation Lifecycle

### **Phase 1: Understanding (Token Audit)**

1. Define concrete use cases
2. Identify repetitive patterns
3. Calculate token budget per agent

### **Phase 2: Planning (Resource Strategy)**

1. Core workflow → SKILL.md
2. Complex examples → references/
3. Repeated code → scripts/
4. Templates → assets/

### **Phase 3: Implementation (Compression)**

1. Write imperative guidelines
2. Compress examples to essentials
3. Test context window fit

### **Phase 4: Validation (Token Testing)**

1. Verify loading efficiency
2. Test across different agents
3. Measure token consumption

## Anti-Patterns (Token Wasters)

- **Verbose Explanations**: "This is important because..." → Delete
- **Redundant Context**: Same info in multiple places
- **Large Inline Code**: Move to references/ or scripts/
- **Conversational Style**: "Let's see how to..." → "Do this:"
- **Over-Engineering**: Complex structure for simple skills

## Reference & Examples

Use the enhanced template below to generate new skills:
[references/TEMPLATE.md](references/TEMPLATE.md)

For comprehensive lifecycle guidance:
[references/lifecycle.md](references/lifecycle.md)

For resource organization patterns:
[references/resource-organization.md](references/resource-organization.md)
