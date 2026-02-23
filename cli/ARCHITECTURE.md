# CLI Services Architecture

This document outlines the architectural design and service-layer organization of the Agent Skills Standard CLI, following SOLID and KISS principles.

## Core Orchestrators

| Service       | Responsibility                                                                | Command Usage |
| :------------ | :---------------------------------------------------------------------------- | :------------ |
| `InitService` | Environmental discovery, prompt interaction, and initial config generation.   | `ags init`    |
| `SyncService` | Fetches, maps, and distributes skills from registry into local agent folders. | `ags sync`    |

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
| `IndexGeneratorService` | Parses skill metadata and generates the formatting for the centralized `AGENTS.md` index. |
| `AgentBridgeService`    | Handles bridging rules into agent-specific system formats (e.g., `.mdc`, `.cursorrules`). |
| `MarkdownUtils`         | Utility for safely injecting HTML-markered content into documentation files.              |

## Design Principles

- **Statelessness**: Services should generally be stateless, receiving required context (like `cwd` or `config`) as arguments.
- **Inversion of Control**: Orchestrators (`InitService`, `SyncService`) compose lower-level services.
- **Resilience**: Use fallbacks for network operations (Registry/GitHub) to ensure the CLI remains functional in offline/restricted modes where possible.
