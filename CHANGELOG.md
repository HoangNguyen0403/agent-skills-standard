# Changelog

All notable changes to the Programming Languages and Frameworks Agent Skills will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

# [cli-v2.4.6] - 2026-05-22

**Category**: SDLC Requirements Traceability & Review Tooling

### Added

- **Living BRD/PRD/SRS Baseline**: Introduced a shared public-source baseline for BRD (Why), PRD (What), and SRS/FRS (How) guidance, referenced directly from SDLC workflows to improve trust and auditability.
- **Requirements Standard Skills**: Added `common-business-requirements` (BRD / BRD-lite) and `common-software-requirements` (SRS/FRS) to formalize discovery, IDs, quality gates, and anti-patterns.
- **Canonical Default Workflows**: Added missing canonical `.agents/workflows` sources for `deploy-release`, `traceability-audit`, `session-report`, `publish-notes`, and `retro-learn`, so generated exports are no longer the only source of truth.

### Changed

- **BRD-lite / PRD / SRS/FRS Workflow Clarity**: Updated `brainstorm-feature`, `plan-feature`, `design-solution`, and `implementation-readiness` to explicitly state which requirement layer they cover, how traceability is gated, and when to update living specs.
- **PR Reviewer Consolidation**: Consolidated PR/MR metadata review into `specialist-pr-reviewer` (supports GitHub, GitLab, and Azure DevOps) and removed the separate ADO-only reviewer.
- **SDLC Audit**: Strengthened `audit:sdlc` checks to detect `DEFAULT_WORKFLOWS` vs canonical `.agents/workflows` mismatches and fail when exports exist without canonical sources.

### Versions

- **CLI**: `2.4.5` → `2.4.6`
- **Root**: `2.4.5` → `2.4.6`
- **Common Skills**: `2.0.8` → `2.0.9`

# [cli-v2.4.5] - 2026-05-20

**Category**: Release Readiness & CLI Packaging

### Fixed

- **Stale pnpm Shim Recovery**: Added startup detection for old pnpm shim paths and a guided repair flow so `ags -V` can be corrected after reinstalling the CLI.

### Versions

- **CLI**: `2.4.4` → `2.4.5`
- **Root**: `2.4.4` → `2.4.5`

# [cli-v2.4.4] - 2026-05-20

**Category**: Release Readiness & CLI Packaging

### Fixed

- **pnpm Upgrade Verification**: Improved the upgrade flow to verify the installed pnpm package before treating `ags -V` mismatches as shell PATH issues.

### Versions

- **CLI**: `2.4.3` → `2.4.4`
- **Root**: `2.4.3` → `2.4.4`

# [cli-v2.4.3] - 2026-05-20

**Category**: Release Readiness & CLI Packaging

### Fixed

- **Packaged CLI Version**: Updated the release flow so the built `ags` binary reports the published version after packaging.

### Versions

- **CLI**: `2.4.2` → `2.4.3`
- **Root**: `2.4.2` → `2.4.3`

# [cli-v2.4.2] - 2026-05-19

**Category**: Token Optimization & Redundancy Reduction

### Added

- **Professional Security Testing Workflows**: Added two PTES-aligned red-teaming workflows: `/pentest` (7-phase autonomous assessment) and `/security-test` (continuous DevSecOps pipeline for PRs).
- **Security Audit Skills**: Added `common-pentest-methodology` (PTES alignment, attack taxonomy) and `common-exploit-verification` (mandatory PoC rules, false-positive filtering) to the `common` category.
- **Security Specialist Sub-Agents**: Introduced three new high-density specialists to execute advanced security tasks:
  - `specialist-logic-hacker`: For stateful Business Logic (OWASP WSTG-BUSL) and Auth bypasses.
  - `specialist-mobile-reverser`: For binary analysis, SSL pinning bypass, and IPC attacks on iOS/Android.
  - `specialist-aspm-correlator`: For ingesting raw SAST/SCA outputs and performing impact analysis.
- **Global Token Optimization**: Injected `rtk` (Rust Token Killer) and `/caveman` mode recommendations globally into the generated `AGENTS.md` index template via `IndexGeneratorServiceImpl.ts`.
- **Unit Tests**: Added explicit test case in `IndexGeneratorService.spec.ts` to assert that the generated router table successfully includes the Global Token Optimization block.

### Changed

- **Removed Redundant Directives**: Stripped redundant token optimization blocks from `skills/common/common-context-optimization/SKILL.md`, `skills/common/common-security-audit/SKILL.md`, `skills/specialists/specialist-logic-hacker/SKILL.md`, `skills/common/common-security-audit/references/implementation.md`, and `.agents/workflows/pentest.md` since they are now inherited globally.

### Versions

- **CLI**: `2.4.1` → `2.4.2`
- **Root**: `2.4.1` → `2.4.2`
- **Common Skills**: `2.0.7` → `2.0.8`
- **Specialists**: `1.1.1` → `1.1.2`

# [cli-v2.4.1] - 2026-05-19

**Category**: 🔄 Configuration Self-Healing & Legacy Migration

### Fixed

- **Configuration Backward Compatibility**:
  - **Self-Healing Migration**: Added automated self-healing migration in `ConfigService` to gracefully convert legacy `openai` agent configurations in `.skillsrc` to `codex` (`Agent.Codex`) in memory and update `.skillsrc` on disk.
  - **Schema Preprocessing**: Updated `SkillConfigSchema` with a Zod preprocessor on the `agents` array to ensure robust schema validation across all parsing contexts.

### Versions

- **CLI**: `2.4.0` → `2.4.1`

# [mcp-v0.4.0] - 2026-05-19

**Category**: 🔌 Workflow Discovery & Execution Engine

### Added

- **`agent-skills-standard-mcp`**:
  - **Procedural Discovery Tools**: Added `list_workflows` to list all available standard operating procedures (e.g., `dev-fix`, `plan-feature`) in `.agents/workflows/`.
  - **Procedural Execution Tools**: Added `get_workflow` to retrieve exact step-by-step markdown instructions for any specific workflow.
  - **Authoritative Server Instructions**: Updated `SERVER_INSTRUCTIONS` with explicit guidance commanding agents to invoke `list_workflows()` at the start of any task or session.
  - **Session Telemetry Auditing**: Expanded `SessionTracker` to log `list_workflows` and `get_workflow` events, ensuring compliance audits verify workflow provenance.
  - **Workflow Verification**: Added full unit test coverage in `WorkflowIndex.spec.ts` verifying scanning, frontmatter parsing, and error handling.

### Versions

- **MCP**: `0.3.0` → `0.4.0`

# [cli-v2.4.0] - 2026-05-16

**Category**: 🧭 Agentic-AI Learning Integration, Specialist Expansion & SDLC Hardening

### Added

- **Portable SDLC Artifacts**:
  - Centralized canonical templates (PRD, Architecture, Task, Walkthrough, etc.) into shared workflow references.
- **Session Telemetry & Cost Reporting**:
  - Added `get_session_cost()` tool to the MCP server for tracking tool calls and session metadata.
  - Introduced `common-telemetry` skill to enforce standardized markdown cost reporting.
  - Updated canonical `.agents/workflows/*.md` sources to include a mandatory `## Cost Report` section.
- **SDLC workflow spine**:
  - Added `implementation-readiness` and `review-ticket` as synced workflows.
  - Unified `sdlc`, `dev-fix`, `verify-work`, `verify-bug`, and `code-review` through new readiness and review surfaces.
- **Native specialist pack**:
  - Expanded `specialists` into 13 native sub-agents covering Jira, architecture, codebase scouting, AC verification, test gaps, Zephyr, ADO PR review, Confluence, PR comment batching, integration test generation, TC creation, security, and TDD.
  - Added eval coverage for the specialist pack and synced them to native agent folders.

### Changed

- **CLI version**: `2.3.0` → `2.4.0`.
- **Workflow Spine Consolidation**:
  - Kept and synced `traceability-audit`, `deploy-release`, `publish-notes`, `session-report`, and `retro-learn` as part of the SDLC workflow spine.
  - Updated `sdlc` routing and `docs/sdlc-workflow-quick-reference.md` to reflect the streamlined lifecycle.
- **Audit gates**: Extended `audit:sdlc` to verify new workflows, specialist evals, and generated native agents.
- **Integrity Gates**: All 259 skills now undergo a strict alignment pass (HTML comment stripping) and validation check.
- **Hook Architecture & Runtime Support**:
  - Modernized `HookService` by replacing legacy duplicate Python hook templates with a single canonical universal JavaScript hook (`preedit-skill-loader.js`), complete with automated self-cleaning migration.
  - Added native PreToolUse hook configuration support for `Cursor` (`.cursor/hooks.json`), `Windsurf` (`.windsurf/hooks.json`), and `Gemini` (`.gemini/hooks.json`).
  - Renamed `Agent.OpenAI` to `Agent.Codex` across the CLI codebase, metadata, and documentation to accurately reflect the runtime.
- **Skill Updates**:
  - `common-v2.0.7`: Added `common-telemetry` skill and integrated `Vibe Security Scan` lens into `common-security-audit`.
  - `android-v1.4.2`: Updated `android-compose-migration` with list-heavy screen guidance (`LazyColumn`/`LazyRow`) and `android-concurrency` with `SharedFlow` replay rules.
  - `php-v1.3.6`: Cleaned up formatting and git rules in `php-tooling`.
  - `specialists-v1.1.1`: Added 10 new native specialists (`ac-verifier`, `ado-pr-reviewer`, `architecture-guard`, `codebase-scout`, `confluence-searcher`, `integration-test-generator`, `pr-commenter-batch`, `tc-creator`, `test-gap-finder`, `zephyr-scanner`) and updated `specialist-security-reviewer` and `specialist-tdd-implementer`.

### Notes

- `pnpm check-alignment --threshold 90` still fails on 71 older framework skills; that remains a separate framework quality-wave backlog.

## [cli-v2.2.3] - 2026-05-10

**Category**: 🔄 Workflow Sync Optimization & Registry Reliability

### Fixed

- **`WorkflowSyncService`**:
  - **Preserved `workflows: true`**: Fixed a bug where setting `workflows: true` in `.skillsrc` was incorrectly overwritten by a fixed array of defaults. It now remains `true` to ensure automatic discovery of all future registry workflows.
  - **Comprehensive Workflow Discovery**: Updated the CLI to include `dev-fix`, `implement-feature`, and `verify-bug` in the default synchronization list.
  - **Enhanced Logging**: Added detailed status logs during the workflow assembly phase, including count of fetched files and warnings for empty registry matches.
- **`SyncService`**:
  - **Local Registry Detection**: Added a proactive warning when running `sync` within the registry repository itself, clarifying that the CLI pulls from the remote GitHub origin rather than local unpushed files.

### Versions

- **CLI**: `2.2.2` → `2.2.3`

## [mcp-v0.2.0] - 2026-05-09

**Category**: 🚀 Transport Modernization & Security Hardening

### Changed

- **`agent-skills-standard-mcp`**:
  - **Migrated to Streamable HTTP**: Replaced the deprecated `SSEServerTransport` with `StreamableHTTPServerTransport`. This aligns the server with the latest MCP specification for more robust and efficient session management.
  - **Enhanced Security**: Switched to `createMcpExpressApp` from the SDK, which provides built-in DNS rebinding protection and localhost security defaults.
  - **Unified Endpoints**: Introduced a standard `/mcp` endpoint while maintaining backward compatibility for legacy `/sse` and `/messages` routes.
  - **Multi-session Reliability**: The server now correctly handles multiple simultaneous SSE connections by leveraging the SDK's built-in session tracking.

### Versions

- **MCP**: `0.1.2` → `0.2.0`

## [cli-v2.2.2] / [mcp-v0.1.2] - 2026-05-09

**Category**: 🤖 Specialist Integration & Reliability Hardening

### Added

- **Integrated Specialist Sync**: `SpecialistSyncService` is now a first-class phase in the core `ags sync` lifecycle. Sub-agent definitions are automatically transformed and deployed to all supported platform folders (`.clauderules`, `.cursor/agents`, etc.) based on the registry whitelist.
- **Sub-Agent Workflow Delegation**:
  - Integrated `@specialist-tdd-implementer` into `implement-feature` and `dev-fix` implementation phases for strict TDD enforcement.
  - Added "Kick-off Implementation" step to `plan-feature.md` to automate the transition from planning to execution.
- **Workflow References**: Added a `### References` section to `verify-bug.md` linking to the `diagnostic-decoder.md` for automated failure analysis.
- **Automated Folder Migration** in CLI: `SyncService` now automatically detects legacy `.agent` (singular) folders and performs a non-destructive merge into the new `.agents` (plural) structure before cleanup.
- **Migration Unit Tests**: 2 new test cases in `SyncService.spec.ts` verifying selective file migration and safe folder removal.

### Changed

- **Workflow Branding**: Renamed all `*-plus.md` workflows (e.g., `dev-fix-plus.md` → `dev-fix.md`) to standard names, unifying the "Plus" enterprise features into the core workflow library.
- **Path Standardization**: Fixed legacy `.agent/workflows` → `.agents/workflows` path references in `common-workflow-writing` and project documentation.

### Fixed

- **Security Hardening**: Updated root `package.json` with `pnpm overrides` to patch critical and moderate vulnerabilities in `hono`, `ip-address`, `fast-uri`, and `path-to-regexp` found in `@modelcontextprotocol/sdk` and `@nestjs/swagger` dependency trees.
- **Override Cleanup**: Removed 10 redundant/stale overrides from `package.json`, improving project hygiene while maintaining zero vulnerabilities.

### Versions

- **CLI**: `2.2.1` → `2.2.2`
- **MCP**: `0.1.1` → `0.1.2`
- **Common**: `2.0.4` → `2.0.5`
- **Quality Engineering**: `1.4.4` → `1.5.0`
- **Dart**: `1.3.4` → `1.3.5`
- **Flutter**: `1.7.0` → `1.7.1`
- **Golang**: `1.3.3` → `1.3.4`
- **Database**: `1.3.3` → `1.3.4`

## [cli-v2.2.1] / [mcp-v0.1.1] - 2026-04-23

**Category**: Fix — Type Safety & Configuration Paths

### Fixed

- **`agent-skills-standard-mcp`**:
  - Replaced `any` with `z.ZodObject<any>` in the `ToolDef` interface for better type safety in the MCP server registration.
  - Resolved TypeScript instantiation-depth limit (TS2589) by using a registration wrapper with loosened static types.
- **CLI Configuration**:
  - Corrected configuration paths for `Antigravity`, `Kiro`, `Roo`, and `Copilot` runtime integrations.
  - Added user-scope configuration support for `Antigravity`, `Kiro`, `Copilot`, `OpenCode`, and `Codex`.
  - Refined `SyncCommand` to re-prompt for MCP enablement if previously declined, ensuring users aren't locked out of the feature.

## [cli-v2.2.0] / [mcp-v0.1.0] - 2026-04-22

**Category**: Runtime Enforcement Layer — MCP Server + Consent-Respecting CLI Integration

### Added

- **`agent-skills-standard-mcp` package** (new): standalone MCP (Model Context Protocol) server that serves matched `SKILL.md` content to AI agents on demand. Works in any MCP-capable runtime (Claude Code, Cursor, Antigravity, Kiro, Continue, Gemini CLI). Closes the gap where sub-agents skip skill loading because they don't inherit `AGENTS.md`.
  - 5 tools: `load_skills_for_files`, `load_skills_for_keywords`, `get_skill`, `list_categories`, `audit_session_compliance`.
  - Server-level `instructions` field (1.9 KB workflow guide) per [awesome-mcp-best-practices §2.1](https://github.com/lirantal/awesome-mcp-best-practices).
  - Tier-aware matching honoring `metadata.broad_globs` + `base_language_skills` (same algorithm as `IndexGeneratorService`).
  - **Composite-trigger expansion** honoring `foundational_composite_rules` — surfaces foundational skills (`common-best-practices`, `common-security-standards`, `common-performance-engineering`, `common-api-design`, `common-system-design`, `common-tdd`, `common-accessibility`, `common-error-handling`, `common-observability`, `common-mobile-ux-core`) automatically when an adjacent skill loads. Closes the gap where broad-glob foundational skills were previously invisible to `load_skills_for_files`.
  - Graceful empty-state handling — server starts even when no skills installed; tools return setup guidance instead of crashing.
  - Positive-guidance no-match responses (lists available categories) per awesome-mcp §1.4.
  - Stdio transport (universal across runtimes).
  - 27 unit tests covering matching, tier model, composite expansion (8 cases incl. non-recursion + missing-skill tolerance), empty-state, no-match guidance, audit trail.
  - Full [`mcp/ARCHITECTURE.md`](./mcp/ARCHITECTURE.md) with 7 ADRs covering standalone parser, transport choice, tier model, instructions field, positive-guidance, no-persistence design, and composite-trigger expansion.
- **`ags mcp <action>` subcommand** (new): manage the MCP integration without editing `.skillsrc` by hand. Actions: `status` | `enable` | `disable` | `scope <project|user|snippets-only|disabled>` | `install` | `uninstall` | `snippets`.
- **MCP consent step in `init`**: asks once whether to enable the MCP server and at what scope. Default is `project` (recommended) — never auto-writes to user-home configs without explicit per-file consent.
- **MCP wiring in `sync`** (Phase 7): if enabled, installs the server entry into the configured runtime config files. Project-scope only by default. Generates `./mcp-config-snippets/*.json` for manual paste-in. User-scope writes always prompt per file.
- **`McpConfigService`** (new): pure read-modify-write service that safely merges only the `agent-skills` server key into runtime configs. Other MCP servers in the same file are preserved byte-for-byte. 12 unit tests cover safe-merge, scope semantics, uninstall, snippet generation.
- **`mcp` block in `.skillsrc` schema**: `enabled`, `scope`, `prompted`, optional `version`. Decisions persist so users aren't re-prompted on every sync.
- **`scripts/release-mcp.ts`**: release script for the MCP package mirroring `release-cli.ts` / `release-server.ts` patterns. Includes build + test verification before tagging, and `npm publish` step (skippable with `--skip-publish`).

### Changed

- **CLI version**: `2.1.3` → `2.2.0` (minor bump — new feature, non-breaking).
- **Root README**: added Step 4 documenting the MCP integration, the consent model table, and the `ags mcp` subcommand reference.
- **`cli/README.md`**: added MCP section pointing to the subcommand.

### Privacy / consent guarantees

- The CLI **never reads or modifies** files in `$HOME` unless the user explicitly chooses `scope: user` AND confirms each file write.
- `scope: snippets-only` writes ONLY to `./mcp-config-snippets/`; no runtime configs touched.
- All scope decisions are recorded in `.skillsrc` and changeable via `ags mcp scope <X>`.
- Safe-merge: other MCP servers in the same config file are never replaced or removed.
- `ags mcp uninstall` removes only the `agent-skills` entry, leaves siblings intact.

### Skill content fixes — broad-glob skills with weak keywords

Audit found 6 broad-glob non-foundational skills whose keyword sets were too sparse (4 each) to be reliably discoverable via natural-language `load_skills_for_keywords` calls. Each skill received 7-8 additional intent-style keywords (e.g. `"ios performance"`, `"sql injection"`, `"react typescript"`) so developers can find them by describing the task instead of remembering API names:

- `ios/ios-performance` — added: `ios performance`, `swift performance`, `optimize ios`, `time profiler`, `frame drops`, `main thread`, `slow scroll`
- `ios/ios-security` — added: `ios security`, `swift security`, `keychain`, `biometric`, `face id`, `touch id`, `certificate pinning`, `app transport security`
- `php/php-security` — added: `php security`, `sql injection`, `xss php`, `prepared statement`, `csrf`, `sanitize input`, `password storage`
- `react/react-security` — added: `react security`, `csp`, `content security policy`, `sanitize html`, `secure cookie`, `jwt react`, `oauth react`, `dompurify`
- `react/react-typescript` — added: `react typescript`, `tsx types`, `props interface`, `generic component`, `useState type`, `useRef type`, `typed hooks`
- `swift/swift-best-practices` — added: `swift idiomatic`, `swift naming`, `swift best practice`, `swift conventions`, `value type`, `immutability swift`, `guard let`

### Tooling fix

- `scripts/generate-indices.ts`: changed import from abstract `IndexGeneratorService` to `IndexGeneratorServiceImpl`, fixing a pre-existing `generateAllCategoryIndices is not a function` error that left per-category `_INDEX.md` files stale.

### MCP-aware AGENTS.md generation

- `IndexGeneratorService.assembleRouterIndex(baseDir, allowedCategories, mcpEnabled)` — generated `AGENTS.md` now includes a "🔌 Runtime Enforcement via MCP" section above the router table. The block is **always present** so it remains correct in all four states (CLI-installed, manually-installed, partially-uninstalled, never-installed). The optional `mcpEnabled` parameter only controls a small status note (TIP vs NOTE) telling the user whether `.skillsrc` opts the project in.
- The block is phrased self-checkingly — "**If** `load_skills_for_files` is in your tool list, prefer those tools" — so the AI verifies MCP presence via its own tool list before assuming.
- `SyncService.applyIndices` reads `config.mcp?.enabled` and passes it through.
- **Single source of truth**: the MCP block lives ONLY in `AGENTS.md`. Per-agent rule files (Cursor `.mdc`, Copilot instructions, Claude `CLAUDE.md`, Antigravity/Windsurf/Trae/Kiro/Roo rules) continue to point at `AGENTS.md` as their first read, so the MCP message reaches the agent without duplication that could drift.

### `ags mcp status` mismatch detection

- `ags mcp status` now warns when `.skillsrc.mcp.enabled` is out of sync with the actual runtime-config presence:
  - **`enabled: false` + manual install detected** → suggests `ags mcp enable` (so `sync` keeps configs in step) OR `ags mcp uninstall --from project` (clean up the manual entry).
  - **`enabled: true` + no runtime config wired** → suggests `ags mcp install` OR `ags mcp disable`.
- This makes the consent flag (`.skillsrc`) and the actual runtime presence diagnose-able with one command, regardless of how the MCP got installed.

### Versions

- **CLI**: `2.1.3` → `2.2.0`
- **MCP**: new package — `0.1.0`
- **iOS**: `1.4.4` → `1.4.5` (keyword expansion: `ios-performance`, `ios-security`)
- **PHP**: `1.3.3` → `1.3.4` (keyword expansion: `php-security`)
- **React**: `1.3.4` → `1.3.5` (keyword expansion: `react-security`, `react-typescript`)
- **Swift**: `1.3.4` → `1.3.5` (keyword expansion: `swift-best-practices`)

---

## [2.1.3] - 2026-04-22

**Category**: Structured Frontmatter Migration & New Workflow Skills

### Added

- **Android Workflow Skills (4)**: `android-edge-to-edge` (inset patterns with RIGHT/WRONG code), `android-agp-upgrade` (6-step AGP 9 migration), `android-compose-migration` (10-step XML-to-Compose workflow), `android-navigation-3` (Nav2-to-Nav3 migration with 6 recipes). Inspired by Google's official [android/skills](https://github.com/android/skills).
- **Flutter Workflow Skills (1)**: `flutter-concurrency` (isolate decision matrix). Inspired by Flutter's official [flutter/skills](https://github.com/flutter/skills).
- **Evals for all 5 new skills**: 3 positive test cases + 5 negative (should-not-trigger) cases each.
- **Verification sections** added to `android-compose`, `android-architecture`, `android-state`, `flutter-bloc-state-management`, `flutter-testing` with runnable checklist items.
- **RIGHT/WRONG code patterns** added to `android-compose/references/implementation.md` (state hoisting, side effects, LazyColumn keys, Modifier reuse).

### Changed

- **Frontmatter Migration (244/244 skills)**: All skills migrated from inline `(triggers: ...)` in description strings to structured `metadata.triggers.files` and `metadata.triggers.keywords` YAML fields. Descriptions are now clean and human-readable.
- **Security fix**: Replaced `const token = 'invalid-token'` with `const invalidInput = 'not-a-real-jwt'` in `common-tdd` AAA methodology reference to prevent pre-commit secret detection false positives.

### Versions

- **CLI**: v2.1.3 (No CLI logic changes — skills content only)
- **Android**: `v1.3.3` -> `v1.4.0` (4 new workflow skills + frontmatter migration)
- **Flutter**: `v1.6.3` -> `v1.7.0` (3 new workflow skills + frontmatter migration)

#### Category Patch Version Updates (frontmatter migration)

All categories received a patch bump for the structured frontmatter migration:

- **Common**: `v2.0.3` -> `v2.0.4`
- **Dart**: `v1.3.3` -> `v1.3.4`
- **TypeScript**: `v1.3.2` -> `v1.3.3`
- **JavaScript**: `v1.3.3` -> `v1.3.4`
- **React**: `v1.3.3` -> `v1.3.4`
- **React Native**: `v1.4.3` -> `v1.4.4`
- **Next.js**: `v1.4.3` -> `v1.4.4`
- **Angular**: `v1.4.1` -> `v1.4.2`
- **NestJS**: `v1.4.3` -> `v1.4.4`
- **Go (Golang)**: `v1.3.2` -> `v1.3.3`
- **Spring Boot**: `v1.3.2` -> `v1.3.3`
- **iOS**: `v1.4.3` -> `v1.4.4`
- **Swift**: `v1.3.3` -> `v1.3.4`
- **Kotlin**: `v1.3.2` -> `v1.3.3`
- **Java**: `v1.3.2` -> `v1.3.3`
- **PHP**: `v1.3.2` -> `v1.3.3`
- **Laravel**: `v1.3.3` -> `v1.3.4`
- **Database**: `v1.3.2` -> `v1.3.3`
- **Quality Engineering**: `v1.4.3` -> `v1.4.4`

## [2.1.2] - 2026-04-11

**Category**: Token Economy & Custom Skill Indexing

### Added

- **Custom Skill Indexing**: Enhanced the `ags sync` logic to discover and index individual `.md` files as standalone skills alongside standard registry folders.
- **Standalone Skill Support**: Users can now add local skills directly to their `.cursor/skills/` or other agent folders without requiring a full registry structure.

### Changed

- **Token Economy (Caveman Mode)**: Applied the "Caveman" compression strategy to all 238 registry skills, reducing total token count by approximately 45%.
- **Skill Density**: Removed filler words and fluff from all `SKILL.md` body content while maintaining 100% technical and code accuracy.

### Fixed

- **CLI metadata sync**: Fixed an issue where `ags sync` failed to populate the hierarchical router table in `AGENTS.md`.
- **Linting**: Fixed unused `prefix` variable in `IndexGeneratorService.ts`.

### Versions

- **CLI**: v2.1.1 (Patch — maintain stable version)
- **Skills**: v2.2.0 (Minor — global Caveman token optimization)

#### Category Brander Version Updates

The following category-specific versions were bumped to reflect the global "Caveman" token economy optimization:

- **Common Patterns**: `v2.0.1` -> `v2.0.3`
- **Flutter**: `v1.6.1` -> `v1.6.3`
- **React**: `v1.3.1` -> `v1.3.3`
- **Next.js**: `v1.4.1` -> `v1.4.3`
- **Angular**: `v1.3.1` -> `v1.4.1` (Includes new standalone indexing format support)
- **NestJS**: `v1.4.1` -> `v1.4.3`
- **TypeScript**: `v1.3.1` -> `v1.3.2`
- **JavaScript**: `v1.3.1` -> `v1.3.3`
- **iOS**: `v1.4.1` -> `v1.4.3`
- **Android**: `v1.3.1` -> `v1.3.3`
- **Quality Engineering**: `v1.4.1` -> `v1.4.3`
- (All other language categories bumped to `v1.3.x` / `v1.4.x` as per global update)

## [2.1.1] - 2026-04-04

**Category**: Fix Hierarchical Index Sync

### Fixed

- **CLI metadata sync**: Fixed an issue where `ags sync` failed to populate the hierarchical router table in `AGENTS.md`. The `IndexGeneratorService` now uses an in-memory `RemoteMetadata` injection system to fetch `skills/metadata.json` directly from the registry without writing it to the user's disk.
- **Index Generation**: Added `withMetadata()` to `IndexGeneratorService` to allow injecting `file_routing`, `broad_globs`, and `base_language_skills` at runtime during a sync operation.

### Versions

- **CLI**: v2.1.1 (Patch — fix metadata injection during sync)

## [2.1.0] - 2026-04-04

### Added

- **Hierarchical Skill Resolution (CLI)**: New architecture that replaces the flat AGENTS.md index (238 entries, ~300 lines) with a two-level hierarchy:
  - **Router table** (`AGENTS.md`, ~20 lines) — maps file extensions to per-category `_INDEX.md` files.
  - **Category indexes** (`_INDEX.md`) — compact trigger tables with **File Match** and **Keyword Match** sections, auto-generated from SKILL.md frontmatters.
  - Reduces scan cost from O(n) to O(1) — ~25 lines per lookup regardless of total skill count.
- **Three-Tier Trigger Model (CLI)**: `IndexGeneratorService` now classifies triggers into tiers:
  - **File Match**: Skills with specific path patterns (e.g., `**/page.tsx`) or the designated `base_language_skills`.
  - **Keyword Match**: Skills with only broad globs (e.g., `**/*.ts`) are automatically demoted to keyword-only activation.
  - Reduces `*.ts` file auto-matches from 27 skills to 6 (78% reduction).
- **`metadata.json` extensions**: Added `file_routing` (24 extension-to-category mappings), `broad_globs` (13 patterns to demote), and `base_language_skills` (19 category-to-base-skill mappings).
- **`IndexGeneratorService` new methods**: `generateCategoryIndex()`, `generateAllCategoryIndices()`, `assembleRouterIndex()`.
- **Description-based trigger extraction**: `parseSkill()` now extracts and classifies triggers from the description `(triggers: ...)` suffix when structured `metadata.triggers` is absent (covers 100% of current skills).
- **21 new unit tests**: 411 total (up from 409). Full coverage for hierarchical generation, tier classification, and router output.

### Changed

- **Angular skill merge**: Merged `angular-component-patterns` into `angular-components` (16 → 15 skills). Combined OnPush/Signals content + Standalone/Control Flow into one skill with 9 merged evals.
- **Tessl Quality Audit (237 skills)**: Achieved 100% compliance across all 237 skills:
  - 21 vague leading verbs replaced ("Manage" → "Configure", "Implement", "Validate", etc.).
  - 6 inline code blocks (>10 lines) extracted to `references/` files.
  - 4 missing "Use when" clauses added.
  - 2 missing trigger hints added.
  - 1 description trimmed to <100 words.
- **`SyncService.applyIndices()`**: Now generates `_INDEX.md` per category for all target agents and produces router-style `AGENTS.md`.
- **`generate-indices.ts`**: Now outputs per-category `_INDEX.md` files alongside `index.json`.
- **Documentation rewrite**: Updated `ARCHITECTURE.md` (added ADR-003, ADR-004), `README.md` (restructured for readability and SEO), `cli/ARCHITECTURE.md` (added service details), `cli/README.md` (added output examples).

### Versions

- **CLI**: v2.1.0 (Minor — hierarchical resolution, three-tier triggers, new methods)
- **Root**: v2.1.0 (Minor — sync)
- **Angular Skills**: v1.4.0 (Minor — skill merge)
- **Common Skills**: v2.0.2 (Patch — description quality fixes)
- **All other categories**: Patch bumps (description quality fixes) — see metadata.json for individual versions.

## [2.0.1] - 2026-03-30

**Category**: Security Hardening & AI Learning Log System

### Added

- **🆕 `common/common-learning-log`**: New high-density skill for AI autonomous self-improvement. Defines a structured methodology for agents to capture mistakes, identify anti-patterns, and log better approaches to `AGENTS_LEARNING.md`. Integrated as a mandatory post-task retrospective loop.
- **🛡️ CI Injection Scanner**: Added `scripts/scan-injection.ts` and integrated it into the GitHub Actions CI pipeline. This scanner automatically flags any skill descriptions matching prompt injection patterns, preventing malicious instructions from entering the registry.
- **🚀 Enhanced Rate Limiting**: configured a custom `feedback` throttler profile in the NestJS backend, restricting the feedback endpoint to **3 requests per 60 seconds** while maintaining a global 10/min baseline.

### Changed

- **🛡️ `IndexGeneratorService` (CLI)**: Implemented `sanitizeDescription()` to strip instruction-hijack patterns (e.g., "ignore previous rules") from skill descriptions during index generation. Malicious patterns are replaced with `[REDACTED]` and logged to `stderr` with a `[SECURITY]` warning.
- **🛡️ `SkillSyncService` (CLI)**: Hardened `isPathSafe()` logic by explicitly using `path.sep` for boundary enforcement, successfully blocking sibling-directory traversal attacks (e.g., `/app/skills-secret`).
- **🛡️ `FeedbackService` (Backend)**: Implemented error masking for API responses. Internal GitHub API details are hidden from clients and replaced with a generic error message, while maintaining full diagnostic logs on the server.
- **🔄 `common/session-retrospective`**: Updated the retrospective protocol to include **Step 6: Update Learning Log**, ensuring agents record any correction loops from the current session.
- **📊 `metadata.json`**: Repaired `quality-engineering` metrics (5 skills, recalculated tokens) and added `quality-engineer` + `zephyr` keywords to `common/tdd` foundational rules.

### Versions

- **CLI**: v2.0.1 (Patch — security hardening & sanitization)
- **Common Skills**: v2.0.1 (Patch — new `common-learning-log`, retrospective update)
- **Quality Engineering**: v1.4.1 (Patch — added zephyr coverage analysis)
- **Root**: v2.0.1 (Patch — sync)

## [2.0.0] - 2026-03-25

**Category**: Community Skill Score Improvements & New Store Changelog Skill & QE/Security Skill Enhancements

### Added

- **🆕 `common/store-changelog`**: New skill for generating user-facing release notes for **Apple App Store** (≤ 4000 chars) and **Google Play Store** (≤ 500 chars). Includes a 5-step workflow (collect → triage → draft → compress → validate), per-store output format template, anti-patterns (`no chore bullets`, `no jargon`, `no character overrun`), commit-to-bullet mapping examples, and 4 evals. Triggers: `generate changelog`, `app store notes`, `play store release`, `what's new`, `release notes`.
- **📋 User Story Authoring Standards** (`quality-engineering-business-analysis`): Added §5 User Story Authoring Standards (story structure, atomic AC format, platform tags, toggle contracts, market isolation, scope fence, translation AC rules), §6 Anti-Patterns for story authoring, and §7 Validation Checklist (8-point self-check before marking a story ready). Added `references/user_story_template.md` with a full worked example and 3 new evals (IDs 4–6).
- **🛡️ Always-Apply Pattern** (`common/owasp`, `common/security-standards`): Hoisted the 3 most universal rules in each skill to a new `## Always-Apply Rules` block — applied on every code write, not just during dedicated security reviews. Remaining rules moved to `## Context-Specific Checklist` / `## Context-Specific Rules` with `Activate when:` prefaces.

### Changed

- **🏗️ `cli/src/constants/index.ts`**: Added `common-store-changelog` to `mobile` and `frontend` exclusion group lists. Added `common-system-design` to the `mobile` exclusion group.
- **🔢 Skill Scores** (community PR [#68](https://github.com/HoangNguyen0403/agent-skills-standard/pull/68) by [@rohan-tessl](https://github.com/rohan-tessl), commit `61c64ff`): Ran `tessl skill review` across all 234 skills — **average score lifted from ~82% to ~92%**. Top movers: `swift-error-handling` (0% → 89%), `common-observability` (60% → 94%), `common-best-practices` (61% → 89%), `nestjs-architecture` (81% → 100%). Key changes:
  - Replaced passive `"Standards for..."` descriptions with action-verb-led phrasing across all 234 skills.
  - Added missing `"Use when..."` clauses to all skills without them.
  - Added 1–2 inline executable code examples per skill (~150 skills), then extracted them to `references/` files for token economy.
  - Restructured flat bullet lists into numbered implementation workflows with validation steps (~150 skills).
  - Added anti-patterns sections where missing; linked related topics as proper relative paths.
  - Fixed `swift-error-handling` XML-like `<T,E>` tags in description that caused 0% validation score.
  - Added bold priority levels across Android skills.

### Versions

- **Common Skills**: v1.10.0 (Minor — new `common-store-changelog` skill, security Always-Apply pattern)
- **Quality Engineering**: v1.4.0 (Minor — User Story Authoring Standards + Validation Checklist)
- **All 234 framework skills**: Score-optimized via community PR #68 (patch-level description and content improvements)
- **CLI**: v2.0.0 (Major — constants update and framework bump)

<details>
<summary>Click to view versions 1.9.x and 1.10.x</summary>

## [1.10.4] - 2026-03-21

**Category**: CLI Fixes & Skill Registration Refactor

### Fixed

- **Skill Detection Registry**: Fixed an issue where the CLI failed to correctly exclude or detect skills because the `id` values in `SKILL_DETECTION_REGISTRY` did not match the actual folder names (missing framework prefixes).
- **Test Suite Alignment**: Synchronized the CLI test suite (`SkillService.spec.ts` and `ConfigService.spec.ts`) with the new prefixed skill ID format to ensure 100% test coverage and validation.

## [1.10.3] - 2026-03-21

**Category**: Extended Backend Hardening & New Tooling

### Added

- **New Skill (Golang Tooling)**: Added `golang-tooling` skill to standardize static analysis (golangci-lint), build tags, and benchmarking in Go projects.
- **Unified Skill Evals (Backend)**: Introduced comprehensive `evals.json` across all Golang, NestJS, and Spring Boot categories (30+ new eval files), providing specialized prompts and assertions for backend reliability.
- **Unified Skill Evals (Frontend/Mobile)**: Introduced `evals/evals.json` across all core categories (React, React Native, TypeScript, Android, Java, Kotlin, Flutter, Dart, iOS, Swift), providing 90+ concrete prompts and assertions for automated testing.
- **Progressive Disclosure (Phase 3)**: Extracted all large implementation details and code blocks into `references/` across React, React Native, TypeScript, Java, and Kotlin modules to optimize token economy.
- **Hardened Anti-Patterns**: Comprehensive update to `Anti-Patterns` sections across the entire library (with specific focus on Golang, NestJS, and Spring Boot) to prevent hallucinations and enforce idiomatic patterns.
- **Retrospective Schema**: Defined a structured `trigger_miss` JSON schema in `common-session-retrospective` to formalize how agents report and fix missing skill triggers.

### Changed

- **Standardized Anti-Patterns (PHP/Laravel/Next.js/Angular)**: Refactored `Anti-Patterns` section across PHP, Laravel, Next.js, and Angular skills for better AI enforcement.
- **Unified Skill Evals (Full Stack)**: Introduced `evals/evals.json` for PHP, Laravel, Next.js, and Angular categories (45+ new eval files).
- **Version Synchronisation (Web Frameworks)**: Incremented versions for core categories: PHP to `1.3.0`, Laravel to `1.3.0`, Next.js to `1.4.0`, and Angular to `1.3.0`.
- **Version Synchronisation (Backend)**: Incremented versions for core backend categories: NestJS updated to `1.4.0`, Golang to `1.3.0`, and Spring Boot to `1.3.0`.
- **Token Economy Mastery**: Refactored the heaviest skills (React, Next.js, Android, NestJS, Angular) to stay within optimized token budgets using the "Three-Level Loading System".
- **Trigger Optimization**: Significant update to `(triggers: ...)` descriptions for all frameworks to improve intent matching and reduce false negatives in IDE agents.
- **Metadata Synchronization**: Incremented skill category versions: Android/Java/Kotlin/iOS to `1.4.0`, React/TypeScript/Swift/Angular to `1.3.0`, and React Native to `1.4.0`.

### Fixed

- **Trigger Formatting**: Corrected backtick formatting for `flutter-localization` triggers in the main index.

### Versions

- **NextJS Skills**: v1.4.0
- **Laravel Skills**: v1.3.0
- **PHP Skills**: v1.3.0
- **Angular Skills**: v1.3.0
- **NestJS Skills**: v1.4.0
- **Golang Skills**: v1.3.0
- **Spring Boot Skills**: v1.3.0
- **React Skills**: v1.3.0
- **TypeScript Skills**: v1.3.0
- **React Native Skills**: v1.4.0
- **Android Skills**: v1.3.0
- **Java Skills**: v1.3.0
- **Kotlin Skills**: v1.3.0
- **iOS Skills**: v1.4.0
- **Swift Skills**: v1.3.0
- **Dart Skills**: v1.3.0
- **Flutter Skills**: v1.6.0
- **Common Skills**: v1.9.0
- **Quality Engineering**: v1.3.0

## [1.10.2] - 2026-03-16

- **Context Architecture Mastery**: Ultra-dense files (≤ 60 lines) that do not require external references can now achieve a perfect 10/10 score without needing dummy files.
- **Inline Triggers**: Validates the highly-optimized `(triggers: ...)` syntax in the description string instead of relying on legacy YAML arrays.
- **Skill Optimization**: Applied genuine "Progressive Disclosure" refactoring to the heaviest `SKILL.md` files (`database-postgresql`, `nextjs-pages-router`, `common-error-handling`, etc.) dropping maximum file sizes from ~900+ tokens to ~400 tokens by extracting code blocks into `references/`.
- **Skill Template**: Overhauled `skills/common/common-skill-creator/references/TEMPLATE.md` to enforce the new token-economy constraints (no YAML bloat, mandatory anti-patterns).

### Fixed

- **Custom Overrides Mapping**: Fixed a bug in `SkillSyncService` and `WorkflowSyncService` where `custom_overrides: ['skill-name']` in `.skillsrc` was failing to properly protect nested file paths.
- **Removed YAML Bloat**: Stripped all legacy `keywords:` and `files:` arrays across all 229 `SKILL.md` frontmatters.

---

## [1.10.0] - 2026-03-16

**Category**: Gemini CLI Standard Compliance & Refactoring

### Changed (All Skills)

- **🚀 Native Gemini CLI Compliance**: Migrated all 229 framework skills to strictly adhere to the official Gemini CLI `skill-creator` standard.
- **📁 Structural Renaming**: All skill subdirectories have been renamed to exactly match their canonical, hyphenated skill name (e.g., `skills/angular/architecture` → `skills/angular/angular-architecture`).
- **📝 Frontmatter Standardization**: Converted all `SKILL.md` YAML frontmatter `name:` fields to lowercase hyphen-case.
- **🔎 Trigger Flattening**: Extracted custom `metadata.triggers` arrays and seamlessly merged them into the single-line `description` string to ensure full native visibility by Gemini CLI without losing routing context.

### Fixed (CLI & Indexing)

- **🐛 Markdownlint Compliance**: Fixed missing whitespace on ATX headings, improper list spacing, and emphasis character (`_` vs `*`) violations inside `AGENTS.md` and the `IndexGeneratorService`.
- **📏 Description Length**: Bumped internal validation constraint for skill descriptions from 300 up to `1024` characters to align with Gemini's maximum limit.

## [1.9.3] - 2026-03-15

**Category**: Protocol Security & Refactoring Fixes

### Fixed (CLI)

- **⚡ `IndexGeneratorService` — Restored Protocol Header**: Reinstated the critical `[!IMPORTANT]` block at the top of the generated `AGENTS.md` to ensure agents always "Audit Before Write".
- **🔎 Framework Filtering**: Fixed a regression in `SyncService` where all skills were included regardless of `.skillsrc` config. The index now strictly filters based on the project's activated frameworks.
- **🐛 Frontmatter Parsing**: Fixed a fragile regex in the Markdown frontmatter parser to handle different line endings (`\r\n` vs `\n`).
- **🛡️ CLI Testing**: Rectified failing configuration and sync test suites by providing explicit mocks for `skills`.

### Changed (Skills — Common)

- **🛡️ `common/protocol-enforcement`**: Institutionalized the adversarial Red-Team verification skill by moving it from a hidden local directory to the global `skills/common` library.

### Changed (Skills — Flutter)

- **🖼️ `flutter/flutter-design-system`**: Enforced adherence to standard DLS widgets; explicitly banned the usage of generic widgets like `SizedBox` for spacing or hardcoded `Colors.xxx`, ensuring zero UI fragmentation.
- **🤖 `flutter/testing`**: Re-enforced the "Robot-First" testing pattern, mandating that screens and widgets utilize globally shared keys and explicitly defined Robot classes to isolate test logic from UI implementation details.

### Changed (Skills — NestJS)

- **📨 `nestjs/nestjs-bullmq`**: Upgraded Queue processor standards to prevent idle-polling storms and rate-limiting outages.
  - Required `drainDelay` and `stalledInterval` optimizations specifically for Upstash Redis.
  - Structured fail-open patterns for BaseProcessors and Throttlers.

### Versions

- **CLI**: v1.9.3 (Patch)
- **Common Skills**: v1.7.2 (Patch)
- **Flutter Skills**: v1.4.1 (Patch)
- **NestJS Skills**: v1.2.1 (Patch)

## [1.9.2] - 2026-03-08

**Category**: Trigger Rate Improvements — Stricter Pre-Flight Protocol & AGENTS.md Index Upgrade

### Changed (CLI)

- **⚡ `IndexGeneratorService` — Mandatory Action Table**: Replaced the passive "Reading This Index" section in the generated `AGENTS.md` index with a `[!CRITICAL]` blocking alert and a three-row trigger-type table. Each row explicitly states the **Required Action** (`Call view_file on the skill's SKILL.md`), making it structurally harder for agents to skip skill loading.
- **💡 Indirect Phrasing Hint**: Added a `[!TIP]` block in the index header with concrete intent-to-keyword examples ("make it faster" → `performance`, "broken query" → `database`, "login flow" → `auth`) so agents match by intent rather than exact wording.
- **🔒 `AgentBridgeService` — Strict Pre-Flight Protocol**: Updated the generated rule body (written to `.cursor/rules/*.mdc`, `.github/instructions/*.md`, `.agent/rules/*.md`, etc.) to the new Strict Pre-Flight Protocol format with a `[!CRITICAL]` blocking notice and an explicit 4-step checklist including exact tool calls.
- **🎯 Frontmatter Style**: Standardized single-quote glob syntax (`globs: ['**/*']`) in generated Cursor and Copilot rule frontmatter.

### Changed (Skills — Common)

- **🔄 `common/session-retrospective`**: Added **Trigger Miss** as a first-class root cause category. New step 3 "Trigger Miss Check" requires agents to explicitly ask _"Was a relevant skill available but not loaded?"_ after every session. Added structured `trigger_miss` JSON output block so misses can be aggregated to measure recall over time.

### Changed (Skills — Database & Composite Rules)

- **🌐 `foundational_composite_rules` (metadata.json)**: Added two new foundational anchors:
  - **`common/mobile-ux-core`** auto-injects into all `screen`, `page`, `view`, `activity`, `fragment` skills (Flutter, iOS, Android, React Native).
  - **`common/system-design`** auto-injects into `architecture`, `migration`, `microservices`, `background-work`, `clean-architecture` skills.

### Versions

- **CLI**: v1.9.2 (Patch)
- **Common Skills**: v1.7.1 (Patch)
- **Database Skills**: v1.1.1 (Patch)

## [1.9.1] - 2026-03-05

**Category**: Intermittent Fetch Failure & Framework Detection Fix

### Fixed (CLI)

- **🌐 Fetch Reliability**: Replaced Node's native `fetch` with `cross-fetch` in `GithubService` to resolve `TypeError: fetch failed` errors during `ags sync` on environments with strict IPv6 or DNS buffering (Node 18+ Vite bundle issue).
- **🔎 Framework Detection Accuracy**: Fixed `ConfigService.reconcileDependencies()` to accurately skip auto-detection of base frameworks (like `React`) if their core dependencies (`react`, `react-dom`) are missing, even when sub-skill dependencies (like `jest` for `testing`) are present. This prevents NestJS projects from incorrectly inheriting React skills.

### Versions

- **CLI**: v1.9.1 (Patch)

## [1.9.0] - 2026-03-04

**Category**: Universal Trigger-Rate Optimization & Skill-Creator Enhancement

### Changed (Skills — All Categories)

- **🎯 Pushy Descriptions (228 skills)**: Applied explicit `"Use when…"` trigger clause to every skill description across all 21 categories. Previously passive descriptions (e.g., "Standards for WorkManager and Background Processing") now include concrete activation contexts (e.g., "Use when implementing background tasks, scheduled work, or long-running operations in Android."), making agents more reliably activate the correct skill from the description alone.
- **🧪 `common/skill-creator`**: Improved to cover test generation, regression catching, and trigger-rate measurement & optimization:
  - Added **Test, Measure & Iterate** section with a 5-step validation workflow targeting ≥80% trigger accuracy.
  - Added 6 new trigger keywords: `test skill`, `eval skill`, `trigger rate`, `optimize description`, `skill regression`, `improve skill`.
  - New `references/testing.md`: Documents `evals/evals.json` schema, should-trigger / should-not-trigger query design, "pushy" description optimization (before/after examples), and regression-catching protocol.
  - Updated `references/lifecycle.md` Phase 4: validation checklist now requires eval cases and ≥80% trigger-rate target.

### Fixed (CLI)

- **🔀 `AgentBridgeService` Newline Bug**: Fixed `.join('\\n')` → `.join('\n')` so all generated rule files (`.cursor/rules/*.mdc`, `.github/instructions/*.md`, `.agent/rules/*.md`, etc.) now contain real line breaks instead of literal `\n` sequences. The entire rule body was previously collapsed into a single unformatted line, making the Skill Activation Protocol nearly unparseable by agents.
- **📋 Skill Activation Protocol**: Updated the generated rule body content with an explicit 4-step ordered checklist replacing the passive "ALWAYS consult AGENTS.md" instruction, ensuring agents follow a deterministic skill-loading sequence.

### Versions

- **Common Skills**: v1.7.0 (Minor — skill-creator enhancements, universal description improvements)
- **Framework Skills**:
  - **Android**: v1.1.0 (Minor)
  - **Angular**: v1.2.0 (Minor)
  - **Dart**: v1.1.0 (Minor)
  - **Flutter**: v1.4.0 (Minor)
  - **Golang**: v1.1.0 (Minor)
  - **iOS**: v1.2.0 (Minor)
  - **Java**: v1.1.0 (Minor)
  - **JavaScript**: v1.1.0 (Minor)
  - **Kotlin**: v1.1.0 (Minor)
  - **Laravel**: v1.1.0 (Minor)
  - **NestJS**: v1.2.0 (Minor)
  - **Next.js**: v1.2.0 (Minor)
  - **PHP**: v1.1.0 (Minor)
  - **Quality Engineering**: v1.1.0 (Minor)
  - **React**: v1.1.0 (Minor)
  - **React Native**: v1.2.0 (Minor)
  - **Spring Boot**: v1.1.0 (Minor)
  - **Swift**: v1.1.0 (Minor)
  - **TypeScript**: v1.1.0 (Minor)
  - **Database**: v1.1.0 (Minor)
- **CLI**: v1.9.0 (Minor)

**Category**: Agent Detection Restoration & Rule Integrity

### Fixed (CLI)

- **🛡️ Agent Detection**: Restored the logic to only generate rule files if an agent is actually detected in the project (e.g., `.cursor`, `.clauderules`, etc.). This prevents polluting projects with unused configuration folders.
- **🧪 Test Coverage**: Re-introduced and verified unit tests for agent detection skips and hits.

### Versions

- **CLI**: v1.8.2 (Patch)

</details>

<details>
<summary>Click to view versions 1.7.x and 1.8.x</summary>

## [1.8.1] - 2026-03-02

**Category**: Agent Bridge Dynamic Path Correction & Logic Optimization

### Fixed (CLI)

- **🔄 Dynamic Rule Links**: Fixed hardcoded `../skills/` links in generated agent rules. The self-learning protocol now uses a dynamically calculated relative path to the `/skills` folder, ensuring correct navigation for all agents (Cursor, Claude, Copilot, etc.).
- **🧹 Logic Optimization**: Removed redundant agent detection check in `AgentBridgeService` to improve performance and consistency.
- **🧪 Test Hardening**: Updated `AgentBridgeService.spec.ts` with specific assertions for dynamic pathing across different agent configurations.

### Versions

- **CLI**: v1.8.1 (Patch)

## [1.8.0] - 2026-03-02

**Category**: Common Skills Gap Closure & CLI Smart Exclusions

### Added (Skills)

- **♿ `common/accessibility`**: New P1 skill — WCAG 2.2 Level AA standards for web UI agents: semantic HTML, ARIA usage rules, keyboard navigation, color contrast ratios, and CI testing gate (`axe-core`). Scoped to frontend file patterns (`*.tsx`, `*.jsx`, `*.html`, `*.vue`, `*.component.html`).
- **📡 `common/api-design`**: New P1 skill — REST API conventions covering HTTP verb semantics, status code correctness, URL design, versioning strategy, cursor-based pagination, and OpenAPI 3.1 contract requirements. Scoped to controller/router/handler file patterns.
- **🛡️ `common/error-handling`**: New P1 skill — Cross-cutting error design standards: HTTP error response envelope, error classification by layer, wrapping vs. replacement rules, boundary placement, and error code naming. Scoped to service/handler/controller backend file patterns.
- **📊 `common/observability`**: New P1 skill — Backend observability standards: structured JSON logging (required fields), OpenTelemetry distributed tracing (W3C `traceparent`), metric naming conventions, SLO definitions, and correlation ID propagation. Scoped to backend service file patterns.
- **🧠 `common/session-retrospective`**: New meta-skill — Self-learning protocol for AI agents. At the end of any multi-step task with user corrections, the agent analyzes the conversation to detect skill gaps, missing rules, or violated standards, then proposes targeted skill improvements to prevent repeat rework. Includes `references/methodology.md`.
- **🛠️ `common/skill-creator`**: New meta-skill — Standards for creating new high-density agent skills with optimal token economy. Includes `references/TEMPLATE.md` (scaffold), `references/lifecycle.md` (review → publish flow), and `references/resource-organization.md` (when and how to use `references/` sub-files).
- **📐 `common/system-design` references**: Added `references/distributed-systems.md` (CAP theorem, consistency models, event-driven patterns) and `references/resilience-patterns.md` (circuit breakers, bulkheads, idempotency) — keeping the primary SKILL.md lean while providing depth.

### Changed (Skills)

- **🔧 Trigger Hardening**: Added file-glob triggers to `common/best-practices`, `common/security-standards`, `common/performance-engineering`, and `common/tdd` — these foundational skills now fire automatically on source file edits, not just keyword matches.
- **⚡ `common/performance-engineering`**: Elevated from P1 to P0 — performance regressions have direct business impact equivalent to security issues.
- **✅ `common/tdd`**: Expanded with minimum coverage threshold (80%), AAA (Arrange-Act-Assert) structure guidance, language-specific runner commands, and mock-vs-real dependency decision rules.
- **🌐 `AGENTS.md`**: Added conflict resolution protocol — when two skills conflict, apply the more specific skill (framework > language > common); same-specificity conflicts defer to `common/security-standards` for security and `common/best-practices` for design decisions.

### Fixed (Security)

- **🔐 `golang/security`**: Enforced Argon2id over bcrypt for password hashing — harmonized with `nestjs/security` for consistent polyglot security posture. Added explicit `RS256` / `HS256` JWT algorithm enforcement and `none` rejection.
- **🍪 `typescript/security`**: Fixed `NODE_ENV === 'prod'` (always `false` in production) → `NODE_ENV === 'production'` in secure cookie configuration, preventing cookies being transmitted over HTTP in production deployments.

### Changed (Framework Skills)

- **🧪 `flutter/testing`**: Major rewrite of testing skill and all references. Added `test-organization.md` (new), `widget-keys.md` (new), significantly expanded `robot-pattern.md`, `widget-testing.md`, `integration-testing.md`, and `mocking_standards.md` with up-to-date patterns.
- **🧪 `nestjs/testing`**: Added `improve-coverage.md` and `strict-typescript-testing.md` reference files. Updated `patterns.md` with additional test patterns.
- **⚛️ `react/state-management`**: Clarified skill boundary — `hooks` skill covers primitive API usage (`useMemo`, `useCallback`); this skill covers architectural state decisions (Context, Zustand, Redux). Added `useMemo` on context value guidance. Removed overlapping Anti-Patterns section.
- **🔐 `golang/security`**: Enforced Argon2id (time=1, memory=64MB, threads=4) over bcrypt. Added `RS256`/`HS256` JWT algorithm enforcement with `none` rejection for multi-service auth.
- **🍪 `typescript/security`**: Fixed `NODE_ENV === 'production'` cookie guard.

### Added (CLI)

- **📦 Framework-aware common skill exclusions**: `ags init` now auto-populates `common.exclude` in `.skillsrc` based on the detected framework type, eliminating irrelevant skills from agent context:
  - **Backend** (NestJS, Go, Spring Boot, Laravel): excludes `accessibility`, `mobile-animation`, `mobile-ux-core`
  - **Frontend** (React, Next.js, Angular): excludes `observability`, `mobile-animation`, `mobile-ux-core`
  - **Mobile** (Flutter, Android, iOS, React Native): excludes `accessibility`, `api-design`, `observability`
- **`getFrameworkType()` helper**: New exported function in `constants/` — classifies any framework ID into `'backend' | 'frontend' | 'mobile' | null`. Replaces inline nested ternary in `ConfigService`.
- **`FRONTEND_FRAMEWORKS`, `MOBILE_FRAMEWORKS` constants**: Explicit framework category arrays for React/Angular/Next.js and Flutter/Android/iOS/React Native respectively.
- **New tests**: `constants/__tests__/index.spec.ts` (5 tests for `getFrameworkType`); 9 new `ConfigService` tests covering exclusion correctness per framework type including edge cases (unknown framework, missing common metadata).

### Versions

- **Common Skills**: v1.6.0 (Minor — 6 new skills added)
- **Framework Skills**:
  - **Flutter**: v1.3.2 (Patch)
  - **Golang**: v1.0.4 (Patch)
  - **NestJS**: v1.1.4 (Patch)
  - **React**: v1.0.4 (Patch)
  - **TypeScript**: v1.0.7 (Patch)
- **CLI**: v1.8.0 (Minor)

## [1.7.3] - 2026-02-25

**Category**: Skill Optimization & Next.js Pages Router Support & Workflow Standard

### Added

- **⚡ Workflow Writing Standard**: New P0 skill (`common/workflow-writing`) to enforce conciseness and token efficiency in all registry files.
- **▲ Next.js Pages Router Support**: Added deep-dive standards for Redux and Zustand in legacy Pages Router environments.
- **📊 Benchmark Workflow v2**: Complete rewrite of the `/skill-benchmark` workflow—now framework-agnostic with auto-Trap selection and Skill Applicability Reporting.

### Changed (Skills)

- **⚛️ Redux/Zustand refs**: Standardized Next.js state management with official style guide patterns and hydration-safe hooks.
- **📈 Skill Applicability Report**: Added automated `.skillsrc` exclusion recommendations to the benchmark output.

### Versions

- **Common Skills**: v1.5.4 (Patch)
- **Framework Skills**:
  - **Next.js**: v1.1.3 (Patch)
- **CLI/Server**: v1.7.3 (Patch)

## [1.7.2] - 2026-02-25

**Category**: Workflow Robustness & CLI Sync Logic Hardening & Skill Standardization

### Added

- **🛡️ Workflow Lite Fallbacks**: Implemented logic in `codebase-review` to use basic grep/find patterns if specialized skills are missing, ensuring a baseline audit for all projects.
- **📚 Level 3 Reference Material**: Created `references/PATTERNS.md` and `references/REMEDIATION.md` for Architecture and Security audits, keeping primary skills lean.

#### Fixed (CLI v1.7.2)

- **🔄 Sync Logic Hardening**: Fixed `ags sync` to respect explicitly empty agent lists (`agents: []`) and skip workflow/skill discovery when Antigravity is disabled.
- **📦 Database Auto-Detection**: Fixed `ags init` to consistently detect database needs and auto-configure matching skills for NestJS, Go, and Spring Boot.
- **🛠️ Detection Persistence**: Resolved issue where skills excluded during init would sometimes reappear during sync incorrectly.

### 📊 Benchmark & Token Economy (v1.0.0)

- **📈 Performance Audit**: Launched the first official high-density benchmark, verifying **89% token savings** vs. traditional technical prompts.
- **📄 High-Density Report**: Created `benchmark-report.md` with per-category breakdowns, collapsible tables, and quality rubrics.
- **🛡️ Quality Rubric (0-10)**: Implemented a verifiable structural scoring system for all 220 skills in the registry.
- **💰 Cost Explainability**: Added models pricing comparison and monthly savings projections for enterprise scale.

### Changed (UX & Documentation)

- **🚀 README Integration**: Added "Efficiency & Benchmark" sections to root and CLI READMEs with visual "token occupancy" badges.

### Changed (Skills)

- **📐 Architecture Audit (v1.5.3)**: Standardized to Skill Creator format. Added deep-dive protocols for Web, Mobile, and Backend ecosystems.
- **🛡️ Security Audit (v1.5.3)**: Standardized to Skill Creator format. Added imperative adversarial probing protocols and remediations.
- **🗄️ PostgreSQL Database (v1.0.1)**: Improved metadata clarity and hardened migration audit guidelines.
- **🦁 NestJS Integration (v1.1.3)**: Enhanced trigger reliability and documentation consistency across all 21 modules.

### Versions

- **Common Skills**: v1.5.3 (Patch)
- **Framework Skills**:
  - **NestJS**: v1.1.3 (Patch)
- **Database Skills**: v1.0.1 (Patch)
- **CLI/Server**: v1.7.2 (Patch)

## [1.7.1] - 2026-02-24

**Category**: Skill Standardization & Feedback Loop Hardening & Battle-Test Workflow

### Added

- **🛡️ Battle-Test Workflow**: New automated workflow for comprehensive skill auditing against registry standards.
- **🔄 Feedback Loop Integration**: Mandatory Skill Feedback Sweep in `code-review` and `codebase-review` workflows.

### Changed (Skills)

- **⚡ Feedback Reporter (v1.5.2)**: Major overhaul. Reduced line count by 40% (<70 lines), hardened triggers, and added mandatory pre-completion gate.
- **📐 Global Architecture Standardization**: Standardized architecture skills across Android, iOS, Go, Spring Boot, Angular, and React Native.
- **🏗️ Content Depth Improvements**: Added specialized reference checklists for Android Compose, Go Testing, and Spring Boot Security.
- **🎯 Trigger Threshold Expansion**: Hardened activation triggers for `common/security-standards` and `quality-engineering/quality-assurance`.

### Changed (CLI v1.7.1)

- **📚 Documentation Update**: Achieved 100% JSDoc coverage for core services via `/update-docs` workflow.
- **🏗️ Service Hardening**: Improved `IndexGeneratorService` and `SkillValidator` robustness.

### Versions

- **Common Skills**: v1.5.2 (Patch)
- **Framework Skills**:
  - **Android**: v1.0.3 (Patch)
  - **Angular**: v1.1.1 (Patch)
  - **Golang**: v1.0.3 (Patch)
  - **iOS**: v1.1.1 (Patch)
  - **Next.js**: v1.1.2 (Patch)
  - **Quality Engineering**: v1.0.1 (Patch)
  - **React Native**: v1.1.1 (Patch)
  - **React**: v1.0.3 (Patch)
  - **Spring Boot**: v1.0.2 (Patch)
- **CLI/Server**: v1.7.1 (Patch)

## [1.7.0] - 2026-02-24

**Category**: Service Architecture Refactoring & Clean Code

### Changed (CLI v1.7.0)

- **🏗️ Core Services Refactoring**: Completely overhauled `SkillValidator` and `IndexGeneratorService` to align with the Single Responsibility Principle (SRP).
  - **Git Operations**: Extracted to `GitService` for centralized version control logic.
  - **Skill Discovery**: Extracted to `SkillDiscoveryService` to isolate file system traversal and filtering.
  - **Agent Bridging**: Extracted rule file creation (`.mdc`, `.instructions.md`) to `AgentBridgeService`.
  - **Markdown Injection**: Extracted content marker manipulation to a standalone `MarkdownUtils` utility.
- **📐 Validation Rule Pattern**: Replaced monolithic validation logic with a modular `ValidationRule` interface.
  - Implemented specific rule classes: `SizeRule`, `FrontmatterRule`, `InstructionsStyleRule`, `DirectoryStructureRule`, and `PriorityRule`.
- **🧪 Testing Enhancements**:
  - Created dedicated unit test suites for all new services.
  - Refactored existing tests to utilize Dependency Injection (DI) and robust mocking.
  </details>

<details>
<summary>v1.6.x History</summary>

## [1.6.7] - 2026-02-24

**Category**: Database Auto-Detection & Multi-Category Filtering

### Added (CLI v1.6.7)

- **🗄️ Database Skill Auto-Detection**: Automatically includes the `database` category when a backend framework (NestJS, Go, Laravel, or Spring Boot) is detected during `ags init`.
- **🔄 Multi-Category Dependency Management**: Refactored `ConfigService` to handle dependency exclusions and reconciliation across all enabled categories in a single pass.
- **📚 CLI Service Documentation**: Created comprehensive architectural documentation in `cli/src/services/README.md` to assist developers and AI agents.

### Changed (NestJS Skills v1.1.2)

- **🔄 CI/CD Migration Integration**: Updated database standards to include production-ready migration strategies via CI/CD pipelines.
  - Added explicit guidance for `migration:run` in pre/post-deploy jobs.
  - Standardized TypeORM Entity-to-Migration generation workflow.

### Changed (Common Skills v1.5.1)

- **🧹 General Maintenance**: Minor improvements to documentation and trigger consistency across common skill modules.

### Changed (CLI v1.6.7)

- **🧪 Unit Test Expansion**: Fixed and expanded `ConfigService` test suite to cover multi-category logic and auto-detection, achieving 100% path coverage for these features.

### Versions

- **CLI/Server**: v1.6.7 (Patch)

## [1.6.6] - 2026-02-19

**Category**: Flutter Design System & NestJS Testing Improvements

### Changed (Flutter Skills v1.3.1)

- **Adaptive Design System**: Added "Phase 0: Context Discovery" to validation logic.
  - Enforces checking `Theme.of(context)` before falling back to static tokens.
  - Prevents rigid token usage in adaptive theme environments.

### Changed (NestJS Skills v1.1.1)

- **Testing Standards**: Added explicit reference links to `testing/references/patterns.md` for extended mocking examples.

### Changed (CLI v1.6.6)

- **Index Bridging**: Refined rule generation logic in `IndexGeneratorService` to support consistent frontmatter injection across all agents.

### Versions

- **Common Skills**: v1.5.1 (Patch)
- **Framework Skills**:
  - **Flutter**: v1.3.1 (Patch)
  - **NestJS**: v1.1.2 (Patch)
- **CLI/Server**: v1.6.7 (Patch)

**Category**: Kiro IDE Support

### Added (CLI v1.6.6)

- **Support for Kiro IDE**: Added Kiro to the list of supported AI agents/IDEs.
  - Agent enum: `Kiro = 'kiro'`
  - Skills path: `.kiro/skills`
  - Steering file: `.kiro/steering`
  - Detection: `.kiro` directory

## [1.6.5] - 2026-02-07

**Category**: Index Robustness & Formatting & Skill Filtering

### Fixed (CLI v1.6.5)

- **🩹 Agent Index Duplication Fix**:
  - Implemented robust injection logic that cleans up corrupted or lone markers before re-injecting, ensuring IDempotency.
  - Added unit tests for marker cleanup edge cases.
- **✨ Enhanced Index Generation**:
  - Added support for `detailed` (3-column) and `compact` (2-column) formats.
  - Implemented project-level filtering for `AGENTS.md`: the index now only contains skill categories enabled in `.skillsrc`.
  - Fixed table header alignment and 3-column data mismatch.
- **🧹 Tech Debt & Linting**:
  - Resolved all lint errors in `generate-indices.ts` (removed `any` usage and unused variables).

## [1.6.4] - 2026-02-07

**Category**: Workflow Automation & E2E Verification Expansion

### Added (CLI v1.6.4)

- **🤖 Agent Workflows**: Added support for syncing executable workflows (`.md` files) from `.agent/workflows`.
  - Configurable via `workflows: true` in `.skillsrc`.
  - Automatically fetches and updates workflows from the registry.
- **✨ Enhanced CLI UX**:
  - `list-skills`: Added `--framework` flag for non-interactive filtering.
  - `sync`: Added `--yes` flag to bypass confirmation prompts.
- **🛡️ E2E Test Expansion**:
  - Expanded test suite to cover `list-skills`, `version`, `help`, and `validate` commands.
  - Added verification for workflow synchronization.
- **🐛 Bug Fixes**:
  - Fixed `ConfigService` schema validation to correctly accept the `workflows` property.

## [1.6.3] - 2026-02-07

**Category**: Documentation Governance & CLI/Server Hardening & Skillset Expansion

### Added (CLI v1.6.3)

- **📝 Documentation Governance**:
  - Implemented `docs:scan` specialized script to detect missing JSDoc documentation across CLI and Server codebases.
  - Integrated documentation coverage scanning into the CI pipeline via GitHub Actions.
  - Created `/update-docs` automated workflow for agentic documentation maintenance.
- **🛡️ Full Codebase Documentation**: Achieved 100% JSDoc coverage for both CLI (services, commands, models) and Server (modules, controllers, filters, interceptors).
- **🏗️ Architectural Hardening**:
  - Investigated and cleaned up `SyncService.ts`, removing the unused `syncedSkills` parameter and its corresponding test overhead.
  - Improved type safety across CLI models and command interfaces.

### Added (Registry v1.6.3)

- **🚀 Skillset Expansion**:
  - **iOS**: Introduced **SwiftUI** expert standards for modern iOS development.
  - **Angular**: Added **Component Patterns** with Signal-aware architecture guidelines.
  - **NestJS**: Expanded with **BullMQ**, **Notification**, and **Security Isolation** specialized modules.
  - **Common**: Integrated **Context Optimization** and **Product Requirements** engineering standards.
- **🧹 Cleanup & Refinement**:
  - **Flutter**: Modernized localization standards with `sheet_loader` integration. Removed legacy `navigator-v1` in favor of declarative routing.
  - **Global**: Recalculated token metrics for all 214 skills, maintaining < 70-line limit across the registry.

### Versions

- **Common Skills**: v1.5.0 (Minor)
- **Framework Skills**:
  - **Flutter**: v1.3.0 (Minor)
  - **NestJS**: v1.1.0 (Minor)
  - **Angular**: v1.1.0 (Minor)
  - **iOS**: v1.1.0 (Minor)
  - **Spring Boot**: v1.0.1 (Patch)
  - **Android**: v1.0.2 (Patch)
- **Language Skills**:
  - **Dart**: v1.0.4 (Patch)
  - **TypeScript**: v1.0.6 (Patch)
  - **Kotlin**: v1.0.1 (Patch)
- **CLI/Server**: v1.6.3 (Patch)

## [1.6.2] - 2026-02-01

**Category**: Hybrid Rule Injection & GitHub Copilot Optimization

### Added (CLI v1.6.2)

- **🚀 Hybrid Rule Injection**: Implemented a new "Discovery Pointer" strategy for agent rules.
  - Instead of prepending to existing rule files, the CLI now creates a dedicated `agent-skill-standard-rule.md` (or `.mdc`) in the agent's rules directory.
  - Standardized naming across all agents to avoid file pollution and conflicts.
- **🤖 GitHub Copilot Specialized Support**:
  - Automatically generates `.instructions.md` files in `.github/instructions/`.
  - Injects YAML frontmatter with `applyTo: "**/*"` for repository-wide skill discovery.
- **✨ Cursor & Antigravity Enhancements**:
  - Specialized YAML frontmatter for `.mdc` and `.agent` rules with `globs: ["**/*"]` and `alwaysApply: true`.
- **🛠️ Robust Rule Scoping**: Improved directory detection for rule targets, ensuring hidden folders (dots) are treated as directories, not files.

## [1.6.1] - 2026-02-01

**Category**: Skill Indexing Robustness & Bug Fixes

### Fixed (CLI v1.6.1)

- **🩹 AGENTS.md Indexing Fix**: Resolved a critical parsing bug in `SyncService.applyIndices` where skill IDs were incorrectly extracted from markdown table rows.
  - Corrected row splitting logic to skip leading pipe characters.
  - Added whitespace trimming for robust Skill ID matching against synced skills.
  - Verified across multiple frameworks (Flutter, NestJS, React).

## [1.6.0] - 2026-01-31

**Category**: Global Skill Compliance Audit & Progressive Disclosure Architecture & CLI Type-Safety

### Changed (⚡ Skill Registry v1.6.0)

- **⚖️ 100% Token Compliance** - Successfully refactored and compressed all 208 skills to meet the **< 70-line limit**:
  - **Progressive Disclosure**: Extracted heavyweight implementation patterns and code blocks into `references/` directories.
  - **Categories Audited**: Flutter, Android, iOS, React Native, Next.js, NestJS, and Common Skills.
- **🎨 Refined Mobile Patterns**:
  - **Common**: Integrated high-density animation and UX core guidelines.
  - **Flutter**: Optimized GetX navigation and state management triggers.
  - **React Native**: Modularized DLS, Deployment, and State Management patterns.
- **🛠️ Refined Backend Patterns**:
  - **NestJS**: Streamlined architecture and modularity standards.
  - **Next.js**: Enhanced rendering and data fetching guidelines for App Router.

### Changed (CLI v1.6.0)

- **⚡ Agent Activation Index (`AGENTS.md`)**: New high-density index generator that creates/injects a centralized skill manifest for 100% activation reliability in Cursor, Windsurf, and Claude Code.
- **🔗 Unified Semantic Triggering**: Logic to bridge native agent rule files (`.cursorrules`, etc.) to the `AGENTS.md` index using compressed metadata.
- **🛡️ Type-Safety Hardening**: Fixed critical `Agent` enum and `ConfigService` type mismatches.
- **📊 Optimized Metrics**: Improved token calculation accuracy and metadata synchronization.

### Versions

- **Common Skills**: v1.4.0 (Minor)
- **Flutter Skills**: v1.2.0 (Minor)
- **React Native Skills**: v1.1.0 (Minor)
- **Android Skills**: v1.0.1 (Patch)
- **iOS Skills**: v1.0.1 (Patch)
- **NestJS Skills**: v1.0.4 (Patch)
- **Next.js Skills**: v1.1.1 (Patch)

**Category**: Next.js 15/16 Vercel Standards Audit & Quality Engineering Expansion

### Added (Quality Engineering v1.0.0)

- **Comprehensive Release** - Introduced a new specialized category for high-density requirement analysis.
- **Business Analysis** - Standards for logic truth tables, domain modeling, and Jira user story parsing.
- **Zephyr Test Generation** - Automated test case creation from business requirements with impact analysis.
- **Jira Integration** - Operational standards for bi-directional requirement mapping.

### Changed (Next.js v1.1.0 - Major Audit)

- **Next.js 15/16 Alignment** - Integrated Vercel's latest best practices for Async APIs (`params`, `searchParams`, `cookies`, `headers`).
- **Cache Components** - Full integration of the `'use cache'` directive and Cache Component architecture.
- **Advanced Routing** - Standardized Parallel Routes, Intercepting Routes, and Suspense Bailout protocols.
- **Architectural Hardening** - New references for RSC Boundaries, Runtime Selection (Edge/Node), and Bundling.

### Changed (Common Skills v1.3.0)

- **TDD & Testing Hardening** - Split QA into QE, added explicit "Iron Laws" for TDD and testing anti-patterns.
- **Security Protocols** - Added dedicated reference for Injection Testing (SQLi/HTMLi).

### Changed (CLI v1.5.2)

- **`.skillsrc` Enhancement** - Improved initialization template with opt-in guidance for Quality Engineering skills.

</details>

<details>
<summary>v1.5.x History</summary>

## [1.5.1] - 2026-01-26

**Category**: Systematic Token Optimization & Adaptive Model Selection & Sub-Agent Delegation Protocol

### Added (Common Skills v1.2.4)

### Changed (Skill Registry v1.5.2)

- **⚡ Global Token Optimization** - Achieved **98.6% compliance** with the 70-line limit:
  - **Next.js Rendering**: Refactored (91 → 70 lines) using progressive disclosure (Strategy Matrix/Scaling Patterns).
  - **Removed Redundancy**: Deleted descriptions after Priority sections in Flutter, TS, JS, NestJS, and Common categories.
  - **Compressed Patterns**: Rewrote verbose anti-patterns into high-density imperative format.
- **🛡️ Enhanced Creator Standards** - Updated `skill-creator` with stricter formatting rules and progressive disclosure checklists.

### Changed (Infrastructure)

- **📊 Metrics Update** - Recalculated token fingerprints for all 191 skills (~76k tokens total).

**Category**: Enhanced Feedback Automation & Build-Time Configuration & PHP/Laravel Expert Standards & Next.js Expansion

### Added (Laravel Skillset v1.0.0)

- **Comprehensive Release** - 10 new high-density skills for modern Laravel 11.x/12.x development.
- **Clean Architecture** - Domain-Driven Design (DDD), Actions, DTOs, and Repository patterns.
- **Background Processing** - Expert standards for Queues, Jobs, Events, and Batching/Chaining.
- **Database Expert** - Advanced Query Builder, Redis caching, and Read/Write scalability.
- **Sessions & Middleware** - Hardened driver configuration and security header middleware.
- **Foundational Pillars** - Architecture, Eloquent, Security, API, Testing, and Tooling.

### Added (Next.js v1.0.2 - Skillset Expansion)

- **Testing** - New high-density module for Vitest, RTL, and Playwright for App Router.
- **Security** - New module for Server Action validation, Zod integration, and Data Boundaries (DTOs).
- **Tooling** - New module for Turbopack optimization, Standalone builds, and CI/CD best practices.

### Added (PHP Skillset v1.0.0)

- **Comprehensive Release** - 7 new high-density skills for modern PHP 8.x development.
- **Language & Features** - PHP 8.1+ patterns: Constructor promotion, Match expressions, Readonly properties, and Strict Typing.
- **Error Handling** - Modern Exception hierarchies (`Throwable`), Custom Exceptions, and PSR-3 logging standards.
- **Security** - Strict PDO prepared statements, Argon2id password hashing, and XSS/CSRF hardened patterns.
- **Concurrency** - Non-blocking I/O standards using Fibers and event-loop awareness.
- **Testing** - TDD standards for PHPUnit and Pest with advanced mocking patterns.
- **Best Practices** - PSR-12 coding standards, PSR-4 autoloading, and SOLID principles.
- **Tooling** - Dependency management (Composer), Static Analysis (PHPStan/Psalm), and Linting workflows.

### Added (CLI v1.5.1)

- **🚀 Build-Time Configuration** - Implemented Vite-based environment variable injection:
  - `FEEDBACK_API_URL` is now baked into the production bundle during build.
  - Zero-config usage for `npx` users while maintaining runtime overrides.
  - Migrated from `tsup` to `vite` for more robust Node.js SSR/Lib bundling.
- **🤖 Enhanced Feedback Automation** - Added new fields for 100% automated skill reporting:
  - `--skill-instruction`: Quotes the exact skill guideline violated.
  - `--actual-action`: Describes what the AI agent did instead.
  - `--decision-reason`: Captures the AI's rationale for deviation.
  - `--loaded-skills`: Tracks active skills at the time of the issue.

### Added (Common Skills v1.2.2)

- **Optimized Feedback Reporter** - Major refactor for token efficiency and detection logic:
  - **Self-Monitoring Protocol**: Added explicit instructions for AI agents to check adherence _before_ code execution.
  - **Observable Triggers**: Replaced generic triggers with specific behavioral patterns (e.g., 'deviated from loaded skill').
  - **Token Optimization**: 58% reduction in skill size while increasing actionable context.

### Infrastructure

- **Server-Side Compatibility** - Updated DTOs and Services to support the new automated feedback fields:
  - GitHub issues now display structured "What skill said" vs "What AI did" comparisons.
  - Conditionally formatted issue bodies for cleaner stakeholder triage.

## [1.5.0] - 2026-01-26

**Category**: Automated Feedback System & 100% Test Coverage & Build/Path Robustness

### Added (CLI v1.5.0)

- **`ags feedback` Command** - Integrated automated reporting for skill improvement:
  - Interactive prompts for skill ID, issues, and suggested improvements.
  - Automatic environment detection (loads `.env` via `dotenv`).
  - Zero-token-exposure proxy submission to Render.com backend.
- **🛡️ 100% Test Coverage** - Achieved absolute line coverage across all 13 CLI files.
- **🧭 Workspace-Aware Validation** - Improved `SkillValidator` to robustly detect project root.

### Fixed (CLI v1.5.0)

- **Command Visibility Fix** - Resolved issue where `feedback` and `validate` were missing from build.
- **Environment Discovery** - Added support for loading `FEEDBACK_API_URL` from local `.env`.

### Added (Common Skills v1.2.2)

- **Feedback Reporter Skill** - Specialized skill to guide AI agents in reporting their own performance:
  - Structured prompt injection for self-correction feedback loop.
  - Mandatory issue type categorization for faster triage.
  - Seamless integration with the `ags feedback` CLI component.

### Infrastructure

- **Cloud-Native Deployment** - Streamlined server architecture for Render.com:
  - Standalone Docker builds with script-injection protection (ignore-scripts).
  - Removal of redundant Nginx/Certbot boilerplate in favor of managed platform SSL.
  - Enhanced deployment automation via `server-v*` GitHub Action tags.

</details>

<details>
<summary>v1.4.x History</summary>

## [1.4.1] - 2026-01-23

**Category**: CLI Architectural Refactor & SOLID Principles Enforcement & Security Standards Consistency & React Native Support

### Added (CLI v1.4.1)

- **Test Suite Expansion** - Added 12 new test cases covering edge cases and error paths (166 total tests, up from 154).
- **Defensive Programming** - Added tests for recursion depth limits, error logging, and edge case handling.
- **🏗️ Architectural Overhaul** - Refactored all core CLI commands (`init`, `sync`, `list-skills`) to use **Dependency Injection (DI)**.
- **🛠️ New Service Layer** - Introduced specialized services to separate domain logic from CLI interaction:
  - `InitService`: Manages environment detection and bootstrapping logic.
  - `SyncService`: Centralized business logic for skill discovery and file projection.
  - `SkillService`: Unified logic for skill listing and status detection.
- **📦 Centralized Configuration** - Unified registry URL resolution and config building in `ConfigService`.
- **🧪 Enhanced Test Robustness** - Achieved near-perfect test quality and maintainability:
  - **DI-Mocking Pattern**: All command tests now use type-safe injection, removing `any` usage and private field manipulation.
  - **Zero Linter Errors**: Resolved all TSLint/ESLint issues in the test suite.
  - **100% Line Coverage**: Maintained across all core services and commands (221 total tests).
- **🛡️ Type Safety** - Enforced strict typing for CLI prompts and configuration assembly.

### Added (Golang Skills v1.0.2)

- **Security Expert Skill** - Comprehensive security standards covering:
  - `crypto/rand` vs `math/rand` enforcement
  - SQL injection prevention with parameterized queries
  - Password hashing (bcrypt/argon2)
  - JWT validation with algorithm enforcement
  - Secret management best practices
- **Reference Implementation** - Full code examples for security patterns in `references/implementation.md`.

### Added (React Native Skillset v1.0.0)

- **Comprehensive Release** - 10 new high-density skills for professional React Native development.
- **Architecture & Patterns** - Clean architecture, Component composition, and Hooks standards.
- **State & Navigation** - Modern state management patterns and React Navigation best practices.
- **Mobile Expertise** - Platform-specific logic (Native Modules), Security (Keychain), and Performance optimization.
- **DevOps** - Standardized Deployment workflows including CodePush integration.
- **Testing** - Comprehensive testing standards with React Native Testing Library and Jest.

### Added (Common Skills v1.2.1)

- **Feedback Reporter Skill** - Enables users and AI agents to report skill improvement opportunities:
  - Structured `@agent-skills-feedback` annotation format
  - Self-reporting protocol for AI when uncertain about guidance
  - Privacy-first design with opt-out controls
  - No telemetry or analytics collection
  - GitHub integration for community-driven skill improvements

### Fixed (Security Skills - All Frameworks)

- **Standardized Priority Labels** - All security skills now use consistent `## **Priority: P0 (CRITICAL)**` format.
  - Affected: Android, iOS, NestJS, Spring Boot, Common, TypeScript (7 skills)
- **Android Security Markdown** - Fixed malformed anti-patterns section with broken nested backticks.
- **Spring Boot JWT Validation** - Added explicit JWT algorithm validation guidance (reject `none` algorithm).
- **Flutter Obfuscation Caveat** - Added realistic expectations about obfuscation limits.
- **iOS Biometrics Phrasing** - Improved `canEvaluatePolicy(_:error:)` description.
- **Cross-References** - Added "Related Topics" linking all framework security skills to `common/security-standards`:
  - Flutter, React, NestJS, Android, iOS, Spring Boot, TypeScript, Angular, Next.js
- **Next.js Auth Links** - Simplified verbose reference link format.
- **React Hooks Example** - Changed to named function for better DevTools clarity.
- **README Emoji** - Fixed broken emoji character (� → 🌐).
- **Common Security** - Removed redundant subtitle (saved 12 tokens).

### Changed

- **Token Metrics Updated** - Recalculated for all 159 skills (64,003 tokens total).
  - Golang: 3,570 tokens (357 avg, largest: security 458 tokens)
  - Spring Boot: 3,405 tokens (up from 3,323 due to JWT additions)
  - Android: 5,282 tokens (up from 5,271 due to markdown fixes)

## [1.4.0] - 2026-01-23

**Category**: Dynamic Skill Re-detection & Multi-module Android Support

### Added (CLI v1.4.0)

- **🔄 Dynamic Skill Re-detection** - Automatically re-enables excluded skills if matching dependencies (Retrofit, Room, BLoC, etc.) are added to the project.
- **📂 Recursive Gradle Detection** - Scans sub-modules (up to 3 levels deep) to find dependencies in complex Android projects.
- **📦 Version Catalog Support** - Native parsing for `libs.versions.toml` files.
- **🏗️ Refactored Detection Logic** - Clean architecture implementation of dependency parsers using specialized strategies for better maintainability.
- **Maven Improvement** - Enhanced `pom.xml` detection and dependency parsing.

### Added (Android Native Skillset v1.0.0)

- **Comprehensive Release** - 19 high-density skills covering Modern (Compose) and Legacy (XML) development.
- **Paradigm Coverage** - UDF, Clean Architecture, Jetpack Compose, DI (Hilt), and Navigation standards.
- **Reliability** - Verified with automated Gradle/TOML dependency parsing logic.

**Category**: Spring Boot Expert Standards & Tooling with Enterprise & Production-Ready modules

### Added (Spring Boot Skillset (v1.0.0))

- **Architecture**: Domain-driven packaging, clean architecture rules, Record-based DTOs.
- **Best Practices**: Constructor injection, type-safe configuration (`@ConfigurationProperties`), structured logging.
- **Data Access**: JPA performance optimization (Solved N+1, Projections, EntityGraphs).
- **Testing**: Testcontainers with `@ServiceConnection` (Boot 3.1+), Slice Testing strategy (`@WebMvcTest`).
- **Security**: Spring Security 6 Lambda DSL, Hardening (CSRF/HSTS), Method Security.
- **Microservices**: Sync (Feign) vs Async (Cloud Stream), "Shared Library" contracts pattern.
- **Observability**: Micrometer Tracing (Correlation IDs), Structured JSON Logging.
- **Deployment**: GraalVM Native Images, Docker Layering (`bootBuildImage`), Graceful Shutdown.
- **Scheduling**: Distributed Locking using ShedLock, ThreadPool configuration.
- **API Design**: OpenAPI (Swagger), URI Versioning, RFC 7807 ProblemDetails.

**Category**: Kotlin Expert Standards & Tooling

### Added (Kotlin Skills v1.0.0)

- **Modern Kotlin Core** - 4 new high-density skills covering Kotlin 1.9+ features (Null Safety, Extensions, Scope Functions).
- **Coroutines & Flow** - Structured Concurrency standards (`viewModelScope`, `StateFlow`) and anti-patterns.
- **Best Practices** - Backing Properties, Immutability, and Functional patterns.
- **Tooling** - Gradle Kotlin DSL (`.kts`), Detekt, and MockK integration.

**Category**: Java Expert Standards & Meta-Workflow Creation

### Added (Java Skills v1.0.0)

- **Modern Java Core** - 5 new high-density skills covering Java 21+ features (Records, Pattern Matching, Text Blocks).
- **Virtual Threads & Concurrency** - Full support for Project Loom and Structured Concurrency patterns.
- **Testing & Assertions** - Standardized usage of JUnit 5 and AssertJ with Mockito integration templates.
- **Tooling & Build** - Best practices for Maven and Gradle (Kotlin DSL) with version management.
- **Meta-Workflow** - Added `create-skillset` workflow to standardize future framework additions.

### Changed

- **Dart (v1.0.3)**: Added explicit Access Modifier guidance (library-private prefix).
- **TypeScript (v1.0.3)**: Added explicit Access Modifier guidance (private/protected and #private).
- **JavaScript (v1.0.1)**: Added explicit Access Modifier guidance (#private fields).

</details>

<details>
<summary>v1.3.x History</summary>

## [1.3.2] - 2026-01-22

**Category**: Angular Expert Standards & Modern v17+ Patterns

### Added (Angular Skills v1.0.0)

- **Modern Angular Core** - 14 new high-density skills covering Angular v17+ features.
- **Signals & State** - Full transition to `signal()`, `computed()`, and `effect()` patterns with Signal Store integration.
- **Standalone API** - Strictly Enforced Standalone components, pipes, and directives (elimination of legacy `NgModule`).
- **New Control Flow** - Standardized usage of `@if`, `@for`, and `@switch` syntax.
- **Functional Patterns** - Migration to `HttpInterceptorFn`, `CanActivateFn`, and `inject()` based DI.
- **Performance & Defer** - Native support for `@defer` views, `OnPush` detection, and `NgOptimizedImage`.
- **SSR & Hydration** - Hydration-ready standards with `TransferState` and platform-aware lifecycle hooks.
- **Testing Harnesses** - Standardized `ComponentTestHarness` and `TestBed` provider mocking patterns.
- **Strict Coding Standards** - Enforced file size limits (<400 lines) and function length (<75 lines) for cleaner architecture.

**Category**: Golang Expert Standards & Clean Architecture

### Added (Golang Skills v1.0.0)

- **Comprehensive Golang Registry** - Added 9 new high-density skills for professional Go development.
- **Clean Architecture & DDD** - Enterprise-ready standards for domain-driven design and hexagonal project layouts.
- **Idiomatic Go & Style** - "Effective Go" inspired guidelines for naming, interface design, and constructors.
- **Robust API Design** - Middlewares, routing (stdlib/Echo), and graceful shutdown patterns.
- **Advanced Concurrency** - Safe goroutine management, channel patterns, and deep `context` integration.
- **TDD & Mocking** - Table-driven tests, parallel execution, and dependency-inversion-based mocking strategies.
- **Structured Database & SQL** - Repository patterns, connection pooling, and `sqlc` readiness.
- **Observability & Logging** - Standardized `log/slog` patterns for structured, leveled logging.
- **Strict Error Handling** - idiomatic error wrapping, sentinel errors, and unwrapping patterns.

**Category**: QA Engineering, TDD & Debugging Standards

### Added (Common Skills v1.2.0)

- **TDD Expert Skill** - Strict Red-Green-Refactor cycle enforcement with AAA (Arrange-Act-Assert) pattern and F.I.R.S.T. principles.
- **Debugging Expert Skill** - Evidence-based troubleshooting using the **Scientific Method** (Observe -> Hypothesize -> Experiment -> Fix).
- **Bug Report Template** - Standardized template for reproducible and high-context bug reporting.
- **Test Pyramid Integration** - Explicit standards for Unit (70%), Integration (20%), and E2E (10%) testing levels.
- **Risk-Based Testing** - Prioritization strategies targeting critical business paths and data integrity.

### Updated (Common Skills v1.2.0)

- **Code Review Refinement** - Standardized review request template and integrated implementation planning phase into the workflow.
- **Quality Assurance** - Refactored to remove redundant TDD cycles and bridge coverage with dedicated skills.

## [1.3.1] - 2026-01-22

**Category**: Content-Level Optimization & Token Economy Guardrails and Workflow Automation & Code Review Standards

### Added (CLI v1.3.1)

- **Token Measurement Engine** - New `calculate-tokens` script to automate character-based token estimation across all skills.
- **Metadata Automation** - Integrated `token_metrics` into `metadata.json` for real-time tracking of skill efficiency.
- **100% Comprehensive Testing**: Achieved 100% statement coverage across all core services using Vitest.
- **Registry Guard Tests**: Data-driven test suite for `SKILL_DETECTION_REGISTRY` to ensure logic stability as detection rules evolve.
- **CI/CD Enforcements**: Updated GitHub Actions to strictly enforce 90%+ code coverage on every pull request.
- **Smart Release Workflow** - Unified automation for versioning, changelog generation, and README updates.
- **Improved Pattern Detection** - Refined `SkillValidator` to ignore code blocks and precisely target conversational instructions.
- **Centralized Registry** - Introduced `DEFAULT_REGISTER` for better maintainability and environment flexibility.

### Add & Updated (Common Skills v1.1.3)

- **Code Review Expert** - Principal Engineer standard for high-quality, readable AI code reviews. Supports universal logic with framework context awareness.
- **Enhanced skill-creator** - Added strict size limits (≤70 lines), anti-patterns for redundancy, and a pre-release validation checklist.
- **Compressed System Design** - Refined universal architecture guidelines with 10% higher density.
- **Unified Best Practices** - Removed redundant descriptions and standardized imperative format.

### Updated (Framework Skills v1.0.2)

- **NestJS Security** - Significant optimization (90 → 57 lines) via progressive disclosure. Extracted complex implementation code to `references/implementation.md`.
- **React State Management** - Reduced context window footprint by 26% by moving redundant codebase examples to references.
- **TypeScript Best Practices** - Applied imperative compression to naming and function standards, reducing line count by 30%.

### Fixed

- **Type Safety**: Resolved numerous TypeScript `any` types and linting errors for a more stable developer experience.
- **Mocking Reliability**: Replaced brittle file system and network mocks with more resilient, implementation-aware alternatives.
- **Framework Detection**: Fixed edge cases in missing dependency exclusions for Flutter and NestJS.
- **Improved Stability**: Fixed `GITHUB_BASE_REF` fallback logic for GitHub Actions environments.
- **Async Consistencies** - Migrated `calculate-tokens` script to `fs-extra` for non-blocking I/O alignment.
- **Validation Accuracy** - Reduced false positive warnings in skill validation for valid conversational comments.

### Changed

- Migrated from legacy testing patterns to Vitest for faster execution and better developer tooling.

## [1.3.0] - 2026-01-21

**Category**: High-Density Standards & CLI Architecture Refactor

### Added (Common Skills v1.1.0)

- **Enhanced Skill Creator** - Major improvements with three-level loading system (Core, Examples, Resources) and lifecycle documentation.
- **Architecture References** - Added comprehensive templates and lifecycle guides for skill developers.
- **Service Refactor** - Migrated universal architecture guidelines to standard modules.

### Updated (Framework & Language Skills)

- **Flutter Skills (v1.1.1)** - Refined BLoC, GetX, and Riverpod patterns with enhanced triggers and modular references.
- **Dart Skills (v1.0.2)** - Updated best practices and language patterns for better agent decision masking.
- **TypeScript/React Skills (v1.0.1)** - Enriched type-safety standards, hooks documentation, and security best practices.
- **NestJS Skills (v1.0.1)** - Major update to skill triggers (v1 & v2) across all 18 enterprise modules for precise agent activation.
- **Next.js Skills (v1.0.1)** - Improved App Router and RSC guidelines with optimized token economy.

### Changed (CLI v1.3.0)

- **Service-Based Architecture** - Fully migrated CLI commands to a modular service pattern (`DetectionService`, `RegistryService`, `GithubService`, `ConfigService`) for better maintainability and testability.
- **Improved Skill Discovery** - Integrated `GithubService` for more robust remote skill listing and metadata fetching.
- **Simplified Configuration (Breaking)** - Removed the redundant `enabled` flag. The CLI now follows a "Presence = Active" pattern for skills in `.skillsrc`.
- **Enhanced Validation** - The `validate` command now performs deeper structural checks and token efficiency analysis.

### Fixed (CLI v1.3.0)

- **CLI Validation Fix** - Corrected the `validate` command to properly use `node` for execution across different environments.
- **Dependency Exclusions** - Refined the initial configuration logic to better exclude unnecessary sub-skills based on project dependencies.

</details>

<details>
<summary>v1.2.x History</summary>

## [1.2.0] - 2026-01-20

**Category**: Universal "Common" Skills & Windsurf Support

### Added (Common Skills v1.0.0)

Major expansion of framework-agnostic standards to ensure high-quality software engineering across all languages.

- **Universal Common Category** - Added 7 new universal skill modules that apply to any framework/project.
- **Security Standards** - Zero Trust architecture, Least Privilege access, and Injection prevention (SQL/XSS) guidelines.
- **Performance Engineering** - Resource management (Memory/CPU), Network I/O optimization, and UI virtualization standards.
- **System Design & Architecture** - SoC (Separation of Concerns), Loose Coupling, DIP, and clean architecture implementation logic.
- **Best Practices (Enriched)** - Added Guard Clauses, Naming Conventions, and Modular Design standards.
- **Documentation Standards** - Code comments, READMEs, Architecture Decision Records (ADRs), and API documentation guidelines.
- **Quality Assurance (Enriched)** - Integrated Red-Green-Refactor TDD cycle and PR feedback standards.
- **Git & Collaboration (Enriched)** - Mandatory high-density **Git Rebase** and linear history workflows.
- **Reference Repository** - Added heavyweight code examples for all common skills in lazy-loaded `/references` subfolders where applicable.

### Added (CLI v1.2.0)

- **Windsurf Support** - Full support for the **Windsurf** agent with auto-detection of `.windsurf` and `.windsurfrules`.
- **Auto-Common Sync** - `ags init` now automatically includes the `common` skill category for all new projects.
- **Token Optimization Report** - Added `EFFECTIVENESS.md` documenting the verifiable **4-10x token savings** of the high-density standard.

### Changed (CLI v1.2.0)

- **Architecture Refactor** - Migrated `InitCommand` to a service-based architecture (`DetectionService`, `RegistryService`, `ConfigService`) following SOLID principles for better maintainability.
- **Simplified Configuration** - Removed the redundant `enabled: true/false` flag from `.skillsrc`. The CLI now follows a "Presence = Active" pattern for skills.
- **Improved Initialization** - Enhanced sub-skill detection logic to automatically populate the `exclude` list for parent frameworks, giving users clearer visibility and control.
- **Centralized Universal Skills** - Implemented `UNIVERSAL_SKILLS` registry to ensure global standards (like `common`) are consistently applied across all framework types.
- **Enhanced Skill Creator** - Major improvements to the `skill-creator` skill with token-optimized guidelines, three-level loading system, comprehensive lifecycle documentation, and resource organization strategies inspired by Anthropics' best practices.
- **Skill Validation System** - Added `validate` command to CLI with automated checks for token efficiency, format compliance, and structural integrity. Integrated into CI pipeline to ensure quality standards.

</details>

<details>
<summary>v1.1.x History</summary>

## [1.1.2] - 2026-01-19

**Category**: Flutter Skill Expansion & CLI Refinement

### Added (Flutter Skills v1.1.0)

Major expansion of the Flutter ecosystem with new reactive patterns, legacy support, and automation.

- **GetX State Management** - Reactive patterns (`.obs`), `Obx`, `GetxController`, and `Binding` lifecycle standards.
- **GetX Navigation** - Context-less routing, `GetMiddleware` guards, and centralized `AppPages` configuration.
- **Riverpod 2.0 State Management** - Reactive patterns using `riverpod_generator`, `AsyncNotifier`, and strict immutable models with `freezed`.
- **Testing Standards** - Comprehensive guidelines for Unit, Widget (Robot Pattern), and BLoC testing using `mocktail` and `bloc_test`.
- **Localization (easy_localization)** - Standardized JSON-based translation, `.tr()` extension usage, and plurals.
- **Google Sheets Automation** - Integration with `sheet_loader_localization` to sync translations from remote sheets to local assets.
- **Navigator v1** - Legacy/Imperative routing support with `onGenerateRoute` and `RouteSettings` extraction.
- **Equatable Integration** - Added `Equatable` as a lightweight state-comparison alternative to `freezed` when code generation is not preferred.

### Changed (Flutter Skills v1.1.0)

- **State Management Priority** - Established hierarchy: `freezed` is prioritized for complex apps, while `Equatable` is recommended if the library is present in `pubspec.yaml`.
- **Reference Expansion** - Added detailed code references for all new patterns (Bindings, Middleware, Sheet Loaders).

### Added (CLI v1.1.2)

- **Auto-Detection for GetX** - CLI now detects `get` dependency and auto-enables GetX state/nav skills.
- **Auto-Detection for Localization** - CLI now detects `easy_localization` and enables the localization skill.
- **Navigator v1 Default** - Added basic Navigator v1 detection for all Flutter projects.

### Fixed (CLI v1.1.2)

- **Node.js ESM Conflict** - Resolved `ERR_REQUIRE_ESM` by downgrading `inquirer` to v8 for CommonJS compatibility. (Fixes [#11](https://github.com/HoangNguyen0403/agent-skills-standard/issues/11))

## [1.1.1] - 2026-01-18

**Category**: Fullstack Framework (Next.js) & CLI Improvements

### Added (CLI v1.1.1)

- **Smart Initialization** - Automatically includes `react` skill when initializing `Next.js` or `React Native` projects.
- **Internal Refactor** - Migrated framework and agent identifiers to Enums for better type safety and extensibility.
- **New Agents** - Added support for **Gemini**, **Roo Code**, and **OpenCode**.

### Added (Next.js Skills v1.0.0)

Comprehensive guide for App Router architecture and React Server Components.

- **App Router** - File conventions (`layout`, `loading`, `error`), Route Groups, and Dynamic Routes.
- **Architecture (FSD)** - Feature-Sliced Design adapter for Next.js (App -> Widgets -> Features -> Entities), including "Excessive Entities" prevention rules.
- **Server Components** - "use client" directives, composition patterns, and serialization boundaries.
- **Data Fetching** - Extended `fetch` API, Caching strategies (`force-cache`, `no-store`), and ISR patterns.
- **Server Actions** - Progressive forms, mutations, and `useFormStatus` hooks.
- **Rendering Strategies** - Static (SSG), Dynamic (SSR), Streaming, and Partial Prerendering (PPR).
- **Data Access Layer** - Security boundaries, DTO transformation, and API Gateway BFF patterns.
- **State Management** - Best practices for Granular State, URL-driven state, and avoiding global stores.
- **Internationalization (i18n)** - Middleware redirection, Sub-path routing (`[lang]`), and Type-safe dictionaries.
- **Authentication** - HttpOnly Cookie pattern (vs LocalStorage) and Middleware protection.
- **Styling & UI** - Zero-runtime CSS (Tailwind), RSC compatibility, and `clsx`/`tailwind-merge` patterns.
- **Caching Architecture** - The 4 Layers (Memoization, Data Cache, Full Route, Router) and `unstable_cache` patterns.
- **Optimization** - Core Web Vitals monitoring, built-in components, and Metadata API.

## [1.1.0] - 2026-01-18

### Added (NestJS Skills v1.1.0)

Includes 18 specialized High-Density skills for Enterprise Backend Development.

- **Architecture Standards** - Module organization, Dependency Injection (`ConfigurableModuleBuilder`), and Project Structure.
- **Database & Scaling** - Selection Framework (Postgres vs Mongo), Connection Multiplexing (PgBouncer), and Sharding strategies.
- **Real-Time & WebSockets** - Decision matrix for WebSockets vs SSE vs Long Polling, and Redis Adapter scaling.
- **Security Hardening** - JWT best practices, CSRF, Helmet, Rate Limiting, and key rotation.
- **Microservices Transport** - gRPC for internal, RabbitMQ/Kafka for events, and Monorepo contracts standard.
- **Search & CQRS** - ElasticSearch integration patterns and dual-write prevention.
- **Performance Tuning** - Fastify adapter default, Compression, and Scope management.
- **Observability** - Structured Logging (Pino) and Prometheus metrics standards.
- **Deployment** - Docker multi-stage builds and Kubernetes graceful shutdown hooks.

**Category**: Web Stack Skills (React, TypeScript, JavaScript) & CLI Infrastructure

### Added (Web Stack)

#### React Skills (v1.0.0)

- **component-patterns** - Composition, Error Boundaries, and modern syntax.
- **hooks** - Custom hook standards and dependency management.
- **performance** - Optimization strategies (RSC, Suspense, Virtualization).
- **security** - XSS prevention and clean auth patterns.
- **state-management** - State colocation and server-state handling.
- **testing** - User-centric testing with Vitest/RTL.
- **tooling** - Debugging and profiling workflows.
- **typescript** - Strict typing for Props, Refs, and Events.

#### TypeScript Skills (v1.0.0)

- **best-practices** - Code organization and naming conventions.
- **language** - Advanced types, generics, and strict mode usage.
- **security** - Type-safe validation and secure data handling.
- **tooling** - Configuration for ESLint, testing, and builds.

#### JavaScript Skills (v1.0.0)

- **best-practices** - Modern ES patterns and error handling.
- **language** - Async flows, modules, and functional patterns.
- **tooling** - Environment setup and linting standards.

### Improved (CLI v1.0.5 - v1.1.0)

#### Features & Agents

- **Trae Support**: Added first-class support for `Trae` agent (`.trae/skills` and auto-detection).
- **Smart Detection**: Enhanced framework logic to scan `package.json` dependencies (React, NestJS, Next.js, React Native).
- **Nested Structure**: Migrated to scalable nested folders (e.g., `skills/flutter/bloc` vs `skills/flutter-bloc`).
- **Short Alias**: Added `ags` command for quicker CLI access.

---

</details>

<details>
<summary>v1.0.x History</summary>

## [1.0.0] - 2026-01-15

**Category**: Flutter Framework Skills & Dart Programming Language Skills

### Added (Flutter & Dart)

#### Flutter Skills (13 categories)

- **auto-route-navigation** - Type-safe routing, deep links, and guards.
- **bloc-state-management** - Enterprise-ready patterns for business logic.
- **dependency-injection** - Decoupled component management with GetIt.
- **error-handling** - Functional error mapping and resilience.
- **feature-based-clean-architecture** - Scalable domain-driven directory structures.
- **go-router-navigation** - Modern declarative navigation.
- **idiomatic-flutter** - Community best practices and syntax.
- **layer-based-clean-architecture** - Separation of concerns (UI, Domain, Data).
- **performance** - Optimization strategies for high-frame-rate apps.
- **retrofit-networking** - Type-safe API integration and token management.
- **security** - Secure storage, PII masking, and network security.
- **testing** - Unit, BLoC, and Widget testing standards.
- **widgets** - Component decomposition and reusable UI blocks.

#### Dart Skills (3 categories)

- **best-practices** - Idiomatic code patterns and SOLID principles.
- **language** - Advanced syntax, null-safety, and type system.
- **tooling** - Static analysis, linting, and environment setup.

#### Infrastructure

- **.skillsrc** - Version configuration for sync workflow
- **SYNC_WORKFLOW.md** - Documentation for version management from registry
- **README.md** - Repository overview and usage instructions
- **CHANGELOG.md** - Version history tracking

### Content Sources

- dart_code_metrics rules (331 common, 57 Flutter, 22 BLoC)
- Vercel react-best-practices pattern (priority-driven organization)
- OWASP Mobile Top 10 (2024) security standards

### Structure

- Priority-driven organization (P0/P1/P2) for Flutter skills
- Consolidated structure: `flutter/` and `dart/` directories
- Granular categorization based on domain and impact
- Progressive disclosure with main SKILL.md files
- Version sync support via .skillsrc configuration

---

**Maintainer**: Hoang Nguyen  
**Registry**: <https://github.com/HoangNguyen0403/agent-skills-standard>

</details>
</details>
