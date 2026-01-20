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

Core design principles and architecture of the Agent Skills Standard system for AI agents.

## 🎯 Core Design Principle

**Skills are separated by package/library for CLI detection, NOT for redundancy.**

## 📦 Package Detection System

The CLI automatically detects installed packages and applies relevant skills:

- **Node.js projects**: Scans `package.json` dependencies
- **Flutter/Dart projects**: Scans `pubspec.yaml` dependencies
- **Skill Triggering**: Skills activate based on `metadata.triggers.keywords`

## 🚫 Consolidation Anti-Pattern

**NEVER consolidate skills that serve different packages.**

### ❌ Wrong: Single "State Management" skill

```text
skills/flutter/state-management/SKILL.md  # Covers BLoC + Riverpod + GetX
```

### ✅ Right: Separate skills per package

```text
skills/flutter/bloc-state-management/SKILL.md      # flutter_bloc package
skills/flutter/riverpod-state-management/SKILL.md   # riverpod package
skills/flutter/getx-state-management/SKILL.md       # getx package
```

## 🔍 Why Separate Skills?

1. **Team Choice**: Different teams prefer different libraries
2. **Migration Paths**: Teams can switch between approaches
3. **Package Detection**: CLI detects which packages are installed
4. **Focused Guidance**: Each library gets accurate instructions

## 🛡️ Validation Protection

The CLI validation will **FAIL HARD** if consolidation breaks package detection:

```bash
❌ CONSOLIDATION BLOCKED: Multiple similar skills found in flutter/.
   Each skill must target different packages/libraries.
```

## 📋 Quick Check Commands

```bash
# Validate all skills (catches consolidation issues)
pnpm validate:all

# Check changed skills only
pnpm validate

# List all skills to see separation
pnpm list-skills
```

## 🎯 Decision Framework

**Before consolidating skills, ask:**

1. ✅ Do these skills target **different packages**?
2. ✅ Are they triggered by **different package installations**?
3. ✅ Do they serve **different team preferences/use cases**?
4. ✅ Would consolidation **break CLI package detection**?

If **any answer is NO** → **Keep skills separate**

## 📖 Usage Examples

**Navigation Skills (Flutter):**

- `go-router-navigation` → triggered by `go_router` package
- `auto-route-navigation` → triggered by `auto_route` package
- `navigator-v1-navigation` → triggered by built-in `Navigator`

**State Management Skills (Flutter):**

- `bloc-state-management` → triggered by `flutter_bloc` package
- `riverpod-state-management` → triggered by `riverpod` package
- `getx-state-management` → triggered by `getx` package
