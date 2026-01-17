# CLI Sync Workflow Documentation

This document explains how to use the `agent-skills-standard` CLI to automatically sync Flutter and Dart agent skills from the central repository to your project.

## Overview

The `agent-skills-standard` CLI provides automated version management for agent skills, allowing teams to:

- Initialize project-specific skill configurations.
- Sync specific versions of skills using Git tags.
- Support multiple AI Agents (Cursor, Claude, Copilot, Antigravity).
- Implement Progressive Disclosure to save token costs.

---

## Installation & Setup

### 1. Installation

The CLI can be run directly via `npx` or installed globally:

```bash
# Run without installation
npx agent-skills-standard <command>

# Or install globally
npm install -g agent-skills-standard
```

### 2. Initialization

To start using the standard in your project, run the `init` command. This will create a `.skillsrc` file in your root directory.

```bash
agent-skills-standard init
```

The CLI will ask you:

1. Which AI Agents you are using (Cursor, Claude, etc.).
2. Which skill categories to enable (Flutter, Dart, etc.).
3. Which specific skills to include/exclude.

---

## Configuration File: .skillsrc

The `.skillsrc` file declares your skill dependencies and targeted versions:

```yaml
registry: https://github.com/HoangNguyen0403/agent-skills-standard
agents:
  - cursor
  - copilot
skills:
  flutter:
    ref: 'flutter-v1.0.0'
    enabled: true
    exclude: ['go-router-navigation'] # Skip specific skills
  dart:
    ref: 'dart-v1.0.0'
    enabled: true
```

### Configuration Options

- **registry**: URL of the central skills repository.
- **agents**: List of target agents to sync skills for.
- **skills.{category}.ref**: The Git tag or branch to sync (e.g., `flutter-v1.0.0`).
- **skills.{category}.enabled**: Boolean flag to toggle the category.
- **skills.{category}.include/exclude**: Granular control over specific skills within a category.

---

## CLI Sync Behavior

When you run `agent-skills-standard sync`, the tool follows a **Selective Sync** strategy.

### 1. Progressive Disclosure (Token Efficiency)

The registry implements a split-context pattern. The CLI fetches:

- **`SKILL.md`**: The core rules (High Density, Low Tokens).
- **`references/`**: Detailed examples and code snippets.

**Why?**
Agents load `SKILL.md` automatically. They only read the `references/` if the core rules aren't enough, preventing "context bloat" and saving thousands of tokens per chat session.

### 2. Automated Mapping

The CLI automatically maps registry folders to agent-specific hidden directories:

| Agent              | Output Path               |
| :----------------- | :------------------------ |
| **Antigravity**    | `.agent/skills/external/` |
| **Cursor**         | `.cursor/skills/`         |
| **GitHub Copilot** | `.github/skills/`         |
| **Claude Code**    | `.claude/skills/`         |

### 3. Step-by-Step Logic

1. **Reads `.skillsrc`**: Validates the configuration and registry URL.
2. **Discovers Remote Files**: Queries the GitHub Trees API for the specified `ref`.
3. **Selective Fetching**: Downloads only the supported files (`SKILL.md`, `references/**`, `scripts/**`).
4. **Target Distribution**: Distributes the fetched content to all enabled agent directories.
5. **Clean Updates**: Overwrites existing files to ensure they match the registry version perfectly. **Note: Non-conflicting custom folders in your agent directory are preserved.**

---

## Safe Merging & Overrides

The CLI is designed to coexist with your own custom skills.

### 1. Merging with Existing Skills

The `agent-skills-standard sync` command **adds** folders to your agent's skills directory. It does not delete or "wipe" your existing custom skills.

- If you have a custom folder `.cursor/skills/my-project-specific-rules/`, it will remain untouched.
- If you have a folder that matches a registry skill name (e.g., `flutter-performance`), only the files we manage (`SKILL.md`, `references/`, etc.) will be updated.

### 2. Protecting Specific Files (`custom_overrides`)

If there are specific files or entire skill folders managed by the registry that you want to customize locally and **never** overwrite, add them to `custom_overrides` in your `.skillsrc`:

```yaml
custom_overrides:
  # Protect a single file
  - .cursor/skills/flutter-bloc-state-management/SKILL.md

  # Protect an entire skill folder (and all its references)
  - .cursor/skills/flutter-performance/
```

The sync tool will skip any file or directory listed in this array, allowing you to maintain project-specific forks of standard rules.

---

## Usage Examples

### Initialize a Project

```bash
$ agent-skills-standard init

? Select AI Agents to support: Cursor, GitHub Copilot
? Enable Flutter skills? Yes
? Configure specific Flutter skills? No (Include all)
? Enable Dart skills? Yes
? Registry URL: https://github.com/HoangNguyen0403/agent-skills-standard

✅ Created .skillsrc
```

### Sync Skills

```bash
$ agent-skills-standard sync

🚀 Syncing skills from https://github.com/HoangNguyen0403/agent-skills-standard...
  - Discovering flutter skills via GitHub API (flutter-v1.0.0)...
    + Fetched flutter/auto-route-navigation (2 files)
    + Fetched flutter/bloc-state-management (3 files)
  - Discovering dart skills via GitHub API (dart-v1.0.0)...
    + Fetched dart/language (1 files)
  - Updated .cursor/skills/ (Cursor)
  - Updated .github/skills/ (GitHub Copilot)

✅ All skills synced successfully!
```

---

## Version Locking

### Pinning a Version

Always use tags (`category-vX.Y.Z`) in production to ensure stability.

```yaml
skills:
  flutter:
    ref: flutter-v1.0.0
```

### Using Development Latest

Use `main` to always get the latest iterations from the registry.

```yaml
skills:
  flutter:
    ref: main
```

---

## Registry Tag Naming Convention

Tags in the registry follow the `semver` standard combined with the category:

- `flutter-v1.0.0`
- `dart-v1.1.0`
- `cli-v1.0.0` (for the tool itself)

---

## Troubleshooting

### `Error: .skillsrc not found`

Run `agent-skills-standard init` first to generate the configuration.

### `Failed to fetch remote skills (Status: 404)`

Ensure the `ref` (tag name) exists in the registry. Check the [Releases](https://github.com/HoangNguyen0403/agent-skills-standard/releases) page for valid tags.

### `Only GitHub registries are supported`

The current version of the CLI uses the GitHub API for discovery. Ensure your `registry` URL points to a GitHub repository.

---

## Best Practices

- **Check-in `.skillsrc`**: Always commit this file so your entire team uses the same skill versions.
- **Do NOT Edit Synced Files**: Local changes in `.cursor/skills/` will be overwritten on the next sync. Propose changes to the central registry instead.
- **Use `include/exclude`**: If your project doesn't use a specific library (e.g., you use `go_router` instead of `auto_route`), exclude the irrelevant skills to save space.

---

## Related Documentation

- [README.md](README.md) - Repository overview and usage
- [CHANGELOG.md](CHANGELOG.md) - Version history and updates
- [Registry Metadata](skills/metadata.json) - Detailed versioning info
