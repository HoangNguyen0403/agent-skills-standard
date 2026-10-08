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

Codex JSONL `event_msg/token_count` records carry `total_token_usage` cumulative snapshots and/or `last_token_usage` event values. Cumulative baselines are updated only from valid, nondecreasing snapshots, including before the requested window; only in-window deltas are billed. Cached input is part of Codex input, so uncached input is input minus known cached input. Codex token-count records have no native recorded-cost field. The separately queried thread-usage estimate is outside the selected rollout records and is not attributed to this report; Codex recorded cost therefore remains unknown.

OMP v3 assistant messages store native `usage.input`, `cacheRead`, `cacheWrite`, `reasoningTokens`, and `usage.cost.total`. Input and cache-read are independent buckets. Reasoning is included in output and is reported only as a submetric. Each persisted session message has its own required row ID and contains an `AgentMessage`; this format does not define `isDraft` or `finalized` row flags. Messages without usage or a row identity are incomplete and not billed. Replayed matching identities count once; conflicting valid final records make coverage incomplete. No inferred partial/draft replacement semantics are claimed.

Native source references used to delimit these decoders:

- OMP v18.6.1 [session format](https://github.com/can1357/oh-my-pi/blob/v18.6.1/docs/session.md), [`SessionMessageEntry`](https://github.com/can1357/oh-my-pi/blob/v18.6.1/packages/coding-agent/src/session/session-entries.ts), [`Usage`](https://github.com/can1357/oh-my-pi/blob/v18.6.1/packages/catalog/src/types.ts), and [`StopReason`](https://github.com/can1357/oh-my-pi/blob/v18.6.1/packages/ai/src/types.ts).
- Codex CLI 0.160.0 [`TokenUsageInfo`](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/tui/src/token_usage.rs) and [`EventMsg`, `TokenCountEvent`, and `TurnAbortedEvent`](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/protocol/src/protocol.rs). Token-count info is optional in the native event schema; when a token-count event has no usable info, this report marks coverage incomplete rather than treating it as an ordinary non-usage event. Codex interruption is represented by `event_msg` / `payload.type = "turn_aborted"`; OMP interruption uses `message.stopReason = "aborted"` (or `model_usage.stopReason = "aborted"`).

Missing provider submetrics and absent cost remain `null`; a group with any usage lacking a recorded estimate has unknown aggregate recorded cost. No rates, invoice totals, or elapsed-time compute are inferred. Path-like model metadata is reported as `unreported`, without exporting the source string. Malformed, invalid, aborted, unsupported, missing-actor, or no-usage coverage is explicitly incomplete. This report cannot establish completeness beyond the supplied journal paths and actor inventory.

The streaming reader retains at most 1,000,000 characters of line state, plus one bounded input chunk, before discarding an oversized record. Identity replay state is capped at 10,000 retained native record IDs per selected journal. On either limit, collection stops accounting past that point, sets `resourceLimitReached`, and reports incomplete coverage; identities are never silently evicted.

Build/package uses the existing MCP dependency set and Node 20-compatible CommonJS bundle. The package exposes `ags-mcp-session-report` from `dist/session-journal-cli.js`. Use both `--json` and human output modes for local checks; output contains aggregate values only.
