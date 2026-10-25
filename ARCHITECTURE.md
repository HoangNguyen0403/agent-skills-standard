# Architecture & Design Records

This document captures the high-level design, data flow, and key decision records for the `agent-skills-standard` CLI.

## 1. System Overview

The system consists of three main components:

1. **Registry**: A Git repository (or local folder) containing skill definitions (`SKILL.md`) and metadata (`metadata.json`).
2. **CLI**: The setup/sync/validate tool that fetches, validates, and syncs these skills to a project.
3. **Local Project**: The user's codebase where skills and workflows are installed in each agent's native format.

### Data Flow

```mermaid
graph LR
    R[Registry GitHub] -->|Sync Command| C[CLI Tool]
    C -->|1. Fetch & Filter| S[SkillSyncService]
    S -->|2. Write SKILL.md| L[Local .<agent>/skills/]
    L -->|3. Generate _INDEX.md| IDX[Per-Category _INDEX.md]
    IDX -->|4. Generate Router| A_MD[AGENTS.md Router Table]
    A_MD -->|5. Bridge Rules| B[Agent Rule Files]
    A_MD -->|Read Router| AI[AI Agent]
    AI -->|Read _INDEX.md| IDX
    IDX -->|Match Triggers| SK[Load SKILL.md]
```

### Hierarchical Skill Resolution (v2.1+)

AI agents follow a three-step lookup:

1. **AGENTS.md** (~20 lines) — router table maps file extensions to category `_INDEX.md` files.
2. **`_INDEX.md`** (~10-15 lines per category) — tiered trigger table with File Match and Keyword Match sections.
3. **`SKILL.md`** — loaded on-demand only when triggers match.

This replaces the previous flat index (all skills in one list) and reduces scan cost from O(n) to O(1).

MCP routing keeps high-collision framework topics in qualified trigger phrases
(for example `React profile`, `state in React`, and `SwiftUI @State`). Keyword
inputs must equal or contain the complete declared trigger at word boundaries;
bare words do not satisfy a qualified phrase through reverse containment.
Routing does not assemble arbitrary separated words into a phrase match.
Next.js DAL file triggers identify `lib/data.ts` or a `dal/**` directory, not
generic `services` directories. Matcher/body-return evidence establishes
selection in that MCP session, not delivery of complete standards to another
worker.

The MCP consultation ledger is process-local. Catalog discovery is separate
from returned skill, workflow, and category-guide bodies; unique session totals
and per-call count-only telemetry are different measurements. Audit/cost output
does not certify edits, executed checks, enforcement, or outgoing worker-body
delivery. Those require evidence at the actual host/runtime boundary.

Skill delivery is request-scoped: every matched skill body is read at request
time and returned in full, so a parent's or sibling's earlier consultation can
never suppress another context's instructions and an edited `SKILL.md` is
re-read on the next call. The ledger records `selected` ids, the bodies actually
returned (`loaded`), repeat-inclusive `bodyReturnCount` and per-body SHA-256
digests; it no longer reports deduplicated bodies or estimated token savings.
The `force_reload` request option was removed with the process-global
suppression it existed to bypass. A stored digest identifies content; it is not
an acknowledgment, comprehension or enforcement signal.

## 2. Multi-Agent Compatibility (The "Integration Taxonomy")

This project maintains a standardized bridge for multiple AI agents, each with varying levels of native support for hooks and context injection. The canonical per-agent capability matrix is maintained in `cli/src/capabilities/agentCapabilities.ts` and generated to [docs/agent-capabilities.md](docs/agent-capabilities.md).

Each capability entry also declares a delegation surface kind — `native-agent`, `instruction-only` or `none` — and, for native surfaces, a stable surface id (`claude-code-subagents`, `codex-subagents`, `gemini-cli-subagents`, `copilot-custom-agents`, `opencode-agents`). Runtime support is a separate, version- and revision-scoped result: an operation is `supported` only with retained live execution evidence for that host, surface, version, revision and operation that exercised every required control; missing, revision-mismatched or fixture-only evidence is `not_verified`; a host without a delegation artifact is `unsupported`. Emitting a serialized definition is not evidence of spawn, resume, cancel, artifact access, permission enforcement or usage capture. Copilot native agents are written as `.github/agents/<name>.agent.md`; the older broad `applyTo` instruction files are a different surface and are never presented as runnable subagents. Gemini agent files project a declared native `tools` list verbatim, including an explicit empty list, and do not translate universal `allowed-tools` names. OpenCode agent files are native subagent definitions whose declared restrictions are disclosed rather than projected. Claude and Copilot project only catalogued tool names; Codex inherits the parent sandbox policy and discloses declared controls instead of emitting an ineffective projection.

| Agent / Tool        | Integration Strategy       | Primary Hook/Config                      | Scope        |
| :------------------ | :------------------------- | :--------------------------------------- | :----------- |
| **VS Code Copilot** | **Prompt Instructions + Native Agents** | `.github/instructions/*.instructions.md`, `.github/agents/*.agent.md` | Session/Project |
| **Cursor**          | **MCP + Rules**            | `hooks.json` / `.cursor/rules/`          | Project      |
| **Windsurf**        | **MCP + Rule Persistence** | `.codeium/windsurf/mcp_config.json`      | Project      |
| **Trae**            | **MCP + Rule Persistence** | `.trae/mcp.json`                         | Project      |
| **Roo Code**        | **MCP + Rule Persistence** | `.clinerules` / `.roo/mcp_config.json`   | Project      |
| **Claude Code**     | **Bash Interception**      | `.mcp.json` / `~/.claude/`               | User/Project |
| **Gemini CLI**      | **BeforeTool Middleware**  | `.gemini/settings.json`                  | User/Project |

## 3. SDLC Standards Layer

The registry is a portable standards source, not a daily command runtime. `ags`
initializes, syncs, validates, and wires MCP; users then invoke synced workflows
inside Claude, Codex, Cursor, Gemini, Copilot, Kiro, Antigravity, or another
configured agent.

Canonical lifecycle workflows live in `.agents/workflows`:

```mermaid
graph LR
  A[sdlc] --> B[brainstorm-feature]
  B --> C[plan-feature]
  C --> D[design-solution]
  D --> E[implement-feature]
  E --> F[verify-work]
  F --> G[deploy-release]
  G --> H[publish-notes]
  H --> I[retro-learn]
  I --> C
```

Workflow export still follows the agent integration taxonomy:

- Antigravity/Kiro: native markdown workflows
- Claude/Roo/OpenCode: command markdown
- Gemini: TOML commands
- Copilot: prompt files
- Cursor/Trae/Codex: skill folders with `SKILL.md`

Sync installs each selected canonical workflow once at `.agents/workflows/<name>.md` for every configured provider, including provider-only installations, then derives native exports from that same content. `.skills-lock.json` v2 carries an optional versioned `workflowCatalog` section (canonical path/digest, registry identity, requested ref, resolved commit, and per-binding output paths/digests). Antigravity and Kiro resolve to the same canonical path, so that pair produces one write and one binding rather than a duplicate writer. A native output whose actual bytes differ from the deterministic export (user-edited, unowned, or written by another alias) is recorded as a `nativeConflicts` entry rather than a verified binding, so parity is never certified from the remaining bindings; the catalog entry and canonical body survive while any binding or conflict still references them, and are dropped only when all are removed. The lock is validated before publication and replaced atomically; an incomplete acquisition suppresses pruning and retains the previous catalog instead of certifying a partial set. Workflows authored in the registry without an installation lock remain readable as `local_source` with no native-parity claim.

Requirement layering is explicit in the SDLC workflow names and outputs:

- `brainstorm-feature` = BRD-lite ("Why")
- `plan-feature` = PRD ("What")
- `design-solution` = SRS/FRS ("How")
- `implementation-readiness` and later phases enforce living traceability updates across BRD-lite -> PRD -> SRS/FRS -> verification evidence
- Core SDLC outputs include an adapter-neutral Outcome Report (`feature_status`, `requirement_trace`, completed evidence, missing evidence, decision needed, recommended next workflow) so runtimes can report whether work is not started, requirements-ready, design-ready, partial, implemented, or blocked without embedding project-specific orchestration concepts.

### Requirements Modeling & View Selection

Complex feature discovery uses progressive disclosure: `product-management/product-requirements` loads `references/requirements-modeling.md` on demand for scope trees, completeness, canonical rules, question-driven view selection, low-risk ticket equivalence, sensitive-change floors (technical design plus explicit human/governance approval), and scoped change impact carrying existing IDs.

Canonical guidance remains host-neutral; provider, account, profile, model, and machine specifics belong in host planning records only.

### 3.1 Optional Product Evidence Layer (Release Candidate)

Initiatives requiring rigorous, audit-grade decision backing can opt into the product evidence lifecycle. This introduces three optional workflows without altering default sync or core chain reachability:

- **`discover-product`**: Frames evidence-grounded product opportunities, verified problem context, non-goals, and falsifiable hypotheses upstream of or alongside `brainstorm-feature`/`plan-feature`.
- **`validate-product`**: Validates prioritized hypotheses through bounded experiments, precommitted thresholds, and host authorization gates before committing implementation capacity.
- **`review-product-value`**: Audits realized post-release product value against registered measurement contracts and baseline evidence, decoupling delivery completion from causal ROI.

All product decisions ground in a versioned local evidence ledger at `docs/product/<slug>/evidence.json` managed by `product-management/product-evidence`, featuring immutable recorded decisions (`DEC`), structured provenance, and host authorization boundaries.

### 3.2 Discovery & Runtime Boundaries

- **Runtime Versions**: Standalone resource scripts (`skills/product-management/product-evidence/scripts/validate-product-evidence.mjs` and `skills/product-management/product-investment/scripts/evaluate-investment.mjs`) are standalone ECMAScript modules requiring Node >=20. In contrast, the CLI sync engine (`SyncService.ts` using `Promise.withResolvers`) and the T09 consumer integration test harness require Node 22+.
- **Workflow Discovery Surface**: The MCP server (`list_workflows`, `get_workflow`) reads only the installed canonical `<root>/.agents/workflows` catalog recorded in `.skills-lock.json`. Lookup statuses are explicit: `managed` (canonical bytes verified against the catalog digest, with native parity only when every listed binding still matches its recorded digest), `local_source` (no installation lock; computed digest, no parity claim), `unverified` (lock exists without catalog metadata; sync required) and `unavailable` (missing or mismatched content, unlisted residue, invalid name or containment failure). `unavailable` never degrades into local or native content. No network lookup or runtime scanner expansion into native directories is introduced.
- **JSON Routing & Trigger Boundaries**: With `product-evidence` in `product-management`, JSON routing maps `*.json` to candidate categories (`common` and `product-management`). `product-evidence` activates exclusively on its narrow scoped file trigger (`docs/product/*/evidence.json`); the seven advanced PM methods remain strictly keyword-only (`triggers.files: []`); and the two PM foundation skills (`product-business-requirements` and `product-requirements`) match only their specific markdown specs (`BRD.md`, `PRD.md`, `docs/brd/brd-*.md`, `docs/prd/prd-*.md`, `specs/*.md`). `package.json` and unrelated JSON files trigger only appropriate common audit skills and NEVER match any `product-management` skills.

### 3.3 Delegation Packets, Lifecycle and Task Economics

- **Semantic operations**: `common-subagent-driven-development` names seven provider-neutral operations — prepare, dispatch, completion, resume, cancel, collect receipt, verify acceptance. Host instructions bind them to native invocation; canonical policy contains no runtime tool names or commercial profile identifiers. An unavailable operation or permission control is reported unsupported, never claimed successful.
- **Assignment packets**: `task_brief.py <PLAN_FILE> <TASK_NUMBER> --assignment <ASSIGNMENT_JSON> [--out <BRIEF_FILE>]` publishes one standalone, validated packet. The assignment manifest (`schema_version: 1`) carries goal, owner, project domain, workspace root, plan digest, non-goals, authority, global invariants, owned paths, acceptance criteria, verification, required standards with revisions, source/dependency digests, output contract and limits. Validation happens before publication: exit `2` for invalid or stale prerequisites, exit `3` for absent/ambiguous task selection or output collision, exit `0` only after a packet exists. Default output is content-addressed under the resolved workspace so prior evidence is never replaced. Path containment uses local realpath checks; it is validation, not sandbox enforcement against a concurrent path swap.
- **Lifecycle truth**: Cancellation and timeout are stopped states, not completion. Resume preserves the same task, authority and owned paths; a different task is a fresh dispatch. Independent acceptance requires a reviewer distinct from the implementer.
- **Task economics**: `SessionJournal` records `taskId`/`parentTaskId` labels and optional `expectedActors`; a declared actor with no journal is listed missing by label, and failed, retried, interrupted and cancelled attempts remain in cohort accounting. Reasoning usage must declare `separate` or `included-in-output` semantics; an ambiguous declaration leaves cost `unavailable` instead of pricing it twice. Eval runs persist per-attempt `taskUsage`, and the generated report withholds monetary savings unless the actor inventory is complete, every lane is metered, the price resolves and both cohorts measure the same task. Fixture or synthetic traces never promote a native support claim.

## 4. Hook-Based Transparency

Inspired by **Rust Token Killer (RTK)**, we aim for a zero-trust, low-overhead context model. This means:

1. **Lazy Loading**: Skills are NOT loaded until a tool call (MCP) or triggered by the router (`AGENTS.md`).
2. **Transparent Interception**: Like RTK's bash hooks, our MCP server aims to intercept file read requests (e.g. `read_file`) and inject relevant skill rules into the output, saving the agent from needing to manually fetch rules.
3. **Token Filtering**: We prioritize high-density information. The `_INDEX.md` model reduces the initial "scouting" tokens by 90% compared to a flat rule list.

## 5. Core Services

### SyncService (`cli/src/services/SyncService.ts`)

The brain of the operation. It orchestrates the synchronization process.

- **Responsibility**: Fetching, filtering/excluding, writing files, generating `_INDEX.md` per category, and generating router-style `AGENTS.md`.
- **Key Dependencies**: `SkillSyncService`, `WorkflowSyncService`, `IndexGeneratorService`, `AgentBridgeService`.
- **Design Principle**: "Ownership Manifest". It classifies every write against `.skills-lock.json` v2, preserves files the user edited, and respects `custom_overrides` in `.skillsrc`.

### Skill Manager (`cli/src/commands/skills.ts`)

Category-first, interactive manager for skill selection. It is additive: `list-skills` remains the discovery view.

- **Responsibility**: Read the configuration and strict catalog, edit a command-local draft (categories, nested skills, optional category release), review the exact effect, then perform one Apply that saves and installs.
- **Key Dependencies**: `ConfigService` (`readSnapshot` / `saveSelection`), `SkillCatalogService` (strict ref-aware catalog and published releases), `SkillSelectionService` (shared include/exclude resolver), `SkillSelectionApplyService` (prepared, skills-only install).
- **Design Principle**: No writes before Apply. Preparation fully assembles every selected package at its resolved commit; failures leave the configuration and installation untouched. A real selection change persists `skills_mode: explicit`, so later ordinary sync keeps deliberate removals. Conflicts with external `.skillsrc` edits return to reload/review instead of overwriting, and a post-save failure offers an in-command Retry.

### IndexGeneratorService (`cli/src/services/IndexGeneratorService.ts`)

Responsible for creating the "Context Bridge" for AI agents. Produces two output formats:

- **Router Index** (`assembleRouterIndex()`): Compact AGENTS.md that maps file extensions to `_INDEX.md` paths (~20 lines).
- **Category Index** (`generateCategoryIndex()`): Per-category `_INDEX.md` with tiered File Match vs Keyword Match sections.
- **Flat Index** (`assembleIndex()`): Legacy flat list format, still used for the registry's own AGENTS.md.
- **Three-Tier Model**: Skills with broad file globs (e.g., `**/*.ts`) are automatically demoted to Keyword Match unless they are the designated `base_language_skills` for that category (defined in `metadata.json`).

### SkillSyncService (`cli/src/services/SkillSyncService.ts`)

Handles fetching and writing skill files from the remote registry.

- **Responsibility**: Downloading SKILL.md + references from GitHub, writing to agent directories, pruning orphaned skills.

### WorkflowSyncService (`cli/src/services/WorkflowSyncService.ts`)

Handles workflow distribution from a single canonical source.

- **Canonical Source**: `.agents/workflows/*.md` remains the authoring surface in this repository and the installed canonical catalog in a consumer project.
- **Responsibility**: Acquiring the selected workflow set (`complete` / `disabled` / `incomplete`), installing each canonical body once through the ownership writer, and deriving native exports from the same collected content.
- **Export Model**:
  - Antigravity/Kiro: native markdown workflow files (same path as the canonical body: one write, one binding)
  - Claude/Roo/OpenCode: command markdown
  - Gemini: TOML command files
  - Copilot: prompt files
  - Cursor/Trae/Codex: skill folders (`SKILL.md`)
- **Acquisition Note**: An incomplete discovery/download/integrity result never authorizes pruning and retains the previous manifest and catalog provenance; a complete empty selection prunes owned workflows.
- **Provenance Note**: Native bindings are recorded only when the on-disk bytes match the deterministic generated output; edited, unowned or overridden canonical bodies produce no managed catalog entry and are reported rather than silently certified.
- **Codex Note**: Codex does not consume `.agents/workflows` directly; it receives transformed workflow skills under `.codex/skills/<workflow>/SKILL.md`.
- **SDLC Note**: Default workflows include the full SDLC spine from `sdlc` through `retro-learn`; teams may sync a subset through `.skillsrc`.
- **Agentic Runtime Note**: Core SDLC workflows emit `Runtime Contract`, `Handoff Payload`, `Blocking Questions`, and `Next Workflow` sections so slash-command agents and channel agents can continue, pause, or delegate with the same artifact shape.

### ConfigService (`cli/src/services/ConfigService.ts`)

Manages the user configuration (`.skillsrc`).

- **Responsibility**: Parsing YAML, validating schema (Zod), and resolving dependency exclusions (e.g. "Don't install React skills if this looks like Vue").

### AgentBridgeService (`cli/src/services/AgentBridgeService.ts`)

Creates agent-specific rule files that point to AGENTS.md.

- **Responsibility**: Generates discovery instructions for each agent (Cursor `.mdc`, Copilot instructions, Claude `CLAUDE.md` protocol, Antigravity/Windsurf/Trae rule files).

### System-Design Diagram Pipeline

System-design methodology owns the design process: requirements, decision-relevant capacity, and the HLD → component → LLD → verification trace. `system-design-data-architecture` owns the canonical critical-flow contract; other skills link to it instead of creating competing checklists. Worked cases and deep-dive references load lazily. Mobile/client guidance applies only when client authority, offline behavior, lifecycle, device constraints, or SDK compatibility changes correctness. No database, queue, cache, region, specialist, or diagram is mandatory by default.

Views answer named questions and remain conditional. Dataflow explains movement, transformation, and authority; sequence explains ordering and acknowledgments; state explains lifecycle; ERD explains relationships; deployment explains runtime placement. A table or prose suffices when no diagram adds decision value. The common diagram scripts remain the sole renderer; JSON spec is semantic authority, draw.io is editable presentation, and exported images are derived copies.

Lifecycle, evidence source kind/confidence, and metric provenance are independent. Documentation and code citations do not establish runtime or deployment observations. Compact citation-only nodes remain unverified. Optional manifests compare captured hashes for bounded local sources; they do not claim production drift.

Lexical assertions are routing/content smoke checks, not semantic design evaluation. Candidate or body-only comparisons do not prove whole-package behavior or live efficacy; package evidence must identify the evaluated sources, applicable fresh answers, and execution route. Paid model execution requires separate approval.

## 6. Token Economy (Design Constraint)

This is a **High-Density** project. Every feature must be evaluated against its impact on the AI's context window.

- **Skill Files**: Must be < 100 lines, averaging ~500 tokens.
- **Router Index**: ~20 lines (~600 tokens) — constant regardless of skill count.
- **Category Index**: ~10-15 lines per category.
- **References**: Heavy content goes to `references/` folder, loaded only on demand.
- **Framework Maps**: Large framework packs may add category-level `references/framework-map.md` for stack-wide routing and official-doc freshness notes without bloating individual `SKILL.md` files.
- **Behavior Guardrails**: Discipline skills may add pressure scenarios, rationalizations, red flags, and behavior assertions in `evals/evals.json`, not by bloating `SKILL.md`.
- **No omission-as-optimization**: Required bodies are never suppressed to reduce prompt bytes. Repeat-inclusive body returns are recorded so repeated delivery is measured honestly; savings claims require complete coverage, not a shorter prompt.
- **Quality Model**: Treat skill health as four axes: routing accuracy, structural quality, token economy, and behavior-pressure coverage for guardrail skills.

## 7. Metadata Configuration (`skills/metadata.json`)

Registry-level configuration that controls index generation:

- **`file_routing`**: Maps file extensions to skill categories for the router table.
- **`broad_globs`**: List of glob patterns considered "too broad" for auto-triggering (e.g., `**/*.ts`).
- **`base_language_skills`**: One skill per category that keeps the broad glob in File Match. All others are demoted to Keyword Match.
- **`foundational_composite_rules`**: Auto-injected composite triggers based on skill name patterns.
- **`categories`**: Version, tag prefix, and token metrics per category.

## 8. Decision Records

### ADR-001: Local-First Indexing

_Date: 2026-02-07_
**Decision**: `SyncService` should generate the index by scanning the _local_ disk after writing files, rather than using the in-memory list of fetched skills.
**Reason**: This ensures that manual edits or custom local skills created by the user are also included in the index, making the system "User-Extensible" by default.

### ADR-002: Internal Tools Separation

_Date: 2026-02-07_
**Decision**: Documentation scanners and maintenance scripts live in `scripts/` but are NOT bundled into the CLI binary.
**Reason**: Keeps the user-facing CLI binary small and focused.

### ADR-003: Hierarchical Skill Resolution

_Date: 2026-04-04_
**Decision**: Replace the flat AGENTS.md index with a two-level hierarchy: router table + per-category `_INDEX.md` files with tiered trigger sections (File Match vs Keyword Match).
**Reason**: The flat index grew to 238+ entries (~300 lines). LLMs cannot reliably scan a 300-line list to find matching skills. The hierarchical approach reduces scan cost to ~25 lines per lookup regardless of total skill count, and the three-tier model prevents 30+ skills from matching a single file extension.

### ADR-004: Three-Tier Trigger Model

_Date: 2026-04-04_
**Decision**: In `_INDEX.md`, skills are classified into File Match (auto-check against edited file) and Keyword Match (only when user's request mentions the concept). Broad globs are stripped from non-base skills.
**Reason**: Without tiering, editing a `*.ts` file matched 27+ skills simultaneously. With tiering, only 6 genuinely relevant skills match via file pattern. Cross-cutting skills (best-practices, security, performance) activate only when the user explicitly mentions them.

### ADR-005: Standards Registry, Not Command Runtime

_Date: 2026-05-14_
**Decision**: Keep `ags` as a setup/sync/validate tool. Do not add an ECC-style daily command runtime. SDLC workflows are portable repo assets exported into each configured agent's native invocation surface.
**Reason**: The project differentiates through open standards, token-efficient routing, multi-agent sync/export, MCP enforcement, and local customization. Users should own the synced files and invoke them through their existing agent runtime.

### ADR-006: SDLC Workflow Spine

_Date: 2026-05-14_
**Decision**: Ship a compact default SDLC workflow chain: `sdlc`, `brainstorm-feature`, `plan-feature`, `design-solution`, `implementation-readiness`, `implement-feature`, `review-ticket`, `verify-work`, `traceability-audit`, `deploy-release`, `publish-notes`, `session-report`, and `retro-learn`.
**Reason**: Existing workflows covered isolated steps. A visible lifecycle spine makes the repository an SDLC standards layer while preserving token economy through short workflow files and references.

### ADR-007: Specialists Are Native Sub-Agents

_Date: 2026-05-14_
**Decision**: Keep `skills/specialists/*/SKILL.md` as registry source, but sync them directly to native sub-agent folders instead of normal skill folders. Specialists stay compact, budgeted, and focused on one review or automation lens.
**Reason**: Review fanout, Jira/ADO/Zephyr handoffs, traceability, and test generation need role isolation without loading broad skill catalogs into the parent context.

### ADR-008: Immutable v2 Live-Eval Inputs

_Date: 2026-07-11_
**Decision**: Live eval manifests use one shared v2 builder for category and aggregate scopes. A completed run records source hashes and an immutable `inputs.json`; root scripts, the published CLI verifier, and MCP verify against that snapshot. Aggregate reports project the `all` run into category partitions before selecting the newest complete view.
**Reason**: Mutable eval definitions and incompatible aggregate answer paths made historical scores non-reproducible and allowed incomplete or compromised runs to look valid. v1 manifests remain read-only compatible for historical verification.

### ADR-009: Incremental Live-Eval Evidence

_Date: 2026-07-12_
**Decision**: `pnpm evals:baseline` plans normal maintenance runs from the latest complete immutable reference. It creates a selective manifest and copies only compatible evidence: prompt-only answers survive a skill-body change, activation answers survive a body-only change, and assertion-only changes regrade existing transcripts. Changed prompts, descriptions, and activation corpora require fresh applicable answers.
**Reason**: A full catalog run generated 3,220 answers and took roughly 54 minutes. Hash-only invalidation would either rerun too much or reuse the wrong lane. Lane-specific dependency checks preserve reproducibility while making a normal one-skill update practical.

### ADR-010: Outcome-Quality Release Gate

_Date: 2026-07-13_
**Decision**: Keep activation metrics separate from outcome metrics. A skill is
release-ready only when its with-skill case pass rate is strictly above 85%,
with-skill assertion pass rate is at least 85%, outcome delta is non-negative,
and trigger recall and specificity are each at least 90%. Catalog promotion
requires one fresh run with zero reused answers; composite runs remain audit
history only.
**Reason**: Perfect trigger selection does not prove that the loaded skill
produces a correct answer. The previous aggregate report could show 100%
activation while most with-skill cases still failed, so the report and
promotion gate now expose and enforce outcome readiness explicitly.

### ADR-011: SNC Task-Difficulty Routing

_Date: 2026-09-13_
**Decision**: Route autonomy, verification depth, review mode, reviewer fanout,
and model tier by a Spread/Novelty/Centrality score (0-6, summed, never
averaged) rather than by ticket type. `common-task-complexity-routing` owns the
rubric; `specialist-codebase-scout` emits the `SNC:` line; core SDLC workflows
carry `snc_tier` and `model_tier` in their Handoff Payload. `model_tier` is a
runtime-neutral hint (`fast|standard|strong`) that adapters map to their own
model ladder.
**Reason**: "Bug" and "feature" labels say nothing about engineering difficulty.
A one-file typo and a cross-service pricing fix were previously routed through
the same HARD STOP and the same review depth, wasting approval cycles on trivial
work and under-reviewing high-centrality changes.

### ADR-012: Governed Cybersecurity Packages and Evolution

_Date: 2026-09-22_
**Decision**: Add an opt-in cybersecurity category with shared authorization,
evidence and versioned framework mappings; white-team exercise control and
independent adjudication; bounded red-team planning/validation; blue-team
triage/detection/hunting; and paired purple-team validation. Team color does
not determine execution risk. Unsupported host controls block live actions,
not offline analysis.

Treat a skill as a package: preserve binary resources and attribution, reject
incomplete downloads, and stage replacement before changing an installed
package. New eval manifests fingerprint package resources and preserve
immutable input bytes. Legacy evidence remains readable, but cannot substitute
for fresh whole-package evidence at promotion.

Evolution separates observation, redacted proposal, authorized source edit,
held-out comparison, independent review, promotion and rollback. Review names
and hashes are audit data, not authenticated identities or permission grants.
**Reason**: Instructions cannot enforce filesystem/network scope, credential
isolation, cancellation or organizational approval. The registry distributes
standards and verifies artifact integrity; the consuming host and accountable
maintainers must enforce authority. No autonomous self-promotion or production
security efficacy is claimed.

### ADR-013: Decision Discipline and Recorded Approval

_Date: 2026-09-27_
**Decision**: `brainstorm-feature` is one SDLC entry point with a Why lane (solution-free BRD-lite for business operators) and a Direction lane (delivery contract with technical options for technical operators), sized by SNC tier (Quick writes no file). Shared rules live in `common-decision-discipline`, loaded by `brainstorm-feature`, `plan-feature`, `design-solution`, and `system-design-session`: said-vs-assumed write-back, evidence ledger (`confirmed(<path>)`, `assumed`, `unknown`), at most 3 questions per round, option cards only for real choices, and `approval: pending | approved(<who>, <date>) | assumed-autonomous`. `implementation-readiness` blocks `pending`, warns on `assumed-autonomous`, and blocks it only at `tier=high`.
**Reason**: The previous workflow told agents to stay solution-free and to recommend three approaches, never recorded approval before routing on, made unlabeled feasibility claims, and applied a 19-section template to every request. Superpowers and AgentKit showed that right-sizing, grounding, and explicit approval make intake trustworthy without adding questions for small work.

### ADR-014: Single Agent Capability Table

_Date: 2026-09-27_
**Decision**: `cli/src/capabilities/agentCapabilities.ts` (`AGENT_CAPABILITIES`) is the only place per-agent facts live: skill, rule, workflow, specialist, hook, and MCP surfaces plus limits. `getAgentDefinition` is a one-line accessor; `McpConfigService`, `SpecialistTransformer`, and `HookService` read capability fields instead of keeping their own per-agent tables. `docs/agent-capabilities.md` is generated from the table and checked for drift in CI. After sync, each agent's unsupported surfaces are printed once and remembered in `.skills-lock.json` (`disclosed`).
**Reason**: Per-agent behavior was split across four files, so adding or fixing an agent required matching edits in each, and unsupported surfaces were dropped silently. The Codex MCP path bug fixed in T4 came from exactly this split.

### ADR-015: Ownership Manifest and User-Edit Preservation

_Date: 2026-09-27_
**Decision**: `.skills-lock.json` v2 records every whole file `ags sync` writes (skills, workflow exports, specialists, bridge rule files, per-agent `_INDEX.md`) with owner, source, agent, and sha256. Each write is classified against that manifest: new and owned-unchanged files are written; owned files the user edited are kept and reported; files ags does not own are left alone. Files that drop out of the desired set are pruned only when unchanged and only for groups that completed this run, after a backup under `.ags/backups/` (newest 3 kept). `ags sync --dry-run` computes the same plan without touching disk; `--force <path>` overwrites a kept file after backing it up. A v1 lock file is migrated on read; files without a prior record are adopted once during that migration. `ags uninstall` removes only owned-unchanged files (plus MCP entries, hook registrations, and the AGENTS.md index block for `--all`) after a backup; `ags restore` replays a backup (replace-only).
**Packages (reconciled with ADR-012)**: Skill packages are assembled all-or-nothing (every resource, including binary assets and root `LICENSE`/`NOTICE`, must download and pass any release manifest check, or the sync aborts before writing). Hashes are computed over raw bytes. Every path is validated before the first write; files are then written through the ownership manifest one by one instead of replacing the whole package directory, so user-edited and unowned files inside a package survive. A disk failure part-way through a package can leave it mixed; the lock file is not written in that case, and the next sync repairs owned files.
**Managed-path boundary (SEC-01)**: Install writers require the installation root and use `lstat` to reject pre-existing symlink components below it before managed reads, writes, backups, or pruning; skill package resources are preflighted across selected agent destinations before the first package write. Backup destinations under `.ags/` receive the same check. The root itself may be reached through a symlink. These checks do not prevent a concurrent local process from swapping a path component between inspection and the filesystem operation; host permissions and isolation remain the boundary for that race.
**Reason**: Sync previously overwrote user edits silently, recorded only skills, and could not safely prune or uninstall workflows, specialists, or bridge files. AgentKit's ownership model (replace unchanged, preserve modified, never adopt unknown) makes lifecycle operations safe without new prompts.

### ADR-016: Pinned SDLC Assets and Release Manifests

_Date: 2026-09-27_
**Decision**: Workflows and specialists are fetched from release tags (`workflows_ref`, `specialists_ref` in `.skillsrc`, written once from the registry's latest release when absent) instead of the default branch. Every source ref is resolved to a commit and recorded in `.skills-lock.json` `sources`; a tag that later resolves to a different commit is reported. Releases publish `MANIFEST.json` (sha256 per file) with a build-provenance attestation; `ags sync` rejects downloaded files that do not match a release's manifest, and `ags verify --attestation` checks the attestation with the GitHub CLI. `ags verify --strict` fails when any locked ref has moved.
**Reason**: Pinning categories did not pin workflows or specialists, so two installs from the same `.skillsrc` could differ, and the only integrity check (git blob SHA from the same API) protected transport, not the release.

### ADR-017: Warning-First Policy Layer

_Date: 2026-09-28_
**Decision**: Machine-checkable project policy rules live in `.ags/policy.json` (`schema_version: 1`), covering three rule kinds: `protected_path` (`paths`, action `block | warn`), `command` (`executables`, action `block | warn | rewrite`, `rewrite_to`), and `required_check` (`when_changed`, `checks`, action `block | warn`). `ags policy compile` scans project agent docs (`AGENTS.md`, `CLAUDE.md`) line-by-line to propose rules into `.ags/policy-candidates.json`; compiled rules can only `warn` or `rewrite` (never `block`). `ags policy adopt <id...>` activates candidate rules into `.ags/policy.json` after conflict validation. The PreToolUse hook (`HookService`) reads `.ags/policy.json` dependency-free; `block` rules only block when `AGS_HOOK_ENFORCE=1` is set (otherwise they warn), and the policy index supplies rules/diagnostics rather than controlling execution. In the reviewed hook implementation, `AGS_POLICY_BYPASS=1` or `true` with a valid policy and any matching policy rule (including `warn`) exits 0 early, before the fixed identity/secret denial; bypass without a matching rule still reaches that fixed denial. This documents hook behavior, not human authorization, account control, read prevention, process/network containment, or coverage of alternate routes. Verify the effective host and each claimed route before calling it enforced.
**Reason**: Agent instructions in markdown files (`AGENTS.md`, `CLAUDE.md`) are advisory and frequently ignored or forgotten during multi-step tasks. Turning deterministic rules into machine-checkable policy enables early warning and opt-in hook enforcement without introducing disruptive hard blocks by default or treating cooperating AI agents as malicious adversaries. Enforcement claims remain limited to observed host behavior; repository guidance and scanning do not substitute for runtime isolation.

### ADR-018: Provider-Neutral Delegation Contracts

_Date: 2026-10-23_
**Decision**: Four boundaries are fixed rather than provider-specific. (1) Skill delivery is request-scoped and complete: no process-global body suppression, no `force_reload` escape hatch, and selection, returned bodies and body digests are reported separately. (2) Multi-task execution requires a versioned assignment manifest (`task_brief.py --assignment`) with authority, invariants, owned paths, ACs, verification, required standards and source/dependency digests; incomplete input publishes no packet. (3) Delegation is expressed as seven semantic operations; per-agent capability entries declare `native-agent`, `instruction-only` or `none`, and support stays `not_verified` without versioned live execution evidence. (4) `.agents/workflows` is the installed canonical workflow catalog for every configured provider, verified through an optional `workflowCatalog` section in `.skills-lock.json`; MCP lookup reports `managed`, `local_source`, `unverified` or `unavailable` and never falls back across those layers.
**Reason**: Parent/sibling body dedup silently withheld required standards from fresh workers, prose templates let workers infer authority, format exports were being read as runtime parity, and MCP workflow discovery could disagree with what native invocation ran. Each fix replaces an ambiguous convention with an explicit, evidence-bound contract; none of them claims host activation, permission enforcement or measured task savings without separate evidence.

### ADR-019: Governed Cybersecurity Lab Validation Boundary (ADR-CLV-01)

_Date: 2026-10-24_
**Decision**: Approve a narrowly separated, opt-in lab validation contract (`skills/cybersecurity/cyber-lab-validation/`) while preserving `cyber-scoped-validation` as the canonical offline and supplied-evidence validation lane. Baseline ADR-005, evidence enums, and existing scoped-validation prohibitions remain in effect.

Active lab validation actions are permitted only against pinned disposable synthetic local fixtures after action- and version-specific human approval, independently demonstrated host isolation, tool/filesystem/network/credential/logging/cancellation boundaries, finite approved limits, paired action-observation evidence, bounded teardown, and fresh stop/restart gates. No action is authorized by a lab label, agent role, plan, source publication, or G2 design approval alone. Unknown action support and missing runtime proof remain blocked.

Strictly excluded: production/public/real targets, real credential collection or use, real-data exfiltration, live malware, destructive payloads, persistence beyond lifecycle, autonomous exploit chains, bypass/obfuscation, and refusal-driven provider switching. Existing host/model safety policies remain authoritative.

Candidate status & dormancy: G2 approves the technical boundary and baseline amendment only. Candidate skills and workflow routes remain dormant in the repository without tool autoactivation. Multi-gate progression governs any future activation: G3 requires per-run host containment/cancellation proof; G4 requires evaluated model acceptance and independent review; G5 requires explicit publication approval. Missing any matching gate keeps its dependent lane inactive, with safe analysis/replay of supplied artifacts remaining fully operational.

**Reason**: Registry instructions cannot enforce host runtime boundaries. Broadening `cyber-scoped-validation` in place would dilute stable offline contracts and risk turning prohibitions into implied execution permission. A separate opt-in contract enables clean auditing, independent gate progression, and straightforward abandonment/rollback without breaking existing offline consumers or rewriting historical evidence.
