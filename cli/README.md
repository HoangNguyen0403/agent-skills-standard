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

## 🛠 The Solution: Digital DNA for AI

Agent Skills Standard treats instructions as **versioned dependencies**, much like software libraries.

- **🎯 Smart Loading**: We use a "Search-on-Demand" pattern. The AI only looks at detailed examples when it specifically needs them, saving its memory for your actual code.
- **🚀 High-Density Language**: We use a specialized "Compressed Syntax" that is **40% more efficient** than normal English. This means the AI understands more while using fewer resources.
- **🔁 One-Click Sync**: A single command ensures your AI tool stays up-to-date with your team's latest standards.

---

## 🛡️ Security & Trust

We take security seriously. Here is what you need to know about how the CLI works:

- **No Hidden Scripts**: The CLI `sync` command only downloads **text files** (Markdown/JSON). It does _not_ download or execute binaries, scripts, or unknown code.
- **No "Code Injection"**: When we say "injection", we mean **Prompt Injection** (adding context to the AI's conversation history), NOT code injection (running malware).
- **Transparent Operations**:
  - The CLI fetches a standard directory structure from the [official registry](https://github.com/HoangNguyen0403/agent-skills-standard).
  - It copies these text files to your local `.cursor/skills` or `.agent/skills` folder.
  - It updates `AGENTS.md` (a text file index).
  - **That is it.** No background services, no daemons, no hidden network calls.

---

## 📊 Efficiency & Benchmark

Every skill delivered by this CLI is audited for its footprint in the AI's context window.

| Metric             | Savings (vs. Heavy Prompt) | Avg. Footprint | Quality |
| ------------------ | -------------------------: | -------------- | ------- |
| **Global Average** |            **89% Savings** | ~413 tokens    | 8.9/10  |

> [!IMPORTANT]
> **Context is Currency**: By reducing instruction overhead by **89%**, you free up your AI's memory and budget for complex logic and large codebases.

- **🛡️ Multi-Agent Support**: Out-of-the-box mapping for Cursor, Claude Dev, GitHub Copilot, and more.
- **📦 Modular Registry**: Don't load everything. Only enable the skills your project actually uses.
- **⚡ Proactive Activation (Universal)**: Generates a compressed index in `AGENTS.md` for 100% activation reliability across Cursor, Windsurf, Claude Code, and more.
- **🔄 Dynamic Re-detection**: Automatically re-enables skills if matching dependencies are added.
- **🔒 Secure Overrides**: Lock specific files so they never get overwritten.
- **📊 Semantic Tagging**: Skills tagged with triggers for exact application.
- **🤖 Agent Workflows**: Sync executable workflows (.md files) that agents can follow to perform complex tasks.

---

#### 📜 Benchmark History

| Version | Date       | Skills | Avg Tokens | Savings (%) | Report                                 |
| ------- | ---------- | ------ | ---------- | ----------- | -------------------------------------- |
| v1.7.3  | 2026-02-25 | 222    | 418        | 89%         | [Report](benchmarks/archive/v1.7.3.md) |
| v1.7.2  | 2026-02-25 | 220    | 413        | 89%         | [Report](benchmarks/archive/v1.7.2.md) |

## � Token Economy & Optimization

To ensure AI efficiency, this project follows a strict **Token Economy**. Every skill is audited for its footprint in the AI's context window.

### 📏 Our Standards

- **High-Density**: Core rules in `SKILL.md` are kept under **100 lines**.
- **Efficiency**: Target **< 500 tokens** per primary skill file.
- **Progressive Disclosure**: Heavy examples, checklists, and implementation guides are moved to the `references/` directory and are only loaded by the agent when specific context matches.

## 🔒 Privacy & Feedback

### Feedback Reporter Skill

By default, the CLI syncs a `common/feedback-reporter` skill that enables you to report when AI makes mistakes or when skill guidance needs improvement. **This helps us improve skills for everyone.**

**What Gets Shared (Only if AI Agent Report):**

- Skill category/name
- Issue description (written by you or generated by AI)
- **Skill Instruction**: Exact quote from the skill that was violated
- **Actual Action**: What the AI did instead
- **Decision Reason**: Why the AI chose that approach
- Optional context (framework version, scenario)
- Optional AI Model name
- **NO code, NO project details, NO personal information**

**How to Opt-Out:**
Add to `.skillsrc`:

```yaml
skills:
  common:
    exclude: ['feedback-reporter']
```

**How to Report Issues:**
Use structured comments:

```typescript
// @agent-skills-feedback
// Skill: react/hooks
// Issue: AI suggested unsafe pattern
// Suggestion: Add guidance for this case
```

**Privacy First**: We never collect usage telemetry or analytics. Feedback is only shared if you explicitly trigger it.

#### Manual Feedback

If you notice a skill needs improvement, you can manually send feedback using:

```bash
ags feedback
```

Or via structured comments in your code:

```typescript
// @agent-skills-feedback
// Skill: react/hooks
// Issue: AI suggested unsafe pattern
// Suggestion: Add guidance for this case
```

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
    # ➕ Include specific skills (supports cross-category 'category/skill' or 'category/*' syntax)
    include:
      - 'bloc-state-management'
      - 'react/hooks'
      - 'common/*'
    # 🔒 Protect local modifications from being overwritten
    custom_overrides: ['bloc-state-management']
  # 🤖 Optional: Sync workflows to .agent/workflows/
  workflows: true
```

### Key Options

- **`exclude`**: A list of skill IDs to skip during synchronization.
- **`include`**: A list of skill IDs to fetch. Supports:
  - **Relative Path**: `bloc-state-management` (from current category)
  - **Absolute Path**: `react/hooks` (pull specific skill from another category)
  - **Glob Path**: `common/*` (pull ALL skills from another category)
- **`custom_overrides`**: A list of skill IDs that the CLI should **never** overwrite.
- **`ref`**: Specify a specific version or tag for the skills.

---

## ✨ Key Features

- **🎯 Efficiency First**: Uses a "Search-on-Demand" pattern that only loads information when the AI needs it, saving its "brain power" for your code.
- **🚀 High-Density Instructions**: Optimized syntax that is **40% more compact** than standard English.
- **🛡️ Universal Support**: Works out-of-the-box with Cursor, Claude, GitHub Copilot, and more.
- **🔒 Secure Protection**: Mark specific files as "Locked" (overrides) so the CLI never changes your custom tweaks.
- **🧪 Production-Grade Reliability**: Guarded by a 100% statement coverage test suite and strict CI enforcement.

### 🔹 Supported Stacks (Token Audited)

| Category        | Typical Savings | Avg. Footprint                                                                   | Status        |
| :-------------- | :-------------- | :------------------------------------------------------------------------------- | :------------ |
| **Flutter**     | 88%             | `422` ![tokens](https://img.shields.io/badge/tokens-422-green?style=flat-square) | ✅ Stable     |
| **NestJS**      | 85%             | `518` ![tokens](https://img.shields.io/badge/tokens-518-blue?style=flat-square)  | ✅ Production |
| **Next.js**     | 89%             | `431` ![tokens](https://img.shields.io/badge/tokens-431-green?style=flat-square) | ✅ Stable     |
| **React**       | 90%             | `401` ![tokens](https://img.shields.io/badge/tokens-401-green?style=flat-square) | ✅ Stable     |
| **Golang**      | 90%             | `375` ![tokens](https://img.shields.io/badge/tokens-375-green?style=flat-square) | ✅ Stable     |
| **Android**     | 92%             | `295` ![tokens](https://img.shields.io/badge/tokens-295-green?style=flat-square) | ✅ Production |
| **iOS**         | 90%             | `411` ![tokens](https://img.shields.io/badge/tokens-411-green?style=flat-square) | ✅ Production |
| **Laravel**     | 91%             | `361` ![tokens](https://img.shields.io/badge/tokens-361-green?style=flat-square) | ✅ Stable     |
| **Spring Boot** | 92%             | `369` ![tokens](https://img.shields.io/badge/tokens-369-green?style=flat-square) | ✅ Stable     |

> [!TIP]
> Run `ags benchmark` (coming soon) or check the [root report](../benchmark-report.md) for full scientific methodology.

---

## 🔗 Links

- **Registry Source**: [GitHub Repository](https://github.com/HoangNguyen0403/agent-skills-standard)
- **CLI Architecture**: [Internal Services & Design](https://github.com/HoangNguyen0403/agent-skills-standard/blob/develop/cli/ARCHITECTURE.md)
- **Standard Specs**: [Documentation](https://github.com/HoangNguyen0403/agent-skills-standard#📂-standard-specification)
- **Issues**: [Report a bug](https://github.com/HoangNguyen0403/agent-skills-standard/issues)

---
