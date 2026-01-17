# Agent Skills Standard 🚀

[![NPM Version](https://img.shields.io/npm/v/agent-skills.svg?style=flat-square)](https://www.npmjs.com/package/agent-skills)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/HoangNguyen0403/agent-skills-standard?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/stargazers)
[![Standard](https://img.shields.io/badge/Standard-Agent--Skills--1.0-FD971F?style=flat-square)](https://agentskills.io/)

**Stop wasting your context window. The open standard for High-Density AI coding instructions.**

Agent Skills Standard is a modular framework to distribute, sync, and version-control engineering standards across all major AI agents (**Cursor, Claude, Copilot, Antigravity, and custom LLM workflows**).

---

## ⚡ The Problem: "The Context Wall"

Modern AI coding agents are powerful, but they have major flaws when managing project-wide rules:

1. **Context Bloat**: Giant `.cursorrules` or `CLAUDE.md` files consume **30% - 50% of your context window** before you even write a single line of code.
2. **Sync Hell**: Every team member has a different version of "best practices" floating around their local IDE config.
3. **Vague Prose**: Instructions written in "English prose" are token-heavy and often ignored by LLMs in complex reasoning tasks.

## 🛠 The Solution: Modern Prompt Engineering

Agent Skills Standard solves this by treating prompt instructions as **versioned dependencies**.

- **🎯 Progressive Disclosure**: A "Split-Context" pattern where the agent only loads core rules (`SKILL.md`) by default, and only fetches heavy code examples (`references/`) when strictly necessary.
- **🚀 High-Density Tokens**: We use an imperative, keyword-rich syntax that provides **40% better instruction density** than standard prose.
- **🔁 One-Click Sync**: `agent-skills sync` ensures your IDE, your terminal agent, and your CI/CD all share the exact same engineering DNA.

---

## ✨ Features

- **🛡️ Multi-Agent Support**: Out-of-the-box mapping for Cursor, Claude Dev, GitHub Copilot, and more.
- **📦 Modular Registry**: Don't load everything. Only enable the skills your project actually uses (e.g., `Flutter + BLoC + Clean Architecture`).
- **🔒 Secure Overrides**: Lock specific files in your project so they never get overwritten by the central registry.
- **📊 Semantic Tagging**: Skills are tagged with triggers that tell the AI *exactly* when to apply them.

---

## 🚀 Quick Start (Get running in 60s)

Consume engineering standards in your project instantly.

### 1. Run the CLI

```bash
npx agent-skills init
```

*The interactive wizard will detect your stack and setup your `.skillsrc`.*

### 2. Sync Standards

```bash
npx agent-skills sync
```

**What happened?**
The CLI fetched the latest **High-Density Skills** and distributed them into your hidden agent folders (e.g., `.cursor/skills/`, `.github/skills/`). Your AI is now "upgraded" with your team's standards.

---

## 🌍 Registry Ecosystem

The Agent Skills Standard is designed to be the universal language for engineering standards.

### 🔹 Current Support (v1.0.0)

| Category | Skills Included | Status |
| :--- | :--- | :--- |
| **💙 Flutter** | Clean Arch, BLoC, AutoRoute, Performance, Testing, Security, Retrofit... | **Stable** |
| **🎯 Dart** | Idiomatic Patterns, Advanced Tooling, Build Runner... | **Stable** |
| **🏢 Architecture** | Feature-based vs Layer-based Clean Architecture | **Stable** |

### 🔹 Ongoing Development (Q1 2026)

- **🟢 NestJS**: Auth (JWT/Passport), Microservices, CQRS, TypeORM/Prisma.
- **⚛️ React / Next.js**: Server Components, TanStack Query, Atomic Design.
- **🐹 Golang**: Clean Hexagonal Architecture, Gin/Fiber standards.
- **☕ Spring Boot**: Pro-grade Java standards for enterprise agents.
- **🍎 Swift / iOS**: Modular architecture for Large-scale mobile projects.

> [!TIP]
> **Enterprise Ready**: You can host your own **Private Skills Registry** on GitHub and point the CLI to it via the `registry` field in your `.skillsrc`.

---

## 📂 Standard Specification

The standard follows a strict directory structure designed for **Token Economy**.

```text
skills/
└── flutter/
    └── bloc-state-management/
        ├── SKILL.md       # Core Rules (High Density)
        └── references/    # Heavy Examples (Loaded only on demand)
```

### IDE Mapping

| Agent | Target Path | Integration Method |
| :--- | :--- | :--- |
| **Cursor** | `.cursor/skills/` | Automatic discovery via `.cursorrules` |
| **Claude Code** | `.claude/skills/` | Referenced in `CLAUDE.md` |
| **Copilot** | `.github/skills/` | Custom instruction sets |
| **Antigravity** | `.agent/skills/` | Native skill integration |

---

## 🏗 Contributing & Development

Interested in adding standards for **NestJS, Golang, or React**? We follow a strict semantic versioning for every skill category.

1. **Propose a Skill**: Open an issue with your draft [High-Density Content](skills/README.md).
2. **Develop Locally**: Fork and add your category to `skills/`.
3. **Submit PR**: Our CI/CD will validate the metadata integrity before merging.

---

## 🗺 Roadmap

- [x] **Flutter & Dart Core** (v1.0.0 released)
- [x] **Registry CLI Tooling** (v1.0.0 released)
- [ ] **TypeScript / NestJS Registry** (Q1 2026)
- [ ] **React / Next.js Registry** (Q1 2026)
- [ ] **Agent Skills Dashboard** (Web UI for browsing standards)

---

## 📄 License & Credits

- **License**: MIT
- **Author**: [Hoang Nguyen](https://github.com/HoangNguyen0403)

---
