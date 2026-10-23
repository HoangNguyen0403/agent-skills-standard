# Recorded gate failure and correction

This file records a real failure, not a passing claim.

## Observed failure

- Parent-run full CLI gate: **1331 PASS, 1 FAIL**.
- Failing check: `WorkflowTransformer` checked-in wrapper parity for
  `implement-feature` — expected the new canonical body, received the old one.
- `pnpm generate-indices` had reported success, so at least one checked-in
  wrapper was stale. `docs:capabilities:check` did not run in that invocation
  because the CLI gate failed earlier.

## Cause

The repository commits generated workflow mirrors (`.codex/skills/<key>/SKILL.md`,
`.github/prompts/<key>.prompt.md`, `.claude/commands/<key>.md`,
`.agents/workflows/<key>.md`) but `.skills-lock.json` had no ownership entries
for those paths. `scripts/generate-indices.ts` called
`beginInstall(config, { dryRun: false, force: [] })`, so the ownership writer
classified the tracked wrappers as unowned/edited, preserved them, and printed
no error. Canonical `.agents/workflows/implement-feature.md` and
`review-ticket.md` had changed; their wrappers did not follow.

## Correction

`scripts/generate-indices.ts` now derives an explicit force list from the
selected canonical workflow names and each configured agent's declared
`workflowPath`/`workflowFormat` (`command`, `toml`, `prompt`, `skill`,
`native`). Only deterministic export paths are forced; canonical authoring
sources and user-authored files are never listed. The ownership writer still
backs up before replacement: `.ags/backups/20261023-060813/manifest.json`
records the six replaced wrappers (`implement-feature` and `review-ticket` for
Copilot, Codex and Claude).

## Post-fix observation

`pnpm generate-indices` reran with the same export counts and no error; the
three wrappers for `implement-feature` (and the `review-ticket` set) changed on
disk and now contain the canonical content. The stale bytes are preserved in
the backup directory. The parent's final full CLI suite then passed
**1332/1332 across 66 files**, including checked-in wrapper parity.

## Boundary smoke: failure then resolution

- First foreign-CWD smoke: **FAILED** — observed exit `0`, expected nonzero. The
  guard threw before any index/write, but the script footer
  `generate().catch(console.error)` caught it and left the process at exit 0.
- Consequence at the time: the `&&` chain stopped; no post-guard generator or
  parity result existed.
- Resolution (separate owner, `task-8-correction-report.md`): typed rejection
  callback logs the error and sets `process.exitCode = 1` without calling
  `process.exit`.
- Re-run: **PASS** — exit `1` with the authoring-root diagnostic,
  `consumerUnchanged: true`, `watchedAuthoringFilesUnchanged: true`
  (`generator-boundary-smoke-receipt.json`). Normal generation and
  `WorkflowTransformer` 43 + `docs:capabilities:check` then PASS.

## Other recorded gate notes

- MCP format check initially failed on 4 changed tests; parent-applied Prettier
  fixes landed and `format:check` now PASSes.
- CLI/MCP lint PASS, CLI build PASS, MCP bundle/strict type check PASS, and
  `docs:capabilities:check` PASS were reported by the parent.
- Whole-CLI strict typing still reports 16 pre-existing construct diagnostics;
  CLI format keeps 2 pre-existing warnings in untouched spec files.
