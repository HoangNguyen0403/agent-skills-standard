# CLI Services Architecture

This document outlines the architectural design and service-layer organization of the Agent Skills Standard CLI, following SOLID and KISS principles.

## Core Orchestrators

| Service       | Responsibility                                                                                                                                 | Command Usage |
| :------------ | :--------------------------------------------------------------------------------------------------------------------------------------------- | :------------ |
| `InitService` | Environmental discovery, prompt interaction, and initial config generation.                                                                    | `ags init`    |
| `SyncService` | Fetches, maps, and distributes skills from registry into local agent folders. Generates `_INDEX.md` per category and router-style `AGENTS.md`. | `ags sync`    |

## Sync Pipeline

| Service               | Responsibility                                                                                  |
| :-------------------- | :---------------------------------------------------------------------------------------------- |
| `SkillSyncService`    | Fetches SKILL.md + references from GitHub, writes to agent directories, prunes orphaned skills. |
| `WorkflowSyncService` | Fetches canonical workflows from `.agents/workflows/*.md` and exports agent-specific workflow surfaces (native, command, prompt, TOML, or skill). |

## Data & Strategy

| Service            | Responsibility                                                                      |
| :----------------- | :---------------------------------------------------------------------------------- |
| `ConfigService`    | Manages `.skillsrc` lifecycle (Loading, Saving, Validation via Zod).                |
| `DetectionService` | Analyzes workspace for Frameworks, Agents, Languages, and Dependencies.             |
| `SkillService`     | Determines detection status of skills based on project dependencies.                |
| `RegistryService`  | Higher-level abstraction for discovering categories and metadata from the registry. |

## External Integration

| Service           | Responsibility                                                                 |
| :---------------- | :----------------------------------------------------------------------------- |
| `GithubService`   | Low-level wrapper for GitHub API (Trees, Raw content, Repo info).              |
| `FeedbackService` | Reports issues and suggestions to the proxy backend for GitHub Issue creation. |

## Tooling & Verification

| Service                 | Responsibility                                                                            |
| :---------------------- | :---------------------------------------------------------------------------------------- |
| `SkillValidator`        | Orchestrates skill repository validation, leveraging discrete rules via the Rule Pattern. |
| `GitService`            | Encapsulates Git operations (finding root, detecting changed/untracked files).            |
| `SkillDiscoveryService` | Handles the traversal and filtering logic to discover skill files within the repository.  |

## Index Generation (Hierarchical Skill Resolution)

| Service                 | Responsibility                                                                                                                                                                                                                                                                                               |
| :---------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IndexGeneratorService` | Produces three output formats: **Router Index** (compact AGENTS.md), **Category Index** (per-category `_INDEX.md` with tiered File Match / Keyword Match), and **Flat Index** (legacy). Reads `metadata.json` for `file_routing`, `broad_globs`, and `base_language_skills` to classify triggers into tiers. |
| `AgentBridgeService`    | Creates agent-specific discovery rule files (Cursor `.mdc`, Copilot instructions, Claude `CLAUDE.md`, Antigravity/Windsurf/Trae/Kiro/Roo rules) that point to `AGENTS.md`.                                                                                                                                   |
| `MarkdownUtils`         | Utility for safely injecting HTML-markered content into documentation files.                                                                                                                                                                                                                                 |

### Three-Tier Trigger Model

When generating `_INDEX.md`, `IndexGeneratorService` classifies each skill's triggers:

- **File Match** (auto-check): Skills with specific path patterns (e.g., `**/page.tsx`, `*_test.go`) or the designated `base_language_skills` for the category.
- **Keyword Match** (on-demand): Skills with only broad globs (e.g., `**/*.ts`) that were demoted, or skills with keyword-only triggers. These activate only when the user's request mentions the concept.

This prevents 30+ skills from matching a single file extension. Configuration lives in `skills/metadata.json` (`broad_globs` + `base_language_skills`).

## Design Principles

- **Statelessness**: Services should generally be stateless, receiving required context (like `cwd` or `config`) as arguments.
- **Inversion of Control**: Orchestrators (`InitService`, `SyncService`) compose lower-level services.
- **Resilience**: Use fallbacks for network operations (Registry/GitHub) to ensure the CLI remains functional in offline/restricted modes where possible.
- **O(1) Lookup**: The hierarchical index ensures scan cost per edit is constant (~25 lines) regardless of total skill count.
