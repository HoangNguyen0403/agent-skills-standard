# Agent Skills Standard CLI

[![NPM Version](https://img.shields.io/npm/v/agent-skills-standard.svg?style=flat-square)](https://www.npmjs.com/package/agent-skills-standard)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/blob/main/LICENSE)

**Sync 237 AI coding standards to any project in one command.** Works with Cursor, Claude Code, GitHub Copilot, Gemini, Windsurf, Trae, Kiro, and Roo.

```bash
npx agent-skills-standard@latest init   # detect your stack
npx agent-skills-standard@latest sync   # install skills
```

---

## What It Does

The CLI takes engineering standards from the [Agent Skills Standard registry](https://github.com/HoangNguyen0403/agent-skills-standard) and installs them into your AI agent's native format:

```bash
npx agent-skills-standard sync

  - Updated .cursor/skills/    (Cursor)
  - Updated .claude/skills/    (Claude Code)
  - Updated .github/skills/    (Copilot)
  - Generated _INDEX.md for 8 categories.
  - AGENTS.md router index updated.
```

The result: your AI agent reads `AGENTS.md`, follows the router to the right category, and loads only the skills that match what you're editing.

---

## Commands

| Command    | What it does                                                                                   |
| :--------- | :--------------------------------------------------------------------------------------------- |
| `init`     | Detects your tech stack (Flutter, React, Go, etc.) and creates a `.skillsrc` config            |
| `sync`     | Fetches skills from the registry, writes to agent folders, generates `_INDEX.md` + `AGENTS.md` |
| `validate` | Checks your custom skills against format and token standards                                   |
| `feedback` | Submits improvement suggestions to the registry                                                |
| `upgrade`  | Updates the CLI to the latest version                                                          |

---

## Configuration

The `.skillsrc` file controls everything:

```yaml
registry: https://github.com/HoangNguyen0403/agent-skills-standard
agents: [cursor, copilot, claude]
skills:
  react:
    ref: react-v1.3.1
  golang:
    ref: golang-v1.3.1
    exclude: ['golang-tooling'] # skip skills you don't need
  common:
    ref: common-v2.0.1
    custom_overrides: ['common-tdd'] # protect your local edits
```

---

## What Gets Generated

After `sync`, your project contains:

```bash
project/
  AGENTS.md                           # Router table (~20 lines)
  .cursor/skills/
    golang/_INDEX.md                  # Trigger table for Go skills
    golang/golang-language/SKILL.md   # The actual skill
    golang/golang-testing/SKILL.md
    react/_INDEX.md                   # Trigger table for React skills
    react/react-hooks/SKILL.md
    ...
```

**`AGENTS.md`** maps file extensions to category indexes.
**`_INDEX.md`** has two sections: **File Match** (auto-check against your file) and **Keyword Match** (activates when you mention a concept).
**`SKILL.md`** is the skill itself — loaded on demand, averaging ~500 tokens.

---

## Privacy & Security

- **Text only** — the CLI downloads Markdown and JSON files, never binaries or scripts
- **No telemetry** — zero data collection, no background processes
- **Transparent** — fetches from the [public registry](https://github.com/HoangNguyen0403/agent-skills-standard), nothing hidden
- **Override protection** — `custom_overrides` prevents the CLI from touching your local modifications

---

## Links

- [Registry & Skills](https://github.com/HoangNguyen0403/agent-skills-standard)
- [Architecture](./ARCHITECTURE.md)
- [Report an Issue](https://github.com/HoangNguyen0403/agent-skills-standard/issues)

### 📜 Benchmark History

| Version | Date | Skills | Avg Tokens | Savings (%) | Report |
| --- | --- | --- | --- | --- | --- |
| v2.1.0 | 2026-04-04 | 237 | 526 | 86% | [Report](benchmarks/archive/v2.1.0.md) |
| v2.0.1 | 2026-03-30 | 238 | 527 | 86% | [Report](benchmarks/archive/v2.0.1.md) |
| v2.0.0 | 2026-03-25 | 235 | 523 | 86% | [Report](benchmarks/archive/v2.0.0.md) |
| v1.10.3 | 2026-03-21 | 234 | 505 | 86% | [Report](benchmarks/archive/v1.10.3.md) |
| v1.10.1 | 2026-03-16 | 229 | 428 | 88% | [Report](benchmarks/archive/v1.10.1.md) |
| v1.10.0 | 2026-03-16 | 229 | 434 | 88% | [Report](benchmarks/archive/v1.10.0.md) |
| v1.9.3 | 2026-03-15 | 229 | 460 | 87% | [Report](benchmarks/archive/v1.9.3.md) |
| v1.9.2 | 2026-03-07 | 228 | 458 | 87% | [Report](benchmarks/archive/v1.9.2.md) |
| v1.9.1 | 2026-03-07 | 228 | 458 | 87% | [Report](benchmarks/archive/v1.9.1.md) |
| v1.9.0 | 2026-03-05 | 228 | 457 | 88% | [Report](benchmarks/archive/v1.9.0.md) |
| v1.8.0 | 2026-03-02 | 228 | 443 | 88% | [Report](benchmarks/archive/v1.8.0.md) |
| v1.7.3 | 2026-02-25 | 222 | 418 | 89% | [Report](benchmarks/archive/v1.7.3.md) |
| v1.7.2 | 2026-02-25 | 220 | 413 | 89% | [Report](benchmarks/archive/v1.7.2.md) |
