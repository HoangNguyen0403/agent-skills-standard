# 0003: Generated mirrors are never hand-edited

## Status

accepted — 2026-11-18

## Context

Native agent exports under `.agents/`, `.claude/`, `.codex/`, and `.github/skills/` are derived output, while `.agents/workflows/**` is canonical authored source. Normal sync is ownership-aware: an edited, unowned, or overridden canonical body is preserved and reported instead of being certified as managed, and `pnpm generate-indices` refuses an uncommitted working-tree edit that differs from both `HEAD` and the resolved stage bytes, or a differing output without trusted ownership. For selected canonical workflows the repository generator is stricter: it forces only deterministic export paths and backs up the replaced bytes first, and it refuses to run from a working directory whose realpath differs from the authoring repository root.

## Decision

Never hand-edit a generated native workflow export. Sync installs the canonical body once per configured provider and derives native output from it; regenerate through `pnpm generate-indices` and the normal sync tooling. A committed mirror edit no longer blocks generation publication, but only the canonical body defines behavior, and forced deterministic export paths are replaced with a backup of the previous bytes. The generator never forces `.agents/workflows/**`.

## Consequences

Edits belong in canonical files, and generated diffs follow the producer instead of manual changes. Normal sync preserves and reports edited, unowned, or overridden canonical bodies rather than claiming them managed; an uncommitted differing mirror edit stops the run instead of being silently overwritten. Contributors need the generator and the authoring repository root for forced export paths.

## Source

[CONTRIBUTING rules 9-10 and generated-output integrity](../../CONTRIBUTING.md).
