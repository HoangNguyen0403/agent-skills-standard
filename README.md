# Agent Skills Standard 🚀

[![NPM Version](https://img.shields.io/npm/v/agent-skills-standard.svg?style=flat-square)](https://www.npmjs.com/package/agent-skills-standard)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/HoangNguyen0403/agent-skills-standard?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/stargazers)
[![Standard](https://img.shields.io/badge/Standard-Agent--Skills--1.0-FD971F?style=flat-square)](https://agentskills.io/)

**The open standard for High-Density AI coding instructions. Make your AI smarter, faster, and more consistent.**

Agent Skills Standard is a modular framework to distribute, sync, and version-control engineering standards across all major AI agents (**Cursor, Claude Code, GitHub Copilot, Gemini, Antigravity, and custom LLM workflows**).

---

## 💡 What is this?

Think of Agent Skills Standard as a **universal instruction manual** for your AI assistant.

Usually, when you use AI for work, you have to constantly remind it of your "house rules" (e.g., _"Make sure to handle errors this way"_ or _"Use this specific layout"_). This project allows teams to package those rules into **"Skills"** that you can plug into any AI tool instantly.

### Why does this matter?

- **For Managers**: Ensure your entire team writes high-quality code that follows your company's standards, regardless of which AI tool they use.
- **For Non-IT Users**: You don't need to know _how_ the rules are written; you just run one command to "upgrade" your AI with professional-grade engineering knowledge.
- **For Teams**: No more "Hey, why did the AI write it this way?"—everyone’s AI uses the same playbook.

---

## ⚡ The Problem: "The Context Wall"

Modern AI coding agents are powerful, but they struggle when managing project-wide rules:

1. **Information Overload**: Providing too many instructions at once confuses the AI and makes it forgetful.
2. **Version Chaos**: Every team member has a different version of "best practices" floating around their local computer.
3. **Wasted Space**: Long, wordy instructions "eat up" the AI's limited memory (the Context Window), making it more expensive and less effective.

## 🛠 The Solution: Digital DNA for AI

Agent Skills Standard treats instructions as **versioned dependencies**, much like software libraries.

- **🎯 Smart Loading**: We use a "Search-on-Demand" pattern. The AI only looks at detailed examples when it specifically needs them, saving its memory for your actual code.
- **🚀 High-Density Language**: We use a specialized "Compressed Syntax" that is **40% more efficient** than normal English. This means the AI understands more while using fewer resources.
- **🔁 One-Click Sync**: A single command ensures your AI tool stays up-to-date with your team's latest standards.

---

## ✨ Features

- **🛡️ Multi-Agent Support**: Out-of-the-box mapping for Cursor, Claude Dev, GitHub Copilot, and more.
- **📦 Modular Registry**: Don't load everything. Only enable the skills your project actually uses (e.g., `Flutter + BLoC + Clean Architecture`).
- **🔒 Secure Overrides**: Lock specific files in your project so they never get overwritten by the central registry.
- **📊 Semantic Tagging**: Skills are tagged with triggers that tell the AI _exactly_ when to apply them.

---

## 🚀 Quick Start (Get running in 60s)

Consume engineering standards in your project instantly.

### 1. Run the CLI

```bash
npx agent-skills-standard init
```

_The interactive wizard will detect your stack and setup your `.skillsrc`._

### 2. Sync Standards

```bash
npx agent-skills-standard sync
```

**What happened?**
The CLI fetched the latest **High-Density Skills** and distributed them into your hidden agent folders (e.g., `.cursor/skills/`, `.github/skills/`). Your AI is now "upgraded" with your team's standards.

---

## ⚙️ Configuration (`.skillsrc`)

The `.skillsrc` file allows you to customize how skills are synced to your project.

```yaml
registry: https://github.com/HoangNguyen0403/agent-skills-standard
agents: [cursor, copilot]
skills:
  flutter:
    enabled: true
    ref: flutter-v1.1.0
    # 🚫 Exclude specific sub-skills from being synced
    exclude: ['getx-navigation']
    # 🔒 Protect local modifications from being overwritten
    custom_overrides: ['bloc-state-management']
```

### Key Options

- **`exclude`**: A list of skill IDs to skip during synchronization. Useful if you want the main framework guidelines but use a different library for a specific sub-task (e.g., excluding `auto-route` if you use `go_router`).
- **`custom_overrides`**: A list of skill IDs that the CLI should **never** overwrite. Use this when you have modified a standard skill locally to fit your project's unique needs. The CLI will detect these and preserve your local version.
- **`ref`**: Specify a specific version or tag of the skills from the registry.

---

## 🌍 Registry Ecosystem

The Agent Skills Standard is designed to be the universal language for engineering standards.

### 🔹 Current Support (v1.1.2)

| Category          | Skills Included                                                                                 | Status     |
| :---------------- | :---------------------------------------------------------------------------------------------- | :--------- |
| **💙 Flutter**    | Clean Arch, BLoC, Riverpod, Testing, GetX (Nav/State), Navigator v1, Localization, AutoRoute... | **Stable** |
| **🎯 Dart**       | Idiomatic Patterns, Advanced Tooling, Build Runner...                                           | **Stable** |
| **🔷 TypeScript** | Type Safety, Security, Best Practices, ESLint/Testing Configuration...                          | **Stable** |
| **🟨 JavaScript** | Modern ES2022+ Patterns, Async/Await, Functional Programming...                                 | **Stable** |
| **⚛️ React**      | Hooks, State Management, Performance, Security, Testing...                                      | **Stable** |
| **🦁 NestJS**     | Architecture, Microservices, Security, CQRS, Database Scaling...                                | **Stable** |
| **▲ Next.js**     | App Router, Server Actions, RSC, Metadata, Optimization, FSD Arch...                            | **Stable** |

### 🔹 Ongoing Development (Q1 2026)

- **🐹 Golang**: Clean Hexagonal Architecture, Gin/Fiber standards.
- **🅰️ Angular**: Standalone Components, Signals, NgRx patterns.
- **☕ Spring Boot**: Pro-grade Java standards for enterprise agents.

> [!TIP]
> **Enterprise Ready**: You can host your own **Private Skills Registry** on GitHub and point the CLI to it via the `registry` field in your `.skillsrc`.

---

## 📂 Standard Specification

The standard follows a strict directory structure designed for **Token Economy**.

```text
skills/
└── flutter/                        # Category
    └── bloc-state-management/      # Skill
        ├── SKILL.md                # Core Rules (High Density)
        └── references/             # Heavy Examples (Loaded only on demand)
```

The CLI will sync this exact structure effectively to your agent configuration:

```text
.cursor/skills/
└── flutter/
    └── bloc-state-management/
```

### IDE Mapping

| Agent           | Target Path         | Integration Method                     |
| :-------------- | :------------------ | :------------------------------------- |
| **Cursor**      | `.cursor/skills/`   | Automatic discovery via `.cursorrules` |
| **Trae**        | `.trae/skills/`     | Automatic discovery                    |
| **Claude Code** | `.claude/skills/`   | Referenced in `CLAUDE.md`              |
| **Copilot**     | `.github/skills/`   | Automatic discovery                    |
| **OpenAI**      | `.codex/skills/`    | Automatic discovery                    |
| **Antigravity** | `.agent/skills/`    | Automatic discovery                    |
| **Gemini**      | `.gemini/skills/`   | Automatic discovery                    |
| **Roo Code**    | `.roo/skills/`      | Automatic discovery                    |
| **OpenCode**    | `.opencode/skills/` | Automatic discovery                    |

---

## 🏗 Contributing & Development

Interested in adding standards for **NestJS, Golang, or React**? We follow a strict semantic versioning for every skill category.

1. **Propose a Skill**: Open an issue with your draft [High-Density Content](skills/README.md).
2. **Develop Locally**: Fork and add your category to `skills/`.
3. **Submit PR**: Our CI/CD will validate the metadata integrity before merging.

---

## 🗺 Roadmap

- [x] **CLI Tooling** (v1.1.2 released)
- [x] **Flutter** (v1.1.0 released)
- [x] **Dart Core** (v1.0.1 released)
- [x] **Web Stack (TS/JS/React)** (v1.0.0 released)
- [x] **NestJS** (v1.0.0 released)
- [x] **Next.js** (v1.0.0 released)
- [ ] **Golang / Angular** (Q1 2026)
- [ ] **Agent Skills Dashboard** (Web UI for browsing standards)

---

## 📄 License & Credits

- **License**: MIT
- **Author**: [Hoang Nguyen](https://github.com/HoangNguyen0403)

---
