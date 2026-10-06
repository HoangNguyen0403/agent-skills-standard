---
name: project-skill-maintenance
description: Maintenance procedures for contributing and managing skills within the agent-skills-standard repository — metadata versioning, mirror generation, and release quality gates. For general skill authoring standards, see common-skill-creator.
metadata:
  internal: true
  labels:
    [repository, maintenance, metadata, contribution, release-workflow]
  triggers:
    files:
      - 'skills/metadata.json'
      - '.skillsrc'
    keywords:
      - repo skill maintenance
      - update skills metadata
      - bump category version
      - sync skill mirrors
      - release skills standard
---

# Repository Skill Maintenance Standard

## **Priority: P1 (HIGH)**

Project-local maintenance procedures for contributing to `agent-skills-standard`.

> **Generic Skill Authoring**: Follow the canonical [`common-skill-creator` standard](../common/common-skill-creator/SKILL.md); this local skill covers repository maintenance only.

## Repository Contribution Workflow

1. **Canonical Authoring**:
   - Add or edit skills in canonical `skills/<category>/<skill-name>/`.
   - Never hand-edit generated agent mirrors in `.agents/`, `.claude/`, `.codex/`, or `.github/`.
2. **Metadata Versioning (`skills/metadata.json`)**:
   - When modifying `skills/<category>/**`, bump `categories.<category>.version` (patch increment for bugfixes/modernization) and update `last_updated` date (`YYYY-MM-DD`).
   - When modifying `.agents/workflows/**`, bump `releases.workflows.version`.
3. **Mirror Synchronization**:
   - Run `pnpm generate-indices` once to propagate canonical skills, workflows, and specialists into native agent directories.
4. **Validation Quality Gates**:
   - Run `pnpm validate:all` (structure, format, injection scan).
   - Run `pnpm audit:sdlc` and `pnpm audit:skills`.
   - Run `pnpm check-alignment`.
5. **Changelog & Release**:
   - Record user-facing changes under `[Unreleased]` in `CHANGELOG.md`.
   - Use release scripts: `pnpm release-cli`, `pnpm release-all-skills`, `pnpm release:manifest`.

## Canonical Authoring References

- [Skill template](../common/common-skill-creator/references/TEMPLATE.md)
- [Skill lifecycle](../common/common-skill-creator/references/lifecycle.md)
- [Resource organization](../common/common-skill-creator/references/resource-organization.md)
