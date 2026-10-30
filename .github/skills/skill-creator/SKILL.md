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

1. **Canonical Authoring & Intake**:
   - Add or edit skills in canonical `skills/<category>/<skill-name>/`.
   - Distinguish search failure or current checkout absence from absent capability; search authorized refs/worktrees before deciding a capability is absent or creating duplicate skills.
   - Never hand-edit generated agent mirrors in `.agents/`, `.claude/`, `.codex/`, or `.github/`.
2. **Metadata Versioning (`skills/metadata.json`)**:
   - When modifying `skills/<category>/**`, bump `categories.<category>.version` (patch increment for bugfixes/modernization) and update `last_updated` date (`YYYY-MM-DD`).
   - When modifying `.agents/workflows/**`, bump `releases.workflows.version`.
3. **Mirror Synchronization**:
   - Run `pnpm generate-indices` once to propagate canonical skills, workflows, and specialists into native agent directories.
4. **Validation Quality Gates & Publication Preflight**:
   - Run `pnpm validate:all` (structure, format, injection scan).
   - Run `pnpm audit:sdlc` and `pnpm audit:skills`.
   - Run `pnpm check-alignment`.
   - Verify final canonical→host ID-set and resource parity and real consumer discovery (e.g. index completeness; foreign CWD or edited conflicts abort).
   - Record warnings, skips, and NOT RUN separately from PASS.
   - Review public derivatives for private paths/links and one-way manifests.
5. **Changelog & Release**:
   - Record user-facing changes under `[Unreleased]` in `CHANGELOG.md`.
   - Keep publication separate from activation: publication approval never grants merge, deploy, or runtime-change authority.
   - Use release scripts: `pnpm release-cli`, `pnpm release-all-skills`, `pnpm release:manifest`.
## Canonical Authoring References

- [Skill template](../common/common-skill-creator/references/TEMPLATE.md)
- [Skill lifecycle](../common/common-skill-creator/references/lifecycle.md)
- [Resource organization](../common/common-skill-creator/references/resource-organization.md)
