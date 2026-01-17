# Agent Skills Standard CLI 🚀

[![NPM Version](https://img.shields.io/npm/v/agent-skills-standard.svg?style=flat-square)](https://www.npmjs.com/package/agent-skills-standard)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/blob/main/LICENSE)

**Stop wasting your context window. The open standard for High-Density AI coding instructions.**

The `agent-skills-standard` CLI is the official tool to manage, sync, and version-control engineering standards across all major AI agents (**Cursor, Claude, Copilot, Antigravity, and custom LLM workflows**).

---

## ⚡ Why use this?

Modern AI coding agents (like Cursor or Claude) are powerful, but managing project-wide rules manually is painful:

1. **Context Bloat**: Giant rules files consume too many tokens.
2. **Sync Hell**: Team members often have outdated or inconsistent rules.
3. **Vague Instructions**: Human-prose rules are often ignored by LLMs during complex tasks.

**Agent Skills Standard** solves this by treating prompt instructions as **versioned dependencies**.

---

## 🚀 Installation

Install globally or use via `npx`:

```bash
# Global installation
npm install -g agent-skills-standard

# Or use directly with npx
npx agent-skills-standard sync
```

---

## 🛠 Usage

### 1. Initialize your project

Detect your project stack and create a configuration file.

```bash
agent-skills-standard init
```

### 2. Sync skills

Fetch the latest **High-Density Skills** from the registry and distribute them to your agent folders (e.g., `.cursor/rules/`, `.github/skills/`).

```bash
agent-skills-standard sync
```

---

## ✨ Features

- **🎯 Token Economy**: Uses a "Split-Context" pattern to only load core rules by default, saving your context window.
- **🚀 High-Density Syntax**: Imperative, keyword-rich instructions that provide **40% better instruction density** than standard prose.
- **🛡️ Multi-Agent Support**: Out-of-the-box mapping for Cursor, Claude Dev, GitHub Copilot, and more.
- **🔒 Secure Overrides**: Lock specific files in your project (`custom_overrides`) so they never get overwritten by the central registry.
- **📊 Semantic Tagging**: Skills are tagged with logic that tells the AI *exactly* when to apply them.

---

## 🌍 Supported Stacks

The CLI connects to the [Official Skills Registry](https://github.com/HoangNguyen0403/agent-skills-standard), which currently supports:

- **Flutter**: Clean Architecture, BLoC, AutoRoute, Performance, Security.
- **Dart**: Idiomatic Patterns, Advanced Tooling.
- **NestJS/Next.js**: (Coming Soon)
- **Golang**: (Coming Soon)

---

## 🔗 Links

- **Registry Source**: [GitHub Repository](https://github.com/HoangNguyen0403/agent-skills-standard)
- **Standard Specs**: [Documentation](https://github.com/HoangNguyen0403/agent-skills-standard#📂-standard-specification)
- **Issues**: [Report a bug](https://github.com/HoangNguyen0403/agent-skills-standard/issues)

---
