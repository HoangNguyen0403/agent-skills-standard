# Agent Skills Standard

[![NPM Version](https://img.shields.io/npm/v/agent-skills-standard.svg?style=flat-square)](https://www.npmjs.com/package/agent-skills-standard)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/HoangNguyen0403/agent-skills-standard?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/stargazers)
[![SkillSpector Verified](https://img.shields.io/badge/SkillSpector-Verified-76b900?style=flat-square&logo=nvidia&logoColor=white)](https://github.com/HoangNguyen0403/agent-skills-standard/security/code-scanning)

**The portable standards layer for AI coding agents. Sync once, then work in your own runtime.**

### Purpose
Agent Skills Standard provides a modular, version-controlled catalog of engineering guidelines and development workflows that synchronizes into native configurations for coding agents (Cursor, Claude Code, GitHub Copilot, Gemini CLI, Windsurf, Trae, Kiro, Roo, and more). It keeps engineering practices consistent across your team without packing thousands of instructions into system prompts.

### Intended Developer
Built for developers and engineering teams who use AI coding assistants and want shared, auditable standards—such as architecture boundaries, strict type checking, security rules, and testing patterns—that stay portable across different tools and environments.

> [!NOTE]
> **Specification & Runtime Boundary**: This repository is an open-source catalog, distribution CLI, and MCP server. It provides skills conforming to the open Agent Skills format, but it does **not** own or govern the underlying specification, nor does it replace your existing agent runtime or IDE.

### Concrete Use Case
When an agent creates or refactors an API endpoint, it can consult focused on-demand skill files matching the active file patterns and task concepts (such as NestJS controller conventions, TypeScript strict typing, and API response envelopes), providing structured domain guidance while reducing unnecessary prompt context compared to monolithic instructions.

### Next Action: Quick Setup
Install globally and initialize in your project repository:

```bash
# Recommended: Global install and sync
npm install -g agent-skills-standard@latest
ags init
ags sync
```

Or run directly without global installation:

```bash
# Alternative: run via npx
npx agent-skills-standard@latest init
npx agent-skills-standard@latest sync
```

**Not an engineer?** You don't need to run any of the above — just describe your idea to your AI agent. See [Getting Started: Product Owner](docs/getting-started-product-owner.md).
---

## The Problem

Every team has coding standards. But AI agents don't know them.

You end up repeating the same instructions: _"Use OnPush change detection"_, _"Always wrap errors with context"_, _"No business logic in handlers"_. And every time, you face the same trade-off:

- **Too many rules** = AI forgets them, wastes tokens, gets confused
- **Too few rules** = AI writes generic code that doesn't match your standards
- **Copy-paste `.cursorrules`** = out of date in a week, doesn't scale to teams

## The Solution

Agent Skills Standard turns your engineering rules into **modular, version-controlled skills** that any AI agent can load on demand.

| Without Skills                              | With Skills                                                         |
| :------------------------------------------ | :------------------------------------------------------------------ |
| Large all-in-one architect prompt every chat | Focused skill loaded only when relevant                            |
| Rules drift across team members' prompts    | Single source of truth, synced via CLI                              |
| Works in one AI tool, copy-paste to others  | Works in Cursor, Claude, Copilot, Gemini, Windsurf, Trae, Kiro, Roo |
| One large instruction file consulted regardless of the edit | Hierarchical lookup narrows to the matching skill      |

### Not Another Agent Runtime

Agent Skills Standard does **not** force you into a new daily command system. `ags` is for setup, sync, validation, MCP wiring, and updates. After sync, your AI tool receives native assets:

- Claude/Roo/OpenCode commands
- Codex/Cursor/Trae skills
- Gemini TOML commands
- Copilot prompts
- Antigravity/Kiro workflow files
- MCP tools for runtime instruction delivery, with load receipts — not a guarantee of routing, model, account, or task compliance

You keep the files in your repo, customize them with `.skillsrc` and `custom_overrides`, and run workflows inside the agent you already use.

### How It Works

```bash
You run: npx agent-skills-standard sync

What your AI gets:

1. AGENTS.md (router)
   "Editing *.ts? Check typescript/_INDEX.md"

2. typescript/_INDEX.md (trigger table)
   File Match:  typescript-language  *.ts, *.tsx, tsconfig.json
   Keyword:     typescript-security  validate, sanitize, auth

3. typescript-language/SKILL.md (loaded on demand)
   The actual rules — only when needed.
```

The AI accesses matching skill files based on active file patterns and prompts, reducing token overhead compared to all-in-one prompts. Skill instructions provide structured guidance, though behavioral adherence remains model-dependent.

---

## Architecture & Token Economy

This project follows a **Zero-Trust** architectural model inspired by **Rust Token Killer (RTK)**. Instead of injecting every rule into every prompt, we use a hierarchical loading system that reads only the index rows and skills matching the current file and task.

Detailed documentation is available in [ARCHITECTURE.md](ARCHITECTURE.md), covering:

- **Hierarchical Resolution**: Router Table (`AGENTS.md`) -> Category Index (`_INDEX.md`) -> Skill (`SKILL.md`).
- **Integration Taxonomy**: Multi-agent bridge support for Cursor, Claude, Copilot, Windsurf, Trae, Roo, etc.
- **High-Density Design**: All skills must be < 100 lines and optimized for token economy.

## Quick Start

### Prerequisites

- **Consumer CLI (`ags`)**: Supported Node 22 LTS `>= 22.13` on the 22.x line, or a newer supported LTS. Supported means the exact declared dependency intersection `^22.13.0 || >= 23.5.0` (`commander` 15 declares `>= 22.12.0`, `inquirer` 14 declares `>= 23.5.0 || ^22.13.0 || ^20.17.0`); the CLI `package.json` declares no `engines` field of its own, so intermediate Node versions are not covered by a declared supported range.
- **Repository Root & Tooling**: The root `package.json` *declares* `node: ">= 20.0.0"` and `pnpm@10.0.0`. That is a manifest declaration for root scripts only, not evidence that the CLI or website build supports Node 20.
- **Contributors & Website**: See [CONTRIBUTING.md](./CONTRIBUTING.md) for full developer requirements (supported Node 22 LTS or newer supported LTS, pnpm `10+`).

### 1. Initialize

Detects your tech stack and creates a `.skillsrc` configuration:

```bash
# Recommended: Install globally
npm install -g agent-skills-standard@latest
ags init

# Alternative: Run via npx without global installation
npx agent-skills-standard@latest init
```

### 2. Sync

Downloads skills into your configured AI agent directories, records ownership in `.skills-lock.json` v2, and generates the index:

```bash
# Recommended: Global CLI
ags sync

# Alternative: Via npx
npx agent-skills-standard@latest sync
```

> [!WARNING]
> **First-use check, observed 2026-11-03:** `@latest` resolved to published `2.6.6`. An isolated global install and `ags init` (Next.js/Codex template, MCP disabled) succeeded, but the follow-up `ags sync` was rejected because the configured category refs `common-v2.9.3` and `quality-engineering-v1.6.2` were unavailable; no native agent assets or `.skills-lock.json` were installed, and the CLI exit code was not captured. Separately, the `specialists` ref `v1.5.2` was unavailable, and native export completeness is unverified. This is a dated record of that attempt, not a forecast for other releases: check `ags --version` on your install, and use [GitHub Issues](https://github.com/HoangNguyen0403/agent-skills-standard/issues) if sync fails.

> [!TIP]
> **Release & PATH Notes**:
> - **Published version:** read it from the [npm package page](https://www.npmjs.com/package/agent-skills-standard) badge or your installed binary (`ags --version`). That is the version consumers get from `@latest`.
> - **Source target:** this checkout's CLI manifests and changelog target `cli-v2.7.0` (see [CHANGELOG.md](CHANGELOG.md)). A source version is a development target, not evidence that the same build is published to npm.
> - If `ags -V` still shows an older version after reinstalling, verify your shell's PATH order (e.g. `~/Library/pnpm` before `~/Library/pnpm/bin`), run `hash -r`, and verify with `ags -V` again.
#### Safe Install & Local Edits

- **Edit Protection**: User-modified owned files are preserved and reported; they are never silently overwritten.
- `ags sync --dry-run`: Preview what would change without modifying files.
- `ags sync --dry-run --verbose`: List every affected file path.
- `ags sync --dry-run --json`: Output the install plan as JSON for CI or automation.
- `ags sync --force <paths...>`: Overwrite kept files after automatically backing them up.
- **Scoped Backups**: Pruned files and forced overwrites are saved to `.ags/backups/` (latest 3 kept).
- **Restore**: Undo destructive changes with `ags restore <id>` or view backups with `ags restore --list`.
- **Safe Uninstall**: `ags uninstall [--all] [--agent <agents...>] [--category <categories...>]` removes only owned-unchanged files, preserving user edits and backing up first.

### 3. (Optional) Manage skill selections

> [!IMPORTANT]
> `ags skills` exists in the current source target (`cli-v2.7.0`) and is **not** available in every published release. The published `agent-skills-standard@2.6.6` package (installed from `@latest` during verification) exposes `init`, `sync`, `verify`, and other commands, but no `skills` subcommand. Run `ags --help` against your installed build before relying on this step; if it is absent, edit `.skillsrc` directly.

Add or remove guidance without editing YAML or looking up release tags:

```bash
# Using global CLI
ags skills

# Or via npx
npx agent-skills-standard@latest skills
```

Categories are checked from your current `.skillsrc`; newly enabled categories resolve their published release automatically, while existing pins stay untouched. Optionally customize nested skills (with search) or switch a category to its published release, review the full effect, then confirm once — the command saves the selection and installs it for every configured agent. Cancel or an unchanged selection writes nothing. On a real change the command records `skills_mode: explicit`, so a later ordinary `sync` will not silently re-add the categories or skills you removed.

### 4. Code

Your AI agent now reads `AGENTS.md` automatically. Skills activate based on what file you're editing and what you ask for.

> **Works instantly** with Cursor, Claude Code, GitHub Copilot, Gemini CLI, Windsurf, Trae, Kiro, and Roo. No plugin or extension needed — the CLI generates each agent's native format.

### 5. (Optional) Enable MCP runtime delivery via the MCP server

The CLI **distributes** skills to disk. The companion MCP server **serves** them to your AI agent at runtime as explicit tool calls — closing the gap where agents read `AGENTS.md` but forget to load matched `SKILL.md` files (especially in sub-agents).

#### Consent model — you choose the scope

`init` and `sync` ask once whether to enable MCP and at what scope. Three choices, recommended in **bold**:

| Scope                       | What gets written                                                                                           | Touches `$HOME`?                                   |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **`project`** (recommended) | `./mcp-config-snippets/*.json` + project-scoped runtime configs (`./.mcp.json`, `./.cursor/mcp.json`, etc.) | ❌ No                                              |
| `user`                      | All of `project` + user-home configs (`~/.cursor/mcp.json`, `~/.gemini/settings.json`)                      | ⚠️ Yes — sync prompts before each user-scope write |
| `snippets-only`             | Only `./mcp-config-snippets/*.json` — never edits any runtime config                                        | ❌ No                                              |
| `disabled`                  | Nothing MCP-related                                                                                         | ❌ No                                              |

The CLI never reads or modifies user-home files unless you explicitly choose `user` scope AND confirm each write. All decisions are recorded in `.skillsrc` so you're not re-prompted on every sync.

#### Manage MCP integration with the `mcp` subcommand

```bash
ags mcp status                 # Show enabled, scope, and per-agent install state
ags mcp enable                 # Turn on (uses configured scope)
ags mcp disable                # Turn off (existing entries kept; use uninstall to clean)
ags mcp scope project          # Change scope: project | user | snippets-only | disabled
ags mcp install                # One-shot install at the configured scope
ags mcp uninstall --from=all   # Remove our entry from project + user configs
ags mcp snippets               # Regenerate ./mcp-config-snippets/ without touching configs
```

#### Manage session retrospectives with the `retrospective` subcommand

```bash
ags retrospective status           # Show consent state, store root, and allowed source roots
ags retrospective enable           # Opt in (interactive terminal required)
ags retrospective disable          # Turn off retrospective collection
ags retrospective index            # Generate cross-session HTML index from stored reports
```

Or edit `.skillsrc` directly:

```yaml
mcp:
  enabled: true
  scope: project # project | user | snippets-only | disabled
  prompted: true # set to false to be re-asked next sync
```

#### Manage the pre-edit hook with the `hooks` subcommand

`sync` installs a PreToolUse hook that reminds your agent to call `load_skills_for_files` before every edit — advisory by default, never blocks work:

```bash
ags hooks status                 # Show which hook files are installed per agent
ags hooks install                # (Re)install the reminder hook — advisory only
ags hooks install --enforce      # Claude also BLOCKS edits to SOUL.md, MEMORY.md, .env*, .ssh/, credentials*.json|yaml
ags hooks uninstall              # Deregister the hook (keeps the script file)
```

Independently, `ags verify` checks installed skill files against `.skills-lock.json` (written by every `sync`) to catch drift — a tampered file, a partial write, or a manual edit — `ags audit` prints the current skill inventory, and `ags doctor` checks installation health (config, agents, lock file, MCP, hooks, CLI version) with opt-in safe fixes.

#### Manual install (if you prefer)

Add to your runtime's MCP config:

```jsonc
{
  "mcpServers": {
    "agent-skills-standard": {
      "command": "npx",
      "args": ["-y", "agent-skills-standard-mcp"],
    },
  },
}
```

Now any sub-agent in any runtime can call `load_skills_for_files`, `audit_session_compliance`, etc. Works in Claude Code, Cursor, Antigravity, Kiro, Continue, Gemini CLI — anywhere MCP is supported. Full setup: [`mcp/README.md`](./mcp/README.md).

#### CLI vs MCP — paired layers, not alternatives

| Layer                     | Tool                              | Runs when                       | Purpose                                                                |
| ------------------------- | --------------------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| **Distribution**          | `agent-skills-standard` (CLI)     | Manually, before AI session     | Fetches & writes `SKILL.md` files; generates `AGENTS.md` + `_INDEX.md` |
| **Runtime / Enforcement** | `agent-skills-standard-mcp` (MCP) | Auto-launched by the AI runtime | Serves matched `SKILL.md` to live agents on demand; provides audit log |

Use both when you want enforcement receipts: the CLI installs the rules, the MCP makes sure agents load them.

---

## SDLC Workflow Spine

The registry now ships a compact lifecycle that agents can run natively after sync:

| Stage      | Synced Workflow                 | Output                        |
| :--------- | :------------------------------ | :---------------------------- |
| Route      | `sdlc`                          | next workflow and blockers    |
| Brainstorm | `brainstorm-feature`            | `product-brief.md`            |
| Plan       | `plan-feature`                  | PRD, decisions, task slices   |
| Design     | `design-solution`               | architecture, contracts, ADR  |
| Readiness  | `implementation-readiness`      | go/no-go before code          |
| Build      | `implement-feature` / `dev-fix` | implementation handoff        |
| Review     | `code-review`                    | focused or ticket-enriched review verdict |
| Verify     | `verify-work` / `verify-bug`    | `walkthrough.md` evidence     |
| Security   | `pentest` / `security-test`     | hacker report, PoC, SAST logs |

### Session Telemetry

The registry now includes the `common-telemetry` skill and a companion MCP tool `get_session_cost()`. At the end of every workflow, the agent can now report MCP-observed session telemetry plus exact-or-estimated token cost when the host runtime supplies usage and pricing data.

See [SDLC Workflow Quick Reference](./docs/sdlc-workflow-quick-reference.md).

### Session Retrospectives

**Session retrospectives — local, evidence-backed reports prepared through the MCP server; no model calls and no automatic skill changes.** The server exposes `prepare_retrospective` (orchestrator or unassigned agent only; takes optional `title` up to 200 chars, shown as agent-supplied and unverified), `get_retrospective_status` (consent state only), and `prepare_retrospective_index` (cross-session index generation) on the stdio transport, so this works with or without OMP or Paseo. A human opts in once by running `ags retrospective enable` in an interactive terminal — agents cannot enable it. After about 20 substantive tool calls, `audit_session_compliance` and `get_session_cost` append a nudge asking the orchestrator to prepare one; the tool then aggregates counts in one bounded local pass and publishes `summary.md`, `ledger.json` and `report.html` under the store root (`~/ags/diagnostics` by default). To inspect patterns across multiple sessions, `ags retrospective index` and `prepare_retrospective_index` generate `<storeRoot>/index.html` from stored v2 ledgers (zero model calls, no session files opened, no command text). Report bodies are never returned through the MCP surface: the tools return only state, counts, an artifact id and file paths. Zero model calls, zero network requests, no skill or workflow edits.

**Unreleased source.** No registry version contains any of this and nothing is published. Start here:

- [First-run guide](./docs/session-retrospective.md) — opt-in, nudge, tools, result states, report layout, cross-session index.
- [Privacy and retention](./docs/session-retrospective-privacy.md) — read boundary, never-read list, consent file, retention.
- [Host integration](./docs/session-retrospective-hosts.md) — OMP, Codex, Claude Code and Gemini coverage, transport rule, session sources.

Guidance lives in `skills/common/common-session-retrospective`. Skill, workflow and rule text that would trigger the tool is not part of this change; it comes later, after a value pilot. Status: the source builds and passes its test suite and CLI/tarball smoke locally on macOS; unpublished — see `CHANGELOG.md` → `[Unreleased]`. Windows and Linux runtime remain unverified; no CI job runs on Windows.

## Default SDLC Support

`ags init` includes framework skills plus shared SDLC support categories when the registry provides them:

| Surface               | How It Syncs                                                                                                                                                                                                                          |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `quality-engineering` | Included as a skill category for BA review, Jira traceability, QA standards, browser/mobile verification, and Zephyr coverage                                                                                                         |
| `specialists`         | Converted directly into native sub-agent files for Jira analysis, codebase scouting, architecture/security review, AC verification, test gaps, PR metadata, Zephyr/Confluence lookup, PR comments, integration tests, and TC creation |

External tasking MCPs such as Jira, Azure DevOps, and Zephyr are integration points, not required dependencies. Workflows should use them when already connected, but every workflow must still work from local tickets, specs, and evidence files so teams can customize their own automation stack.

For security-sensitive autonomous review, prefer a sandboxed runtime with least-privilege tools, isolated credentials, and default-deny outbound network. That aligns with the safety direction shown by NVIDIA OpenShell's policy-enforced sandboxes and Anthropic's warning that PR security review should stay on trusted inputs unless the runtime is hardened.

For review workflows specifically, the next-tier operating model is:

- OpenShell-style runtime contract and auditability.
- Anthropic-style diff-first, high-confidence security review.
- SecurityReview.ai-style clear, role-aware review handoff.

In practice that means:

- security reviews emit concise markdown artifacts and handoff notes instead of a large JSON contract layer
- untrusted PR or ticket prose is treated as hostile content, not as execution instructions
- Canonical review is `code-review`; explicitly configured consumer `.skillsrc` selections for retired `review-ticket` must be authorized and updated to `code-review` (no alias). Only `code-review` emits `review-delivery.md` for channel handoff or approved PR comment publication.
- broad repo health audits emit `codebase-review.md` separately from `security-review.md` so engineering health and exploitability stay distinct

For repository enforcement, keep the workflows and skills lean: the source of truth lives in `skills/` and `.agents/workflows/`, not in MCP-only artifact helpers, fixture packs, or replay chains.

See also [Learning From agentic-ai](./docs/agentic-ai-learning.md) and the [Optional MCP Integration Guide](./docs/mcp-integration-guide.md) and [UI Automation Drivers](./docs/ui-automation-drivers.md).

## Modular Skills Catalog

Skills are structured for token efficiency and ship with transcript-assertion evals in `evals/evals.json`. The authoritative catalog — categories, skills, descriptions, and priority tiers — is the generated [Skills Directory](./skills/README.md), rebuilt by the index generator from the skill sources in `skills/`. Default installation via `ags init` synchronizes only the specific categories configured in your project's `.skillsrc`, never the full registry catalog.

> Full skill catalog and metrics: [Skills Directory](./skills/README.md) | [Benchmark Report (Size & Structure)](./benchmark-report.md) | [Live Evals Report (Transcript Assertions)](./evals-report.md) | [Live Eval Methodology](./docs/EVALS.md)

Historical measurements are dated, release-scoped snapshots under [`benchmarks/archive/`](./benchmarks/archive) (for example [v2.6.1, 2026-09-23](./benchmarks/archive/v2.6.1.md): 288 skills, 593 average tokens per loaded skill, 40% upper-bound reduction versus heavy reference instruction baselines). They are not current catalog-wide averages.

---

## Configuration

The `.skillsrc` file controls what gets synced:

```yaml
registry: https://github.com/HoangNguyen0403/agent-skills-standard
agents: [cursor, copilot, claude, gemini]
# `ags skills` records explicit mode after a real selection change so ordinary
# sync no longer re-adds categories you deliberately removed.
# skills_mode: explicit
# Standard registry skills
skills:
  flutter:
    ref: flutter-v1.6.3
    exclude: ["getx-navigation"] # Don't use GetX? Exclude it.
    custom_overrides: ["bloc-state"] # Protect your local modifications.
  react:
    ref: react-v1.3.3
  golang:
    ref: golang-v1.3.2
  common:
    ref: common-v2.0.3

# Local custom standalone skills
custom_skills:
  - path: "./.skills/my-custom-rule.md"
    triggers: ["*.ts", "keyword"]
```

Skills are **package-aware**: if your Flutter project uses BLoC but not GetX, just exclude the GetX skills. The AI only sees what's relevant to your stack. The **`custom_skills`** feature allows you to index your own `.md` files directly into `AGENTS.md` and `_INDEX.md`, ensuring your project-specific rules are always visible to the AI.

### Workflow Selection

```yaml
workflows:
  - sdlc
  - brainstorm-feature
  - plan-feature
  - design-solution
  - implement-feature
  - verify-work
  - pentest
  - security-test
  - deploy-release
  - publish-notes
  - retro-learn
```

Workflows sync to the native surface for each selected agent. Keep `.agents/workflows` as the canonical source in this registry; Codex receives generated workflow skills under `.codex/skills/<workflow>/SKILL.md`.

Every configured provider, including a provider-only install, gets the canonical workflow body installed once at `.agents/workflows/<name>.md`, and native exports are derived from that same content. `.skills-lock.json` records the verified catalog (path, digest, registry ref, resolved commit and native bindings), so MCP `list_workflows` / `get_workflow` return what native invocation actually installed. A native export whose bytes differ from the deterministic output (user edit, unowned file, or another alias at the same path) is stored as a conflict instead of a verified binding, so parity is not claimed. Lookup reports `managed`, `local_source` (no lock; no parity claim), `unverified` (lock without catalog metadata; run `ags sync`) or `unavailable` — an absent workflow is never replaced by unrelated content. An interrupted or partial sync keeps the previous catalog instead of claiming alignment.

---

## How AI Agents Find Skills

Every AI agent follows the same hierarchical lookup — no agent-specific setup needed:

```bash
AGENTS.md (compact router)
   |
   |  "Editing *.go? Read golang/_INDEX.md"
   v
_INDEX.md (per-category trigger table)
   |
   |  File Match:  golang-database     internal/adapter/repository/**
   |  Keyword:     golang-security     encrypt, auth, validate
   v
SKILL.md (loaded on demand)
   |
   |  The actual engineering rules
   v
Your AI writes code that follows your standards.
```

**File Match** = auto-checked when you edit a matching file.
**Keyword Match** = checked only when your prompt mentions the concept.

This means editing a `.ts` file loads only the skills matched for that file pattern and prompt, rather than the whole catalog.

---

## Walkthrough — NestJS backend feature

Picture a developer in Cursor or Claude Code asking:

> _"Add a POST /orders endpoint that validates the body and returns 201."_

Here's what happens **with** the MCP, step by step.

### 1. Agent identifies the file it will touch

```text
src/orders/orders.controller.ts
```

### 2. Agent calls the MCP — BEFORE writing any code

```jsonc
// Tool call from the agent
{
  "name": "load_skills_for_files",
  "arguments": { "files": ["src/orders/orders.controller.ts"] },
}
```

### 3. The MCP returns 11 skills — direct + composite

```text
matched-by                                   skill
──────────────────────────────────────────  ─────────────────────────────────────
file:**/*.ts                                 typescript/typescript-language
file:**/*.controller.ts                      nestjs/nestjs-api-standards
file:**/*.controller.ts                      nestjs/nestjs-controllers-services
file:**/*.controller.ts                      nestjs/nestjs-file-uploads
file:**/*.controller.ts                      nestjs/nestjs-real-time
file:**/*.controller.ts                      nestjs/nestjs-transport
composite via typescript/typescript-language common/common-best-practices
composite via nestjs/nestjs-api-standards    common/common-api-design
composite via nestjs/nestjs-file-uploads     common/common-security-standards
composite via nestjs/nestjs-real-time        common/common-performance-engineering
composite via nestjs/nestjs-transport        system-design/system-design-principles
```

### 4. The agent now has these team rules in context

| From skill                       | Rule the agent now follows                                     |
| -------------------------------- | -------------------------------------------------------------- |
| `typescript-language`            | Strict typing, `unknown` over `any`, satisfies operator        |
| `nestjs-controllers-services`    | Controllers stay thin; logic lives in services                 |
| `nestjs-api-standards`           | DTOs with `class-validator`, consistent error envelopes        |
| `nestjs-transport`               | `@HttpCode(201)`, ParseUUIDPipe, response shape                |
| `common-best-practices`          | Functions < 30 lines, guard clauses, intention-revealing names |
| `common-api-design`              | Status codes, pagination, idempotency, OpenAPI conventions     |
| `common-security-standards`      | Authn/authz, input sanitization, secret handling               |
| `system-design-principles`       | Module boundaries, coupling rules                              |
| `common-performance-engineering` | Async patterns, N+1 query checks                               |

### 5. The agent writes the code AND calls the audit before claiming done

```jsonc
{ "name": "audit_session_compliance" }
```

```text
# Session compliance
Skills loaded: 11
- common/common-api-design
- common/common-best-practices
- common/common-performance-engineering
- common/common-security-standards
- system-design/system-design-principles
- nestjs/nestjs-api-standards
- nestjs/nestjs-controllers-services
- nestjs/nestjs-file-uploads
- nestjs/nestjs-real-time
- nestjs/nestjs-transport
- typescript/typescript-language
```

### What the same scenario looks like WITHOUT the MCP

The agent reads `AGENTS.md` (maybe), walks the router (maybe), reads the matched `_INDEX.md` (maybe), and reads matched `SKILL.md` files (often skipped — especially in sub-agents that don't inherit `CLAUDE.md`). Result:

|                                                                        | With MCP                      | Without MCP                           |
| ---------------------------------------------------------------------- | ----------------------------- | ------------------------------------- |
| `typescript-language` rules                                            | ✅ Loaded                     | ⚠️ Sometimes                          |
| `nestjs-*` framework rules                                             | ✅ All 5 loaded               | ⚠️ One or two if lucky                |
| `common-best-practices` (function size, naming, guard clauses)         | ✅ Loaded via composite       | ❌ Almost never                       |
| `common-api-design` (status codes, pagination)                         | ✅ Loaded via composite       | ❌ Almost never                       |
| `common-security-standards` (input validation, auth)                   | ✅ Loaded via composite       | ❌ Almost never                       |
| Provable audit log of what informed the code                           | ✅ `audit_session_compliance` | ❌ None                               |
| Behavior in sub-agents (`tdd-implementer`, `architecture-guard`, etc.) | ✅ Complete body per request    | ❌ Worse — sub-agents inherit nothing |

That's the reason the MCP exists: every request returns the complete matched bodies, read at request time, so one actor's earlier lookup can never suppress another context's instructions. Host propagation, scheduled invocation and enforcement remain host-owned; the MCP records selection and returned bodies, not comprehension.

### 🤖 Sub-Agents & Specialists

Agent Skills Standard supports **Specialist Sub-Agents**. These are focused personas (for example `@specialist-tdd-implementer`, `@specialist-architecture-guard`, `@specialist-ac-verifier`) that you can delegate specific parts of your workflow to.

- **Strict Budget**: Specialists have one role, bounded tool/file usage, structured output, and no nested sub-agent spawning.
- **Context Hygiene**: By delegating to a sub-agent, the "noise" of granular implementation stays out of your main chat context.
- **Unified Sync**: Specialists sync to native agent folders such as `.claude/agents`, `.codex/agents`, `.cursor/agents`, `.gemini/agents`, `.opencode/agents`, and `.github/agents` (`<name>.agent.md` for Copilot). Serialized definitions are not proof of runtime support: native delegation status is version-, revision- and control-scoped, and reported as `not_verified` until live execution evidence exists.
- **Projected controls**: Copilot maps only documented tool aliases (and writes `tools: []` for a declared all-unknown allowlist); Claude projects native and universal tool names; Gemini projects a declared native `tools` list verbatim, including an explicit empty one; Codex and OpenCode disclose declared restrictions instead of emitting unenforced keys.

---

## Security & Trust

Skill payloads are **Markdown and JSON guidance plus a small number of helper scripts** (for example `common-subagent-driven-development/scripts/task_brief.py` and the Appium `preflight.sh`). Installing or syncing never executes them; a helper runs only if you or your agent explicitly invokes it. This repo's posture is mapped against the [OWASP Agentic Skills Top 10](https://owasp.org/www-project-agentic-skills-top-10/) — see [docs/SECURITY.md](./docs/SECURITY.md) for the full AST01–AST10 coverage table. Here's the full picture:

### SkillSpector Security Scanning

Every skill outside the documented skip list below is automatically scanned by **[NVIDIA SkillSpector](https://github.com/nvidia/skillspector)** — a purpose-built security scanner for AI agent skills. The pipeline checks **64 vulnerability patterns across 16 categories** including prompt injection, data exfiltration, privilege escalation, supply chain attacks, and MCP tool poisoning.

- ✅ **PR gate (configured)**: CI is configured to require the scan for any PR that modifies `skills/**`; this describes the gate configuration, not proof about artifacts published outside it
- 🔒 **Verified by SkillSpector (configured)**: the workflow is configured to create a dated `skillspector-verified-vYYYYMMDD` tag on `main` when all scanned skills pass the gate
- ⚠️ **Skipped verification**: 3 security-guidance skills — `common-owasp`, `common-pentest-methodology`, `common-llm-security` — are excluded from the automated scan; a real CI run confirmed their `SKILL.md` legitimately trips the scanner from educational content. The other 4 (including `common-security-audit`) are scanned like every other skill
- 📊 **SARIF reports**: Results are uploaded to the [GitHub Security tab](https://github.com/HoangNguyen0403/agent-skills-standard/security/code-scanning) for full transparency

See [docs/SECURITY.md](./docs/SECURITY.md) for the full security policy, threshold definitions, and instructions for running the scanner locally before submitting a PR.

### What Skills Are

- **Markdown/JSON guidance plus helper scripts** — no binaries; scripts are inert until explicitly invoked
- **Not auto-executed** — syncing writes files; it does not run skill scripts or grant tool permissions
- **Open source** — every skill is auditable on GitHub before you use it

### What the CLI Does

- **Downloads text payloads only** — fetches Markdown, JSON, and referenced helper-script text from the [public registry](https://github.com/HoangNguyen0403/agent-skills-standard); it does not execute them
- **Verifies before writing** — every downloaded file's git blob sha is checked against the tree API, with a 1 MiB size cap, before it's written to disk
- **No telemetry by default** — no data collection, no analytics, no background daemons. An opt-in local usage log (`AGS_TELEMETRY=1`) writes per-session skill-load counts to `~/.agent-skills-standard/telemetry.jsonl` and is never uploaded; see [docs/FRESHNESS.md](docs/FRESHNESS.md#usage-telemetry-local-opt-in); a project's `.skillsrc` can also enable it, in which case the MCP prints a startup notice
- **The CLI itself sends no project data** — feedback is only sent if you explicitly run `ags feedback`. This covers the CLI, not helper scripts or instructions an agent may later execute; review a skill before invoking its scripts

### How Skills Stay Safe

- **Prompt injection scanning** — every skill's `description`, body, and `references/*.md` are scanned against known injection patterns (zero-width/bidi characters, imperative HTML comments, curl-pipe-to-shell, etc.) at CI time and index-generation time
- **Skill-content lockfile** — `ags sync` writes `.skills-lock.json` (a sha256 per installed file); run `ags verify` any time to detect drift between what was fetched and what's actually on disk
- **Least-privilege declarations** — skills can optionally declare `risk_tier`, `allowed-tools`, and `permissions` in frontmatter, projected onto each platform's native mechanism where one exists (e.g. Codex `sandbox_mode`)
- **Opt-in enforcement** — `ags hooks install --enforce` makes Claude's PreToolUse hook actually block (not just remind) edits to a fixed identity/secret deny-list (`SOUL.md`, `MEMORY.md`, `.env*`, `.ssh/`, `credentials*.json|yaml`)
- **Automated eval datasets** — many skills ship `evals.json` transcript-assertion datasets scored against response text; they measure assertion pass rates, not executable task success or guaranteed adherence
- **Zero-Trust audit request** — the generated `AGENTS.md` asks the agent to declare which skills it loaded before writing code. This is an advisory audit request; whether it is honored depends on the host/model, so it is not enforced prevention
- **Deterministic benchmarks** — structural size checks and the weekly drift gate compare recorded runs against fixed baselines; they are not periodic live adversarial model experiments
- **Vibe Security Scan** — review and pentest workflows include a compact lens for the 20 common AI-generated security bugs, including IDOR, SSRF, traversal, weak JWTs, upload abuse, and slopsquatting
- **Supply chain** — pinned secret scanning (gitleaks), blocking dependency review, Dependabot, and a release workflow configured to publish with `npm publish --provenance`. That is a configured gate; it is not proof that every previously published artifact carries verified provenance or attestation
- **Governance** — [CODEOWNERS](./.github/CODEOWNERS) on security-sensitive paths, per-category owners, and a `revocations` list checked on every sync (`ags audit` prints the current inventory)

---

## FAQ

<details>
<summary><b>Does this work with Cursor, Claude Code, Copilot, Gemini?</b></summary>
<br>
Yes — all of them, plus Windsurf, Trae, Kiro, Roo, and Antigravity. The CLI generates each agent's native format automatically. No plugin needed.
</details>

<details>
<summary><b>How is this different from .cursorrules or system prompts?</b></summary>
<br>
<code>.cursorrules</code> and system prompts are static — one big file that the AI reads every time, wasting context. Agent Skills Standard uses <b>hierarchical on-demand loading</b>: the AI is pointed at the specific skills relevant to what you're editing right now. Loading is bounded to the index rows and skills that match the current edit; behavioral adherence remains model-dependent.
</details>

<details>
<summary><b>Will it overwrite my custom rules?</b></summary>
<br>
No. Use <code>custom_overrides</code> in your <code>.skillsrc</code> to protect any files you've customized locally. The CLI will skip them during sync.
</details>

<details>
<summary><b>How do I add my own skills?</b></summary>
<br>
Create a <code>SKILL.md</code> file in your agent's skills directory (e.g., <code>.cursor/skills/my-custom/SKILL.md</code>). It will be automatically included in the index on the next sync. For contributing to the public registry, see below.
</details>

<details>
<summary><b>What about token costs?</b></summary>
<br>
Skills are intentionally compact compared with multi-thousand-token reference instruction prompts. Per-skill token measurements live in the <a href="./benchmark-report.md">benchmark report</a> and in dated release snapshots under <a href="./benchmarks/archive/">benchmarks/archive</a> — for example v2.6.1 (2026-09-23) measured 288 skills at 593 average tokens per loaded skill with an upper-bound 40% size reduction against heavy reference instruction baselines. Those figures are historical snapshot measurements, not a current catalog-wide average or a runtime guarantee. Behavioral testing is tracked via transcript-assertion evaluations in <a href="./evals-report.md">evals-report.md</a> (where overall catalog release readiness remains marked NOT READY), rather than guaranteed runtime savings.
</details>

---

## Questions & Community

Have a question, feedback, or an idea?
- **Discussions**: Ask questions and share ideas in [GitHub Discussions](https://github.com/HoangNguyen0403/agent-skills-standard/discussions).
- **Issues & Bug Reports**: Report defects or request enhancements on [GitHub Issues](https://github.com/HoangNguyen0403/agent-skills-standard/issues).
- **CLI Feedback**: Submit feedback directly from the CLI via `ags feedback`.

*(Note: Community discussions and issue tracking are handled on an open-source best-effort basis; no formal response SLA is implied.)*

---

## Contributing

We welcome contributions of new skills, workflows, and tooling improvements!

1. **Read the Guidelines**: See [CONTRIBUTING.md](./CONTRIBUTING.md) for complete developer setup, testing standards, and quality gates.
2. **Propose**: Open a discussion or [issue](https://github.com/HoangNguyen0403/agent-skills-standard/issues) describing your skill proposal or bug fix.
3. **Develop & Test**: Follow the skill authoring guidelines in [CONTRIBUTING.md](./CONTRIBUTING.md) and verify token budgets and eval assertions.
4. **Submit PR**: CI validates format, token budget, and security injection safety before merge.

For architectural context and service internals, see [ARCHITECTURE.md](./ARCHITECTURE.md) and [CLI Architecture](./cli/ARCHITECTURE.md).
---

## 🧪 Live Evals — Measured, Not Just Structural
[`benchmark-report.md`](./benchmark-report.md) measures skill **size** — tokens, structure, rubric score against synthetic baselines. [`evals-report.md`](./evals-report.md) records transcript-assertion evaluations of **recorded runs**: sample prompts were run with and without skills and the saved response transcripts are scored against substring assertions in `evals/evals.json`. Note that transcript assertions evaluate text outputs under experimental conditions (catalog release readiness currently reports NOT READY), not live tool execution or guaranteed runtime compliance.
This runs inside any coding agent's normal chat session (Claude Code, Copilot, Codex, Antigravity — no API key needed beyond what you already use to run that agent), and every result is independently verifiable afterward with no agent involved:

```bash
pnpm evals:verify -- --all   # re-score every committed run, no API key, no LLM call
```

See [docs/EVALS.md](./docs/EVALS.md) for the full protocol, the trust model, and how to run your own category.

---

## License & Credits

- **License**: MIT
- **Author**: [Hoang Nguyen](https://github.com/HoangNguyen0403)

### 📜 Benchmark History

| Version | Date       | Skills | Avg Tokens | Savings (%) | Report                                 |
| ------- | ---------- | ------ | ---------- | ----------- | -------------------------------------- |
| v2.6.1  | 2026-09-23 | 288    | 593        | 40%         | [Report](benchmarks/archive/v2.6.1.md) |
| v2.6.0  | 2026-07-10 | 264    | 528        | 46%         | [Report](benchmarks/archive/v2.6.0.md) |
| v2.4.7  | 2026-06-15 | 251    | 551        | 85%         | [Report](benchmarks/archive/v2.4.7.md) |
| v2.4.6  | 2026-06-10 | 251    | 548        | 85%         | [Report](benchmarks/archive/v2.4.6.md) |
| v2.4.1  | 2026-05-18 | 247    | 540        | 85%         | [Report](benchmarks/archive/v2.4.1.md) |
| v2.4.0  | 2026-05-14 | 246    | 540        | 85%         | [Report](benchmarks/archive/v2.4.0.md) |
| v2.3.0  | 2026-05-13 | 246    | 540        | 85%         | [Report](benchmarks/archive/v2.3.0.md) |
| v2.2.2  | 2026-05-09 | 249    | 539        | 85%         | [Report](benchmarks/archive/v2.2.2.md) |
| v2.2.0  | 2026-04-22 | 242    | 538        | 85%         | [Report](benchmarks/archive/v2.2.0.md) |
| v2.1.2  | 2026-04-11 | 237    | 516        | 86%         | [Report](benchmarks/archive/v2.1.2.md) |
| v2.1.1  | 2026-04-11 | 237    | 516        | 86%         | [Report](benchmarks/archive/v2.1.1.md) |
