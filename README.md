# Agent Skills Standard

[![NPM Version](https://img.shields.io/npm/v/agent-skills-standard.svg?style=flat-square)](https://www.npmjs.com/package/agent-skills-standard)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/HoangNguyen0403/agent-skills-standard?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/stargazers)

**Make your AI write code like your best engineer. One command. Every AI agent. Every project.**

242 ready-to-use coding standards for **Cursor, Claude Code, GitHub Copilot, Gemini, Windsurf, Trae, Kiro, Roo** and more — synced, versioned, and optimized to use **85% fewer tokens** than traditional prompt engineering.

```bash
npx agent-skills-standard@2.2.2 init
npx agent-skills-standard@2.2.2 sync
# Done. Your AI now follows your team's engineering standards.
```

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
| 3,600+ token architect prompt in every chat | ~500 token skill, loaded only when relevant                         |
| Rules drift across team members' prompts    | Single source of truth, synced via CLI                              |
| Works in one AI tool, copy-paste to others  | Works in Cursor, Claude, Copilot, Gemini, Windsurf, Trae, Kiro, Roo |
| AI scans all rules every time (slow, lossy) | Hierarchical lookup: ~25 lines scanned per edit                     |

### How It Works

```bash
You run: npx agent-skills-standard sync

What your AI gets:

1. AGENTS.md (router ~20 lines)
   "Editing *.ts? Check typescript/_INDEX.md"

2. typescript/_INDEX.md (trigger table)
   File Match:  typescript-language  *.ts, *.tsx, tsconfig.json
   Keyword:     typescript-security  validate, sanitize, auth

3. typescript-language/SKILL.md (loaded on demand)
   The actual rules — only when needed.
```

The AI loads **only the skills that match** the file being edited and the task at hand. No wasted tokens. No forgotten rules.

---

## Architecture & Token Economy

This project follows a **Zero-Trust** architectural model inspired by **Rust Token Killer (RTK)**. Instead of injecting all rules into every prompt (which can cost 5,000+ tokens and cause "prompt loss"), we use a hierarchical loading system.

Detailed documentation is available in [ARCHITECTURE.md](ARCHITECTURE.md), covering:

- **Hierarchical Resolution**: Router Table (`AGENTS.md`) -> Category Index (`_INDEX.md`) -> Skill (`SKILL.md`).
- **Integration Taxonomy**: Multi-agent bridge support for Cursor, Claude, Copilot, Windsurf, Trae, Roo, etc.
- **High-Density Design**: All skills must be < 100 lines and optimized for token economy.

## Quick Start

### 1. Initialize

Detects your tech stack and creates a `.skillsrc` config:

```bash
npx agent-skills-standard@latest init
```

### 2. Sync

Downloads skills into your AI agent's folders and generates the index:

```bash
npx agent-skills-standard@latest sync
```

### 3. Code

Your AI agent now reads `AGENTS.md` automatically. Skills activate based on what file you're editing and what you ask for.

> **Works instantly** with Cursor, Claude Code, GitHub Copilot, Gemini CLI, Windsurf, Trae, Kiro, and Roo. No plugin or extension needed — the CLI generates each agent's native format.

### 4. (Optional) Enable runtime enforcement via the MCP server

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

Or edit `.skillsrc` directly:

```yaml
mcp:
  enabled: true
  scope: project # project | user | snippets-only | disabled
  prompted: true # set to false to be re-asked next sync
```

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

You need both — the CLI installs the rules, the MCP makes sure agents load them.

---

## 242 Skills Across 20+ Frameworks

Every skill is audited for token efficiency (averaging ~500 tokens) and tested with automated evals.

| Stack                | Key Skills                                    | Version  | Skills |
| :------------------- | :-------------------------------------------- | :------- | :----- |
| **Common Patterns**  | Best Practices, Security, TDD, Error Handling | `v2.1.0` | 32     |
| **Flutter**          | BLoC, Riverpod, Architecture, Concurrency     | `v1.7.1` | 22     |
| **React**            | Hooks, Performance, State Management          | `v1.3.5` | 8      |
| **React Native**     | Architecture, Navigation, Performance         | `v1.4.4` | 13     |
| **Next.js**          | App Router, Server Components, Caching, ISR   | `v1.4.4` | 18     |
| **Angular**          | Signals, Components, RxJS, SSR                | `v1.4.2` | 15     |
| **NestJS**           | Architecture, Security, BullMQ                | `v1.4.4` | 21     |
| **TypeScript**       | Type Safety, Security, Tooling                | `v1.3.3` | 4      |
| **JavaScript**       | ES2024+, Patterns, Tooling                    | `v1.3.4` | 3      |
| **Go (Golang)**      | Clean Arch, Concurrency                       | `v1.3.4` | 11     |
| **Spring Boot**      | Architecture, Security, JPA                   | `v1.3.3` | 10     |
| **Android**          | Compose, Navigation 3, Edge-to-Edge, AGP 9    | `v1.4.0` | 26     |
| **iOS**              | SwiftUI, Arch, Persistence                    | `v1.4.5` | 15     |
| **Swift**            | Concurrency, Memory                           | `v1.3.5` | 8      |
| **Kotlin**           | Coroutines, Language                          | `v1.3.3` | 4      |
| **Java**             | Records, Virtual Threads                      | `v1.3.3` | 5      |
| **PHP**              | PHP 8.4+, Error Handling                      | `v1.3.4` | 7      |
| **Laravel**          | Eloquent, Clean Arch                          | `v1.3.4` | 10     |
| **Dart**             | Null Safety, Sealed Classes                   | `v1.3.5` | 3      |
| **Database**         | PostgreSQL, MongoDB, Redis                    | `v1.3.4` | 3      |
| **Quality Engineer** | BA, TDD, Zephyr, Test Gen                     | `v1.5.0` | 5      |
| **Specialists**      | JIRA Analyst, TDD Implementer Sub Agent       | `v1.0.0` | 2      |

> Full skill list with token metrics: [Skills Directory](./skills/README.md) | [Benchmark Report](./benchmark-report.md)

---

## Configuration

The `.skillsrc` file controls what gets synced:

```yaml
registry: https://github.com/HoangNguyen0403/agent-skills-standard
agents: [cursor, copilot, claude, gemini]
# Standard registry skills
skills:
  flutter:
    ref: flutter-v1.6.3
    exclude: ['getx-navigation'] # Don't use GetX? Exclude it.
    custom_overrides: ['bloc-state'] # Protect your local modifications.
  react:
    ref: react-v1.3.3
  golang:
    ref: golang-v1.3.2
  common:
    ref: common-v2.0.3

# Local custom standalone skills
custom_skills:
  - path: './.skills/my-custom-rule.md'
    triggers: ['*.ts', 'keyword']
```

Skills are **package-aware**: if your Flutter project uses BLoC but not GetX, just exclude the GetX skills. The AI only sees what's relevant to your stack. The **`custom_skills`** feature allows you to index your own `.md` files directly into `AGENTS.md` and `_INDEX.md`, ensuring your project-specific rules are always visible to the AI.

---

## How AI Agents Find Skills

Every AI agent follows the same hierarchical lookup — no agent-specific setup needed:

```bash
AGENTS.md (compact router, ~20 lines)
   |
   |  "Editing *.go? Read golang/_INDEX.md"
   v
_INDEX.md (per-category trigger table)
   |
   |  File Match:  golang-database     internal/adapter/repository/**
   |  Keyword:     golang-security     encrypt, auth, validate
   v
SKILL.md (loaded on demand, ~500 tokens)
   |
   |  The actual engineering rules
   v
Your AI writes code that follows your standards.
```

**File Match** = auto-checked when you edit a matching file.
**Keyword Match** = checked only when your prompt mentions the concept.

This means editing a `.ts` file loads **6 relevant skills** instead of 27 — no confusion, no token waste.

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
composite via nestjs/nestjs-transport        common/common-system-design
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
| `common-system-design`           | Module boundaries, coupling rules                              |
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
- common/common-system-design
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
| Behavior in sub-agents (`tdd-implementer`, `architecture-guard`, etc.) | ✅ Same as orchestrator       | ❌ Worse — sub-agents inherit nothing |

That's the reason the MCP exists: the rules **automatically reach the working context** every time, in every runtime, including sub-agents.

### 🤖 Sub-Agents & Specialists

Agent Skills Standard now supports **Specialist Sub-Agents**. These are specialized personas (e.g., `@specialist-tdd-implementer`, `@specialist-jira-analyst`) that you can delegate specific parts of your workflow to.

- **Strict Persona**: Specialists are "obsessed" with their specific task (e.g., following a Red-Green-Refactor loop).
- **Context Hygiene**: By delegating to a sub-agent, the "noise" of granular implementation stays out of your main chat context.
- **Unified Sync**: Specialists are automatically synced to your agent's native specialist folders (e.g., `.cursor/agents`, `.clauderules`) during the standard `ags sync` command.

---

## Security & Trust

Skills are **text files, not code**. They cannot execute commands, access your filesystem, or make network requests. Here's the full picture:

### What Skills Are

- **Pure Markdown/JSON** — no binaries, no scripts, no executable code
- **Sandboxed** — skills run inside the AI's context window, not as OS processes
- **Open source** — every skill is auditable on GitHub before you use it

### What the CLI Does

- **Downloads text only** — fetches Markdown and JSON from the [public registry](https://github.com/HoangNguyen0403/agent-skills-standard)
- **No telemetry** — zero data collection, no analytics, no background daemons
- **No code or project data leaves your machine** — feedback is only sent if you explicitly run `ags feedback`

### How Skills Stay Safe

- **Prompt injection scanning** — every skill description is sanitized against known injection patterns (e.g., "ignore previous instructions") at index-generation time
- **Automated eval testing** — most skills include `evals.json` datasets that verify AI adherence to constraints via regression tests
- **Zero-Trust protocol** — the generated `AGENTS.md` enforces a mandatory audit: the AI must declare which skills it loaded before writing code, preventing silent rule-skipping
- **Continuous benchmarking** — skills are periodically tested against adversarial prompts to identify logic gaps and instruction drift

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
<code>.cursorrules</code> and system prompts are static — one big file that the AI reads every time, wasting context. Agent Skills Standard uses <b>hierarchical on-demand loading</b>: the AI only reads the specific skills relevant to what you're editing right now. This saves ~86% of tokens and scales to 237+ skills without performance loss.
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
Each skill averages ~500 tokens (vs ~3,600 for a typical architect prompt). The hierarchical index adds only ~25 lines of scanning overhead per edit. Teams report <b>86% reduction</b> in prompt-related token usage.
</details>

---

## Contributing

1. **Propose**: Open an [issue](https://github.com/HoangNguyen0403/agent-skills-standard/issues) with your skill idea.
2. **Build**: Fork the repo, add your skill to `skills/<category>/`, include `evals.json`.
3. **PR**: CI validates format, token count, and injection safety before merge.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for design details and [CLI Architecture](./cli/ARCHITECTURE.md) for service internals.

---

## License & Credits

- **License**: MIT
- **Author**: [Hoang Nguyen](https://github.com/HoangNguyen0403)

### 📜 Benchmark History

| Version | Date | Skills | Avg Tokens | Savings (%) | Report |
| --- | --- | --- | --- | --- | --- |
| v2.2.2 | 2026-05-09 | 249 | 539 | 85% | [Report](benchmarks/archive/v2.2.2.md) |
| v2.2.0 | 2026-04-22 | 242 | 538 | 85% | [Report](benchmarks/archive/v2.2.0.md) |
| v2.1.2 | 2026-04-11 | 237 | 516 | 86% | [Report](benchmarks/archive/v2.1.2.md) |
| v2.1.1 | 2026-04-11 | 237 | 516 | 86% | [Report](benchmarks/archive/v2.1.1.md) |
| v2.1.0 | 2026-04-04 | 237 | 526 | 86% | [Report](benchmarks/archive/v2.1.0.md) |
| v2.0.1 | 2026-03-30 | 238 | 527 | 86% | [Report](benchmarks/archive/v2.0.1.md) |
| v2.0.0 | 2026-03-25 | 235 | 523 | 86% | [Report](benchmarks/archive/v2.0.0.md) |
| v1.10.3 | 2026-03-21 | 234 | 505 | 86% | [Report](benchmarks/archive/v1.10.3.md) |
| v1.10.1 | 2026-03-16 | 229 | 428 | 88% | [Report](benchmarks/archive/v1.10.1.md) |
| v1.10.0 | 2026-03-16 | 229 | 434 | 88% | [Report](benchmarks/archive/v1.10.0.md) |
