# Native session accounting report

`ags-mcp-session-report --manifest <manifest.json> [--json]` reads only the journals explicitly listed in a manifest. It emits aggregate counters, inventory coverage, limitations, and recorded native cost estimates; it never emits prompts, responses, credentials, paths, or native session identities. Recorded estimates are not invoices or price calculations.

## Manifest

The manifest contains:

- `workspace`: existing workspace directory, matched against each native journal header.
- `startedAt` and `completedAt`: increasing ISO timestamps; report windows are start-inclusive/end-exclusive.
- `sessions`: selected `{path, format, role, attemptOutcome, auxiliaryPurpose?}` entries. `format` is `codex` or `omp`; `attemptOutcome` is `completed`, `failed`, `retried`, `interrupted`, or `null`. Roles are `main`, `implementation`, `review`, and `auxiliary`. Auxiliary sessions require an explicit purpose label.
- `expectedSessionIds`: independently inventoried native session IDs. Every selected journal identity must belong to this list; missing expected IDs make coverage incomplete. This caller-provided scope does not discover all host activity.
- `phaseWindows`: zero or more non-overlapping `{phase, startedAt, completedAt}` windows inside report bounds. Supported phases: `planning`, `repair`, `acceptance`, `analysis`, `delivery`, `auxiliary`. Gaps and usage outside annotations remain phase `null`.

Journal paths are resolved relative to the manifest. Keep the manifest and journal files local to an authorized Personal workspace; do not provide employer journals or credentials.

## Counter semantics and limitations

Codex JSONL `event_msg/token_count` records use `total_token_usage` cumulative snapshots and/or `last_token_usage` event values. Cumulative baselines are updated even before the requested window; only in-window deltas are billed. Cached input is part of Codex input, so uncached input is input minus known cached input. Model attribution follows the model recorded for each event. OMP v3 assistant message `usage.input` remains its native input bucket; `cacheRead` and `cacheWrite` are separate fields and are not subtracted from input. Reasoning is reported as a submetric, not additional output.

Missing provider submetrics and absent cost remain `null`; a group with any usage lacking a recorded estimate has unknown aggregate recorded cost. No rates, invoice totals, or elapsed-time compute are inferred. Native response replays are deduplicated by identity; conflicting usage makes coverage incomplete. Malformed, invalid, aborted, unsupported, missing-actor, or no-usage coverage is explicitly incomplete. This report cannot establish completeness beyond the supplied journal paths and actor inventory.

Build/package uses the existing MCP dependency set and Node 20-compatible CommonJS bundle. The package exposes `ags-mcp-session-report` from `dist/session-journal-cli.js`. Use both `--json` and human output modes for local checks; output contains aggregate values only.
