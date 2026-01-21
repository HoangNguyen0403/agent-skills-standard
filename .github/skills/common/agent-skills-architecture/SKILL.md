---
name: Agent Skills Architecture
description: Foundational "High-Density" standard for token-optimized agent instructions and CLI-based automated activation.
metadata:
  labels: [architecture, high-density, meta, optimization, cli-integration]
  triggers:
    files: ['.skillsrc', 'metadata.json', 'SKILL.md']
    keywords:
      [
        skill architecture,
        high-density standard,
        modular skills,
        dependency exclusion,
        skill separation,
      ]
---

# Agent Skills Architecture Standard

## **Priority: P0 (CRITICAL)**

The primary goal is **Maximum Information Density** and **Automated Precision**.

## 🏗️ Core Architectural Pillars

### 1. **Separation by Package (Granularity)**

- **Rule**: Separate skills based on specific library/framework dependencies.
- **Goal**: Avoid context pollution. Don't load "Riverpod" instructions into a "BLoC" project.
- **Example**: `flutter/bloc-state-management` vs `flutter/riverpod-state-management`.

### 2. **Presence = Active (Simplified Configuration)**

- **Logic**: If a skill is listed in `.skillsrc`, it is considered active.
- **Standard**: Remove legacy `enabled` flags. Control activation via inclusion/exclusion lists.

### 3. **CLI Detection & Dynamic Exclusion**

- **Mechanism**: The CLI (`ags`) maps `package.json`/`pubspec.yaml` dependencies to skill IDs.
- **Exclusion**: Irrelevant sub-skills are automatically added to the `exclude` list during initialization if their corresponding packages are missing.

### 4. **Progressive Disclosure (Three-Level Loading)**

- **Level 1 (Metadata)**: Triggers activation via high-precision keywords/files.
- **Level 2 (SKILL.md Body)**: Core imperative logic (<500 lines). No conversational fluff.
- **Level 3 (References)**: Detailed examples, complex patterns, scripts. Lazy-loaded on-demand.

## 📦 ID & Naming Standards

- **Category**: Lowercase letters (e.g., `flutter`, `nestjs`).
- **Skill ID**: Kebab-case, must match the directory name.
- **Registry ID**: Must match the Skill ID for automated CLI detection/exclusion.

## 📋 High-Density Writing Style

- **Imperative Mood**: Use "Use X", "Avoid Y". No "Please" or "You should".
- **Token Compression**: Skip articles ("the", "a") where possible. Use bullet points > paragraphs.
- **Anti-Patterns**: Avoid conversational intros ("In this skill, we see...").

## 🔗 Internal References

- [Skill Creator Standard](../../skill-creator/SKILL.md) - Detailed authoring rules.
- [Resource Organization](../../skill-creator/references/resource-organization.md) - Folder structure best practices.
