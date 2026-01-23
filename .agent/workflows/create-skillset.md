---
description: How to create a new Language/Framework Skillset
---

# Create New Skillset Workflow

Use this workflow to generate a new category of High-Density Skills for a language or framework.

## Steps

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

3. **Drafting (High-Density Standard)**:
   - Create `SKILL.md` for each module.
   - **CONSTRAINT**: Keep content < 500 tokens (~70 lines).
   - **Structure**:
     - `Metadata`: Triggers, Keywords.
     - `Priority`: P0/P1/P2.
     - `Implementation Guidelines`: Imperative, positive rules.
     - `Anti-Patterns`: What to avoid.
     - `Code`: Concise, modern examples.

4. **Reference Compression**:
   - Move heavy examples/checklists to `references/*.md`.
   - Link to references from the main `SKILL.md`.

5. **Validation**:
   - Run the CLI validator to ensure compliance.
   - // turbo

   ```bash
   npx agent-skills-standard validate
   ```

   - Run the code-review workflow to ensure the code in good shape

6. **Token Calculation**:
   - Verify token footprint.
   - // turbo

   ```bash
   pnpm calculate-tokens
   ```

7. **Finalize**:
   - Run `smart-release` workflow to update the related distribution artifacts and version metadata.
