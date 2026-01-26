---
description: How to create a new Language/Framework Skillset
---

# Create New Skillset Workflow

Use this workflow to generate a new category of High-Density Skills for a language or framework.

## Steps

> [!IMPORTANT]
> All skills MUST strictly follow the [.agent/skills/skill-creator/SKILL.md](file:///Users/nguyenhuyhoang/OtherProjects/agent-skills-standard/.agent/skills/skill-creator/SKILL.md) standard.

1. **Scope & Definition**:
   - **Persona**: Adopt the persona of a **Principal Software Engineer** and Subject Matter Expert (SME).
   - **Input**: The user provides the **Target Name** (e.g., `spring-boot`), **Target Version** (e.g., `3.x`), and **Reference Documents/URLs**.
   - **Analysis**: Identify the core pillars for the skillset (e.g., `security`, `persistence`, `rest-api`).

2. **Research & Analysis**:
   - **Principal Engineer Review**: Deep-dive into official documentation and community standards (e.g., "Uber Go Style Guide").
   - **Expert Synthesis**: Extract High-Density rules that address common pitfalls and expert-level optimizations.
   - **Input References**: Ask user for specific reference documents (URLs, PDFs, internal wikis) to ground the skill in authoritative sources.
   - // turbo

   ```bash
   # Example: Create directory structure
   mkdir -p skills/<category>/{language,best-practices,tooling}
   ```

3. **Pre-Drafting Strategy (The Verbosity Check)**:
   - **Analyze Verbosity**: If target language is verbose (Java, Go, C#, XML), **Default to Reference Extraction**.
   - **Rule**: Do not attempt to fit code > 5 lines inline. Plan for `references/implementation.md` immediately.

4. **Drafting (High-Density Standard)**:
   - Create `SKILL.md` for each module.
   - **CONSTRAINT**: Keep content < 500 tokens (~70 lines).
   - **Structure**:
     - `Metadata`: Triggers, Keywords.
     - `Priority`: `## **Priority: Px (LEVEL)**` format.
     - `Structure`: ASCII tree of the expected file/folder layout.
     - `Implementation Guidelines`: **Imperative Compression** (verb-first, no fluff).
     - `Anti-Patterns`: Max 15 words per item. Use `**No X**: Do Y, not Z.`
     - `Code`: Inline only if < 10 lines. Use `References` for anything larger.

5. **Reference Compression**:
   - Move heavy examples/checklists to `references/*.md`.
   - Link to references from the main `SKILL.md`.

6. **Validation**:
   - Run the CLI validator (full check) to ensure absolute compliance.
   - // turbo

   ```bash
   pnpm --filter ./cli run dev validate --all
   ```

   - Run the code-review workflow to ensure code examples are high quality.

7. **Token Calculation**:
   - Verify token footprint.
   - // turbo

   ```bash
   pnpm calculate-tokens
   ```

8. **Finalize**:
   - Run `smart-release` workflow to update the related distribution artifacts and version metadata.
