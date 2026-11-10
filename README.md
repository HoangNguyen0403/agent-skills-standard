# Agent Skills Standard

[![NPM Version](https://img.shields.io/npm/v/agent-skills-standard.svg?style=flat-square)](https://www.npmjs.com/package/agent-skills-standard)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/HoangNguyen0403/agent-skills-standard?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/stargazers)
[![SkillSpector Verified](https://img.shields.io/badge/SkillSpector-Verified-76b900?style=flat-square&logo=nvidia&logoColor=white)](https://github.com/HoangNguyen0403/agent-skills-standard/security/code-scanning)

**Agent Skills Standard is the portable coding standards and workflow layer for AI coding agents — sync once with `ags`, then work in your existing IDE or CLI runtime.**

It provides a modular, version-controlled catalog of engineering rules, architectural guidelines, and software development lifecycle (SDLC) workflows compiled into native configurations for **Cursor, Claude Code, GitHub Copilot, Gemini CLI, OpenAI Codex, Windsurf, Trae, Kiro, Roo Code, OpenCode, and Antigravity**, plus an optional **Model Context Protocol (MCP) server** (`agent-skills-standard-mcp`) for on-demand runtime loading and consultation auditing.

> [!NOTE]
> **Specification & Runtime Boundary**: This repository is an open-source skill catalog, distribution CLI (`ags`), and companion MCP server (`agent-skills-standard-mcp`). It provides skills conforming to the open Agent Skills format, but it does **not** own or govern the underlying specification, nor does it replace your existing AI coding assistant, IDE, or agent runtime.

---

## Why Teams Use Agent Skills Standard

Monolithic system prompts and static `.cursorrules` files can drift across team copies, add token overhead, and require tool-specific adaptation. When models receive too many global instructions, they lose focus; with too few, they violate project conventions.

Agent Skills Standard replaces prompt repetition with **modular, version-controlled `SKILL.md` rules** loaded hierarchically on demand:

- **Engineering teams & tech leads**: Share consistent architectural boundaries, strict typing, security checks, and testing standards across multiple AI editors from one `.skillsrc` manifest.
- **Individual developers**: Replace ad-hoc prompt repetition with focused rules loaded only for the specific files and tasks you touch.
- **Product owners & non-engineers**: Run structured discovery and planning workflows in your AI assistant without manual CLI configuration. See [Getting Started: Product Owner](docs/getting-started-product-owner.md).

### How It Works: Zero-Trust Hierarchical Loading

Instead of injecting thousands of lines into every chat, your AI assistant navigates a three-tier tree:

1. **`AGENTS.md` (Router Table)**: Points active file extensions and tasks to matching category indexes.
2. **`_INDEX.md` (Category Trigger Table)**: Maps file patterns and keyword concepts to specific skills.
3. **`SKILL.md` (Domain Guidance)**: Focused engineering standards with a design target of under 100 lines each, loaded on demand.

---

## Quick Start

### Prerequisites

- **Consumer CLI (`ags`)**: Node 22 LTS `>= 22.13` (declared dependency intersection `^22.13.0 || >= 23.5.0` between `commander` 15 and `inquirer` 14; see [CLI Prerequisites](cli/README.md#prerequisites)).
- **Repository Tooling**: Root `package.json` declares Node `20+` for root development scripts only. Contributors see [CONTRIBUTING.md](CONTRIBUTING.md).

### Installation & Usage

Install the `ags` CLI globally to initialize `.skillsrc` for your stack and sync native configurations:

```bash
# Recommended: Global install and sync
npm install -g agent-skills-standard@latest
ags init
ags sync
```

Or run directly with `npx` without global installation:

```bash
# Alternative: Run via npx
npx agent-skills-standard@latest init
npx agent-skills-standard@latest sync
```

> [!TIP]
> **Published Version vs. Source Target**: The published `@latest` package may differ from source development (`2.7.4` in this repository checkout). Verify your installed build with `ags --version` and review [Release & PATH Notes](cli/README.md#release-and-path-notes). In supported CLI builds, use `ags skills` for interactive category management.

---

## Configuration

The `.skillsrc` manifest controls configured agents, skill categories, exclusions, custom rules, and workflows:

```yaml
registry: https://github.com/HoangNguyen0403/agent-skills-standard
agents: [cursor, copilot, claude, gemini]
skills:
  react:
    ref: react-v1.3.3
  golang:
    ref: golang-v1.3.2
    exclude: ["golang-tooling"] # Skip skills you don't need
    custom_overrides: ["golang-testing"] # Protect local edits
custom_skills:
  - path: "./.skills/my-custom-rule.md"
    triggers: ["*.ts", "keyword"]
```

User modifications to owned files are preserved by default (`.skills-lock.json` v2). For the complete configuration schema (`custom_skills`, `workflows`, `mcp`), safe sync options, dry runs, backups, and uninstallation, see [CLI Configuration & Commands](cli/README.md#configuration).

---

## Runtime Delivery via MCP

While `ags sync` distributes files to disk before an AI session, the companion **`agent-skills-standard-mcp`** server serves matched skills to live agents and sub-agents at runtime and logs consultation receipts:

- **Explicit auditability**: Live agents call `load_skills_for_files` and `audit_session_compliance` before code generation.
- **Full bodies per request**: The MCP returns complete matched skill bodies on each request; host propagation, session delivery, and enforcement remain host-owned.
- **Four-scope consent**: `project` (default, touches no `$HOME` files), `user`, `snippets-only`, and `disabled`. See [MCP Consent & Scopes](cli/README.md#consent-model--you-choose-the-scope).

### Launch mode — pick once, then forget

The companion MCP server starts either through `npx` or a globally installed `ags-mcp` binary (stored as `mcp.via` in `.skillsrc`, defaulting to `auto`). Every mode targets the effective pin — `mcp.version` when set in `.skillsrc`, otherwise the version compiled into this CLI checkout (`0.8.2`):

- **`auto` (default)**: Uses a globally installed `ags-mcp` when its reported version equals the effective pin, otherwise falls back to `npx`. On Windows, `auto` stays on `npx` because Node-based clients cannot spawn a `.cmd` shim directly without a shell.
- **`npx`**: Runs `npx -y --prefer-offline agent-skills-standard-mcp@<pin>` with no global installation assumptions.
- **`global`**: Spawns `ags-mcp` directly (or `cmd /c ags-mcp` on Windows) for the fastest startup.

For the recommended happy-path command sequence, decision criteria, upgrade steps, and manual integration snippets, see the [MCP Integration Guide](docs/mcp-integration-guide.md#ags-mcp-server-launch-modes) and [MCP Walkthrough](mcp/README.md).

---

## SDLC Workflows & Capabilities

Agent Skills Standard syncs native slash commands, prompts, and agent configurations across the software development lifecycle:

| Stage | Workflow | Primary Output |
| :--- | :--- | :--- |
| **Route & Plan** | `sdlc`, `brainstorm-feature`, `plan-feature` | Direction briefs, PRDs, task slices |
| **Design & Architecture** | `design-solution`, `review-system-design` | Architecture specs, contracts, ADRs |
| **Readiness & Code** | `implementation-readiness`, `implement-feature`, `dev-fix` | Verified prerequisites, TDD implementation |
| **Review & Security** | `code-review`, `security-test`, `pentest` | Security findings, review handoffs |
| **Verify & Release** | `verify-work`, `deploy-release`, `retro-learn` | Acceptance evidence, cloud operations, retrospectives |

- **Session Retrospectives**: Local, evidence-linked session analysis via `prepare_retrospective` through the MCP server writing local reports with zero external model calls and no automatic skill or workflow edits. See [Session Retrospective Guide](docs/session-retrospective.md).
- **Specialist Sub-Agents**: Focused personas (`@specialist-tdd-implementer`, `@specialist-architecture-guard`, `@specialist-ac-verifier`) that declare bounded roles and tools with native agent projections. See [Agent Capabilities](docs/agent-capabilities.md) and [ARCHITECTURE.md](ARCHITECTURE.md).
- **Workflow Reference**: Detailed stage instructions and triage matrices live in the [SDLC Workflow Quick Reference](docs/sdlc-workflow-quick-reference.md).

---

## Security & Trust

Skills provide structured guidance (Markdown, JSON, JSDoc conventions, and inert helper scripts) and never execute code during synchronization.

- **Integrity verification**: `ags sync` validates git blob SHAs with a 1 MiB size cap and records SHA-256 digests in `.skills-lock.json`. Run `ags verify` anytime to check for tampering.
- **Automated security scanning**: Skills in `skills/**` are scanned by [NVIDIA SkillSpector](https://github.com/nvidia/skillspector) in CI across 64 vulnerability patterns (prompt injection, exfiltration, tool poisoning). Three educational security-guidance skills (`common-owasp`, `common-pentest-methodology`, `common-llm-security`) are documented scanner exceptions. See [docs/SECURITY.md](docs/SECURITY.md).
- **Zero telemetry by default**: No tracking, analytics, or background daemons. Local usage logs (`AGS_TELEMETRY=1`) write locally to `~/.agent-skills-standard/telemetry.jsonl` and are never uploaded.
- **Advisory pre-edit hooks**: `ags hooks install` sets an advisory `PreToolUse` reminder; `ags hooks install --enforce` optionally blocks edits to sensitive credential and secret paths.

---

## Live Evals & Benchmark History

- **Size & Structure**: Per-skill token footprints and structural rubric scores are tracked in [benchmark-report.md](benchmark-report.md). Historical size snapshots live under [benchmarks/archive/](benchmarks/archive/) (e.g., [v2.6.1](benchmarks/archive/v2.6.1.md): 288 skills, 593 avg tokens, 40% upper-bound reduction vs. heavy baselines), not runtime-savings guarantees.
- **Transcript Assertions**: Recorded response-text evaluations against substring assertions live in [evals-report.md](evals-report.md) (catalog readiness reports `NOT READY`), measuring text outputs rather than executable task success or compliance. Verifiable without API keys or LLM calls via `pnpm evals:verify -- --all`. See [docs/EVALS.md](docs/EVALS.md).

---

## Frequently Asked Questions

### Which AI coding agents and IDEs are supported?

Cursor, Claude Code, GitHub Copilot, Gemini CLI, OpenAI Codex, Windsurf, Trae, Kiro, Roo Code, OpenCode, and Antigravity. The `ags` CLI compiles native configurations for each tool with no custom editor plugins required.

### How does this differ from `.cursorrules` or system prompts?

Static instruction files load monolithic text into every prompt. Agent Skills Standard uses hierarchical lookup (`AGENTS.md` -> `_INDEX.md` -> `SKILL.md`) to consult only rules matching active file patterns and task keywords, narrowing relevant context while behavioral adherence remains model-dependent.

### What is the difference between the `ags` CLI and the MCP server?

The `ags` CLI distributes skills to disk before your session. The companion `agent-skills-standard-mcp` server delivers skills on demand at runtime and provides consultation receipts (`audit_session_compliance`).

### Will `ags sync` overwrite local modifications?

No. User-modified files are preserved and reported. You can protect customizations using `custom_overrides` in `.skillsrc`, preview updates with `ags sync --dry-run`, or restore from `.ags/backups/` via `ags restore <id>`.

### How do I add custom project skills?

Add local rules in your agent directory or register `.md` paths under `custom_skills` in `.skillsrc`. They are indexed automatically into `AGENTS.md` and `_INDEX.md` on the next sync.

### Can `ags sync` execute arbitrary code?

No. Syncing downloads text files and inert helper scripts only. Git blob SHAs are verified before writing, and no scripts are run during installation.

---

## Documentation & Community

- **Architecture & Design**: [ARCHITECTURE.md](ARCHITECTURE.md) | [CLI Architecture](cli/ARCHITECTURE.md)
- **Catalog & Workflows**: [Skills Directory](skills/README.md) | [SDLC Quick Reference](docs/sdlc-workflow-quick-reference.md)
- **Integration Guides**: [CLI Guide](cli/README.md) | [MCP Server Guide](mcp/README.md) | [MCP Integration Guide](docs/mcp-integration-guide.md)
- **Community & Issues**: [GitHub Discussions](https://github.com/HoangNguyen0403/agent-skills-standard/discussions) | [GitHub Issues](https://github.com/HoangNguyen0403/agent-skills-standard/issues) | `ags feedback`
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **License**: [MIT](LICENSE) — Author: [Hoang Nguyen](https://github.com/HoangNguyen0403)
