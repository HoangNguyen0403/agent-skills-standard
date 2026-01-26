# Agent Skills Standard 🚀

[![NPM Version](https://img.shields.io/npm/v/agent-skills-standard.svg?style=flat-square)](https://www.npmjs.com/package/agent-skills-standard)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/HoangNguyen0403/agent-skills-standard?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/stargazers)
[![common](https://img.shields.io/badge/common-v1.2.4-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/common-v1.2.4)
[![flutter](https://img.shields.io/badge/flutter-v1.1.2-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/flutter-v1.1.2)
[![dart](https://img.shields.io/badge/dart-v1.0.3-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/dart-v1.0.3)
[![typescript](https://img.shields.io/badge/typescript-v1.0.4-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/typescript-v1.0.4)
[![react](https://img.shields.io/badge/react-v1.0.2-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/react-v1.0.2)
[![react-native](https://img.shields.io/badge/react--native-v1.0.1-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/react-native-v1.0.1)
[![nestjs](https://img.shields.io/badge/nestjs-v1.0.3-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/nestjs-v1.0.3)
[![nextjs](https://img.shields.io/badge/nextjs-v1.0.3-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/nextjs-v1.0.3)
[![golang](https://img.shields.io/badge/golang-v1.0.2-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/golang-v1.0.2)
[![angular](https://img.shields.io/badge/angular-v1.0.0-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/angular-v1.0.0)
[![kotlin](https://img.shields.io/badge/kotlin-v1.0.0-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/kotlin-v1.0.0)
[![java](https://img.shields.io/badge/java-v1.0.0-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/java-v1.0.0)
[![spring-boot](https://img.shields.io/badge/spring--boot-v1.0.0-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/spring-boot-v1.0.0)
[![android](https://img.shields.io/badge/android-v1.0.0-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/android-v1.0.0)
[![swift](https://img.shields.io/badge/swift-v1.0.0-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/swift-v1.0.0)
[![ios](https://img.shields.io/badge/ios-v1.0.0-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/ios-v1.0.0)
[![php](https://img.shields.io/badge/php-v1.0.0-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/php-v1.0.0)
[![laravel](https://img.shields.io/badge/laravel-v1.0.0-blue?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/releases/tag/laravel-v1.0.0)

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
- **🔄 Dynamic Re-detection**: Automatically re-enables excluded skills if matching dependencies (like `Retrofit`, `Room`, or `Navigation`) are added to your project.
- **🔒 Secure Overrides**: Lock specific files in your project so they never get overwritten by the central registry.
- **📊 Semantic Tagging**: Skills are tagged with triggers that tell the AI _exactly_ when to apply them.

---

## � Token Economy & Optimization

To ensure AI efficiency, this project follows a strict **Token Economy**. Every skill is audited for its footprint in the AI's context window.

### 📏 Our Standards

- **High-Density**: Core rules in `SKILL.md` are kept under **70 lines**.
- **Efficiency**: Target **< 500 tokens** per primary skill file.
- **Progressive Disclosure**: Heavy examples, checklists, and implementation guides are moved to the `references/` directory and are only loaded by the agent when specific context matches.

### 🛠️ Token Calculation

We provide a built-in tool in the CLI to estimate and track the token footprint:

```bash
pnpm calculate-tokens
```

This command:

1. Scans all `SKILL.md` files in the registry.
2. Calculates character-based token estimates.
3. Updates `skills/metadata.json` with category metrics (total tokens, avg/skill, and identifying the largest skills).

By maintaining a "Lean Registry," we ensure that your AI assistant remains fast and focused, preserving the majority of its context window for your actual project code.

---

## 🔒 Privacy & Feedback

### Feedback Reporter Skill

By default, the CLI syncs a `common/feedback-reporter` skill that enables you to report when AI makes mistakes or when skill guidance needs improvement. **This helps us improve skills for everyone.**

**What Gets Shared (Only if You Report):**

- Skill category and name
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

#### Manual Feedback

If you notice a skill needs improvement, you can manually send feedback using (no installation required):

```bash
npx agent-skills-standard feedback
```

**How it works:**

- **Cross-Platform**: Works instantly on **Windows, MacOS, and Linux** via `npx`.
- The CLI attempts to submit your feedback automatically via our **High-Density Feedback Backend** (hosted on Render.com).
- **No token needed**: We handle the GitHub integration securely on the server.

Or via structured comments in your code:

```typescript
// @agent-skills-feedback
// Skill: react/hooks
// Issue: AI suggested unsafe pattern
// Suggestion: Add guidance for this case
```

**Privacy First**: We never collect usage telemetry or analytics. Feedback is only shared if you explicitly trigger it.

---

## �🚀 Quick Start (Get running in 60s)

Consume engineering standards in your project instantly.

### 1. Run the CLI

```bash
npx agent-skills-standard@latest init
```

_The interactive wizard will detect your stack and setup your `.skillsrc`._

### 2. Sync Standards

```bash
npx agent-skills-standard@latest sync
```

**What happened?**

1. **Dynamic Re-detection**: The CLI scans your project dependencies (e.g., `build.gradle`, `pubspec.yaml`, `package.json`). If you've recently added a library that matches an excluded skill, the CLI will automatically re-enable it and update your `.skillsrc`.
2. **Distribution**: The CLI fetched the latest **High-Density Skills** and distributed them into your hidden agent folders (e.g., `.cursor/skills/`, `.github/skills/`). Your AI is now "upgraded" with your team's standards.

### 3. Validate Skills (For Contributors)

```bash
npx agent-skills-standard@latest validate
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
    # ➕ Include specific skills (supports cross-category 'category/skill' or 'category/*' syntax)
    include:
      - 'bloc-state-management'
      - 'react/hooks'
      - 'common/*'
    # 🔒 Protect local modifications from being overwritten
    custom_overrides: ['bloc-state-management']
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

## ❓ Troubleshooting

### Invalid .skillsrc

If the CLI complains about configuration format:

- Ensure `registry` is a valid URL.
- Ensure `skills` is a map of categories to config objects.
- Run `npx agent-skills-standard@latest init` to generate a fresh valid config.

---

## 🌍 Registry Ecosystem

The Agent Skills Standard is designed to be the universal language for engineering standards.

### 🔹 Current Support (v1.5.2)

| Category            | Key Modules                                           | Version  | Skills | Avg. Footprint |
| :------------------ | :---------------------------------------------------- | :------- | :----- | :------------- |
| **☕ Spring Boot**  | Architecture, Security, Data, Test, Microservices     | `v1.0.0` | 10     | ~339 tokens    |
| **🌐 Common**       | SOLID, Security, Perf Engineering, TDD, Architecture  | `v1.2.4` | 12     | ~564 tokens    |
| **💙 Flutter**      | Clean Arch, BLoC, Riverpod, Testing, GetX, Nav v1     | `v1.1.2` | 19     | ~413 tokens    |
| **🎯 Dart**         | Idiomatic Patterns, Advanced Tooling, Build Runner    | `v1.0.3` | 3      | ~351 tokens    |
| **☕ Java**         | Modern Syntax, Virtual Threads, Testing, Tooling      | `v1.0.0` | 5      | ~522 tokens    |
| **🔷 TypeScript**   | Type Safety, Security, Best Practices, Tooling        | `v1.0.4` | 4      | ~403 tokens    |
| **🟨 JavaScript**   | Modern ES2022+ Patterns, Async/Await, Functional      | `v1.0.2` | 5      | ~522 tokens    |
| **⚛️ React**        | Hooks, State Management, Performance, Security        | `v1.0.2` | 8      | ~390 tokens    |
| **📱 React Native** | Arch, Perf, Navigation, Security, Deployment          | `v1.0.1` | 8      | ~390 tokens    |
| **🦁 NestJS**       | Architecture, Microservices, Security, CQRS, Scalling | `v1.0.3` | 18     | ~498 tokens    |
| **▲ Next.js**       | App Router, Server Actions, Testing, Security, FSD    | `v1.0.3` | 16     | ~438 tokens    |
| **🐘 Laravel**      | Clean Arch, Eloquent, Security, Jobs, Redis, API      | `v1.0.0` | 10     | ~361 tokens    |
| **🐹 Golang**       | Clean Architecture, API Design, Concurrency, Security | `v1.0.2` | 10     | ~357 tokens    |
| **🐘 Kotlin**       | Idiomatic Patterns, Coroutines, Flow, Tooling         | `v1.0.0` | 4      | ~494 tokens    |
| **🅰️ Angular**      | Standalone, Signals, Control Flow, SSR, Testing       | `v1.0.0` | 14     | ~273 tokens    |
| **🤖 Android**      | Architecture, Compose, DI, Perf, Testing, WorkManager | `v1.0.0` | 19     | ~278 tokens    |
| **🍎 Swift**        | Language, Memory, Concurrency, SwiftUI, Testing       | `v1.0.0` | 8      | ~354 tokens    |
| **📱 iOS**          | Arch, UI, Lifecycle, Security, Perf, Networking, DI   | `v1.0.0` | 11     | ~429 tokens    |

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
- [x] **Golang** (v1.0.0 released)
- [x] **Angular** (v1.0.0 released)
- [x] **Kotlin** (v1.0.0 released)
- [x] **Spring Boot** (v1.1.0 released)
- [x] **Android Native** (v1.0.0 released)
- [x] **iOS Native & SwiftUI** (v1.0.0 released)
- [x] **React Native** (v1.0.0 released)
- [x] **Laravel Expert** (v1.0.0 released)

- [ ] **Agent Skills Dashboard** (Web UI for browsing standards)

---

## 📄 License & Credits

- **License**: MIT
- **Author**: [Hoang Nguyen](https://github.com/HoangNguyen0403)

---
