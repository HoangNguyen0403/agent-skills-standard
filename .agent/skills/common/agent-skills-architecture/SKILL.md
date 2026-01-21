---
name: Agent Skills Architecture
description: Core design principles and architecture of the Agent Skills Standard system.
metadata:
  labels:
    [meta, architecture, system-design, skills-organization, package-detection]
  triggers:
    files: ['ARCHITECTURE.md', 'metadata.json']
    keywords:
      [
        skills architecture,
        package detection,
        skill separation,
        consolidation,
        agent skills standard,
      ]
---

# Agent Skills Standard - Architecture

## **Priority: P0 (FOUNDATIONAL)**

Core design principles: **Separation by Package** and **Progressive Disclosure**.

## 🎯 Core Design Principle

**Skills are separated by package/library for CLI detection.**

See [../../.github/skills/skill-creator/references/package-detection.md](../../skill-creator/references/package-detection.md) for the detailed rationale.

## 📦 Package Detection System

The CLI automatically detects installed packages (`package.json`, `pubspec.yaml`) and applies relevant skills.

## 🛡️ Validation & Standards

All skills must adhere to the **Skill Creator Standard**.

See [../../.github/skills/skill-creator/SKILL.md](../../skill-creator/SKILL.md) for authoring rules.

## 📋 Quick Commands

```bash
pnpm validate:all  # Validate all skills
pnpm list-skills   # List all separated skills
```
