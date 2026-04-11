# Agent Skills Standard

[![NPM Version](https://img.shields.io/npm/v/agent-skills-standard.svg?style=flat-square)](https://www.npmjs.com/package/agent-skills-standard)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/HoangNguyen0403/agent-skills-standard?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/stargazers)

**Make your AI write code like your best engineer. One command. Every AI agent. Every project.**

237 ready-to-use coding standards for **Cursor, Claude Code, GitHub Copilot, Gemini, Windsurf, Trae, Kiro, Roo** and more — synced, versioned, and optimized to use **86% fewer tokens** than traditional prompt engineering.

```bash
npx agent-skills-standard@2.1.1 init
npx agent-skills-standard@2.1.1 sync
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

---

## 237 Skills Across 20+ Frameworks

Every skill is audited for token efficiency (averaging ~500 tokens) and tested with automated evals.

| Stack                | Key Skills                                    | Version  | Skills |
| :------------------- | :-------------------------------------------- | :------- | :----- |
| **Common Patterns**  | Best Practices, Security, TDD, Error Handling | `v2.0.3` | 31     |
| **Flutter**          | BLoC, Riverpod, Clean Architecture, GetX      | `v1.6.3` | 21     |
| **React**            | Hooks, Performance, State Management          | `v1.3.3` | 8      |
| **React Native**     | Architecture, Navigation, Performance         | `v1.4.3` | 13     |
| **Next.js**          | App Router, Server Components, Caching, ISR   | `v1.4.3` | 18     |
| **Angular**          | Signals, Components, RxJS, SSR                | `v1.4.1` | 15     |
| **NestJS**           | Architecture, Security, BullMQ                | `v1.4.3` | 21     |
| **TypeScript**       | Type Safety, Security, Tooling                | `v1.3.2` | 4      |
| **JavaScript**       | ES2024+, Patterns, Tooling                    | `v1.3.3` | 3      |
| **Go (Golang)**      | Clean Arch, Concurrency                       | `v1.3.2` | 11     |
| **Spring Boot**      | Architecture, Security, JPA                   | `v1.3.2` | 10     |
| **Android**          | Compose, Navigation, Hilt                     | `v1.3.3` | 22     |
| **iOS**              | SwiftUI, Arch, Persistence                    | `v1.4.3` | 15     |
| **Swift**            | Concurrency, Memory                           | `v1.3.3` | 8      |
| **Kotlin**           | Coroutines, Language                          | `v1.3.2` | 4      |
| **Java**             | Records, Virtual Threads                      | `v1.3.2` | 5      |
| **PHP**              | PHP 8.4+, Error Handling                      | `v1.3.2` | 7      |
| **Laravel**          | Eloquent, Clean Arch                          | `v1.3.3` | 10     |
| **Dart**             | Null Safety, Sealed Classes                   | `v1.3.3` | 3      |
| **Database**         | PostgreSQL, MongoDB, Redis                    | `v1.3.2` | 3      |
| **Quality Engineer** | BA, TDD, Zephyr, Test Gen                     | `v1.4.3` | 5      |

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
| v2.1.1 | 2026-04-11 | 237 | 516 | 86% | [Report](benchmarks/archive/v2.1.1.md) |
| v2.1.0 | 2026-04-04 | 237 | 526 | 86% | [Report](benchmarks/archive/v2.1.0.md) |
| v2.0.1 | 2026-03-30 | 238 | 527 | 86% | [Report](benchmarks/archive/v2.0.1.md) |
| v2.0.0 | 2026-03-25 | 235 | 523 | 86% | [Report](benchmarks/archive/v2.0.0.md) |
| v1.10.3 | 2026-03-21 | 234 | 505 | 86% | [Report](benchmarks/archive/v1.10.3.md) |
| v1.10.1 | 2026-03-16 | 229 | 428 | 88% | [Report](benchmarks/archive/v1.10.1.md) |
| v1.10.0 | 2026-03-16 | 229 | 434 | 88% | [Report](benchmarks/archive/v1.10.0.md) |
| v1.9.3 | 2026-03-15 | 229 | 460 | 87% | [Report](benchmarks/archive/v1.9.3.md) |
| v1.9.2 | 2026-03-07 | 228 | 458 | 87% | [Report](benchmarks/archive/v1.9.2.md) |
| v1.9.1 | 2026-03-07 | 228 | 458 | 87% | [Report](benchmarks/archive/v1.9.1.md) |
