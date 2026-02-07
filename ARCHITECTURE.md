# Architecture & Design Records

This document captures the high-level design, data flow, and key decision records for the `agent-skills-standard` CLI.

## 1. System Overview

The system consists of three main components:

1.  **Registry**: A Git repository (or local folder) containing skill definitions (`SKILL.md`).
2.  **CLI**: The tool that fetches, validates, and syncs these skills to a project.
3.  **Local Project**: The user's codebase where skills are installed (e.g., `.cursor/skills/`).

### Data Flow

```mermaid
graph LR
    R[Registry (GitHub/Local)] -->|Sync Command| C[CLI Tool]
    C -->|1. Fetch & Filter| S[Memory Store]
    S -->|2. Resolve Dependencies| S
    S -->|3. Write Files| L[Local Project (.agent/skills)]
    L -->|4. Generate Index| I[AGENTS.md]
    I -->|Read Context| A[AI Agent]
```

## 2. Core Services

### SyncService (`src/services/SyncService.ts`)

The brain of the operation. It orchestrates the synchronization process.

- **Responsibility**: Fetching, filtering/excluding, writing files, and triggering index generation.
- **Key Dependency**: `IndexGeneratorService`.
- **Design Principle**: "Safe Overwrite". It respects `custom_overrides` in `.skillsrc`.

### IndexGeneratorService (`src/services/IndexGeneratorService.ts`)

Responsible for creating the "Context Bridge" for AI agents.

- **Input**: A directory of installed skills.
- **Output**: A compressed, token-optimized index (Markdown table).
- **Injection**: It looks for `<!-- AGENT_SKILLS_START -->` markers in `AGENTS.md` (or creates the file).

### ConfigService (`src/services/ConfigService.ts`)

Manages the user configuration (`.skillsrc`).

- **Responsibility**: Parsing YAML, validating schema (Zod), and resolving dependency exclusions (e.g. "Don't install React skills if this looks like Vue").

## 3. Token Economy (Design Constraint)

This is a **High-Density** project. Every feature must be evaluated against its impact on the AI's context window.

- **Skill Files**: Must be < 500 tokens.
- **Index**: Must be < 200 tokens per 10 skills.
- **References**: Heavy content goes to `references/` folder, loaded only on demand.

## 4. Decision Records

### ADR-001: Local-First Indexing

_Date: 2026-02-07_
**Decision**: `SyncService` should generate the index by scanning the _local_ disk after writing files, rather than using the in-memory list of fetched skills.
**Reason**: This ensures that manual edits or custom local skills created by the user are also included in the index, making the system "User-Extensible" by default.

### ADR-002: Internal Tools Separation

_Date: 2026-02-07_
**Decision**: Documentation scanners and maintenance scripts live in `scripts/` but are NOT bundled into the CLI binary.
**Reason**: Keeps the user-facing CLI binary small and focused.
