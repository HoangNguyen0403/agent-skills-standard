# Agent Skills Standard CLI 🚀

[![NPM Version](https://img.shields.io/npm/v/agent-skills-standard.svg?style=flat-square)](https://www.npmjs.com/package/agent-skills-standard)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/blob/main/LICENSE)

**The engine behind High-Density AI coding. Command your AI assistants with professional standards.**

The `agent-skills-standard` CLI is the official command-line tool to manage, sync, and version-control engineering standards across all major AI agents (**Cursor, Claude Code, GitHub Copilot, Antigravity, and more**).

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
npx agent-skills-standard sync

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
npx agent-skills-standard init
```

### 2. Boost Your AI

Run this to fetch the latest high-density instructions and install them into your hidden agent folders (like `.cursor/skills/` or `.github/skills/`).

```bash
npx agent-skills-standard sync

```

---

## ✨ Key Features

- **🎯 Efficiency First**: Uses a "Search-on-Demand" pattern that only loads information when the AI needs it, saving its "brain power" for your code.
- **🚀 High-Density Instructions**: Optimized syntax that is **40% more compact** than standard English.
- **🛡️ Universal Support**: Works out-of-the-box with Cursor, Claude, GitHub Copilot, and more.
- **🔒 Secure Protection**: Mark specific files as "Locked" (overrides) so the CLI never changes your custom tweaks.

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
