# Agent Skills Standard CLI 🚀

[![NPM Version](https://img.shields.io/npm/v/agent-skills-standard.svg?style=flat-square)](https://www.npmjs.com/package/agent-skills-standard)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/blob/main/LICENSE)

**The engine behind High-Density AI coding. Command your AI assistants with professional standards.**

The `agent-skills-standard` CLI is the official command-line tool to manage, sync, and version-control engineering standards across all major AI agents (**Cursor, Claude Code, GitHub Copilot, Gemini, Roo Code, OpenCode, and more**).

---

## 💡 What does this tool do?

If the **Agent Skills Standard** is the "instruction manual" for your AI, this CLI is the **delivery truck** that brings those instructions to your project.

### Why you need this CLI

- **For Developers**: No more copy-pasting `.cursorrules` or manual file management. One command keeps your AI updated.
- **For Non-IT/Tech Leads**: Quickly set up a new project with the same professional standards used by senior engineers.
- **For Teams**: Ensure every developer’s AI tool (Cursor, Claude, Copilot) behaves the same way across the entire codebase.

---

## ⚡ The Problem: "The Context Wall"

Modern AI coding agents are powerful, but they have major flaws:

1. **Memory Drain**: Giant rule files consume **30% - 50% of the AI's memory**, making it less effective for actual coding.
2. **Version Chaos**: Team members often have different "best practices," leading to inconsistent code.
3. **Wordy Prose**: Human-style instructions are token-heavy and often ignored by AI during complex logical tasks.

**Agent Skills Standard** solves this by treating prompt instructions as **versioned dependencies**, similar to how you manage software libraries.

---

## 🚀 Installation

You can run the tool instantly without installing, or install it globally for convenience:

```bash
# Use instantly (Recommended)
npx agent-skills-standard@latest sync

# Or install globally
npm install -g agent-skills-standard

# Use the short alias
ags sync
```

---

## 🛠 Basic Commands

### 1. Setup Your Project

Run this once to detect your project type and choose which "skills" you want your AI to have.

```bash
npx agent-skills-standard@latest init
```

### 2. Boost Your AI

Run this to fetch the latest high-density instructions and install them into your hidden agent folders (like `.cursor/skills/` or `.github/skills/`).

```bash
npx agent-skills-standard@latest sync

```

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

## ✨ Key Features

- **🎯 Efficiency First**: Uses a "Search-on-Demand" pattern that only loads information when the AI needs it, saving its "brain power" for your code.
- **🚀 High-Density Instructions**: Optimized syntax that is **40% more compact** than standard English.
- **🛡️ Universal Support**: Works out-of-the-box with Cursor, Claude, GitHub Copilot, and more.
- **🔒 Secure Protection**: Mark specific files as "Locked" (overrides) so the CLI never changes your custom tweaks.
- **🧪 Production-Grade Reliability**: Guarded by a 100% statement coverage test suite and strict CI enforcement.

---

## 🌍 Supported Stacks

The CLI connects to the [Official Skills Registry](https://github.com/HoangNguyen0403/agent-skills-standard), which currently supports:

- **Flutter**: Clean Architecture, BLoC, AutoRoute, Performance, Security.
- **Dart**: Idiomatic Patterns, Advanced Tooling.
- **TypeScript/JavaScript**: Best practices, Security, Tooling.
- **React**: Hooks, Patterns, Performance.
- **NestJS**: Architecture, Microservices, Security.
- **Next.js**: App Router, RSC, FSD Architecture.
- **Golang**: (Coming Soon)

---

## 🔗 Links

- **Registry Source**: [GitHub Repository](https://github.com/HoangNguyen0403/agent-skills-standard)
- **Standard Specs**: [Documentation](https://github.com/HoangNguyen0403/agent-skills-standard#📂-standard-specification)
- **Issues**: [Report a bug](https://github.com/HoangNguyen0403/agent-skills-standard/issues)

---
