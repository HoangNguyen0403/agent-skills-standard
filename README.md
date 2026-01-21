# Agent Skills Standard 🚀

[![NPM Version](https://img.shields.io/npm/v/agent-skills-standard.svg?style=flat-square)](https://www.npmjs.com/package/agent-skills-standard)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/HoangNguyen0403/agent-skills-standard?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/stargazers)
[![common](https://img.shields.io/badge/common-v1.1.0-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/common-v1.1.0)
[![flutter](https://img.shields.io/badge/flutter-v1.1.1-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/flutter-v1.1.1)
[![dart](https://img.shields.io/badge/dart-v1.0.2-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/dart-v1.0.2)
[![typescript](https://img.shields.io/badge/typescript-v1.0.1-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/typescript-v1.0.1)
[![react](https://img.shields.io/badge/react-v1.0.1-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/react-v1.0.1)
[![nestjs](https://img.shields.io/badge/nestjs-v1.0.1-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/nestjs-v1.0.1)
[![nextjs](https://img.shields.io/badge/nextjs-v1.0.1-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/nextjs-v1.0.1)

**The open standard for High-Density AI coding instructions. Make your AI smarter, faster, and more consistent.**

Agent Skills Standard is a modular framework to distribute, sync, and version-control engineering standards across all major AI agents (**Cursor, Claude Code, GitHub Copilot, Windsurf, Gemini, Antigravity, and custom LLM workflows**).

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

### 3. Validate Skills (For Contributors)

```bash
npx agent-skills-standard validate
```

**What it does:**
Validates all skills for format compliance and structural integrity. Ensures skills follow our High-Density standards before merging.

---

## ⚙️ Configuration (`.skillsrc`)

The `.skillsrc` file allows you to customize how skills are synced to your project.

```yaml
registry: https://github.com/HoangNguyen0403/agent-skills-standard
agents: [cursor, copilot]
skills:
  flutter:
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

## ❓ Troubleshooting

### Invalid .skillsrc

If the CLI complains about configuration format:

- Ensure `registry` is a valid URL.
- Ensure `skills` is a map of categories to config objects.
- Run `npx agent-skills-standard init` to generate a fresh valid config.

---

## 🌍 Registry Ecosystem

The Agent Skills Standard is designed to be the universal language for engineering standards.

### 🔹 Current Support (v1.3.0)

| Category          | Key Modules                                           | Version  |
| :---------------- | :---------------------------------------------------- | :------- |
| **🌐 Common**     | SOLID, Security, Perf Engineering, TDD, Architecture  | `v1.1.0` |
| **💙 Flutter**    | Clean Arch, BLoC, Riverpod, Testing, GetX, Nav v1     | `v1.1.1` |
| **🎯 Dart**       | Idiomatic Patterns, Advanced Tooling, Build Runner    | `v1.0.2` |
| **🔷 TypeScript** | Type Safety, Security, Best Practices, Tooling        | `v1.0.1` |
| **🟨 JavaScript** | Modern ES2022+ Patterns, Async/Await, Functional      | `v1.0.0` |
| **⚛️ React**      | Hooks, State Management, Performance, Security        | `v1.0.1` |
| **🦁 NestJS**     | Architecture, Microservices, Security, CQRS, Scalling | `v1.0.1` |
| **▲ Next.js**     | App Router, Server Actions, RSC, Metadata, FSD        | `v1.0.1` |

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
| **Windsurf**    | `.windsurf/skills/` | Automatic discovery                    |
| **OpenCode**    | `.opencode/skills/` | Automatic discovery                    |

---

## 🏗 Contributing & Development

Interested in adding standards for **NestJS, Golang, or React**? We follow a strict semantic versioning for every skill category.

1. **Propose a Skill**: Open an issue with your draft [High-Density Content](skills/README.md).
2. **Develop Locally**: Fork and add your category to `skills/`.
3. **Submit PR**: Our CI/CD will validate the metadata integrity before merging.

---

## 🗺 Roadmap

- [x] **CLI Tooling** (v1.3.0 released)
- [x] **Universal "Common" Skills** (v1.1.0 released)
- [x] **Flutter** (v1.1.1 released)
- [x] **Dart Core** (v1.0.2 released)
- [x] **Web Stack (TS/JS/React)** (v1.0.1 released)
- [x] **NestJS** (v1.0.1 released)
- [x] **Next.js** (v1.0.1 released)
- [ ] **Golang / Angular** (Q1 2026)
- [ ] **Spring Boot** (Q1 2026)
- [ ] **Agent Skills Dashboard** (Web UI for browsing standards)

---

## 📄 License & Credits

- **License**: MIT
- **Author**: [Hoang Nguyen](https://github.com/HoangNguyen0403)

---
