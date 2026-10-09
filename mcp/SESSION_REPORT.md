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

Codex JSONL `event_msg/token_count` records carry `total_token_usage` cumulative snapshots and/or `last_token_usage` event values. Cumulative baselines are updated only from valid, nondecreasing snapshots, including before the requested window; only in-window deltas are billed. Cached input is part of Codex input, so uncached input is input minus known cached input. Native `cache_write_input_tokens` is preserved as the separate cache-write delta for both cumulative and per-event records. The pinned protocol has no recorded-cost field and does not define the old `auxiliary_tokens` extension; that unsupported field is not exported.
The derived delta must also satisfy cached input ≤ input before billing or advancing the baseline. An invalid delta makes coverage incomplete and leaves the preceding valid baseline in place for recovery.

OMP v3 assistant messages store native `usage.input`, `cacheRead`, `cacheWrite`, `reasoningTokens`, and `usage.cost.total`. Input and cache-read are independent buckets. Reasoning is included in output and is reported only as a submetric. `usage.orchestration.input`, `.cacheRead`, and `.output`, when present, are preserved in separate nullable buckets; they are not added to conversation counters or reconstructed from `totalTokens`. Each persisted session message has its own required row ID and contains an `AgentMessage`; `model_usage` rows have independent native usage identity, model, purpose, and optional model role. Model-usage calls keep their declared actor role but use `usageKind: "auxiliary"`, retain native purpose/model-role provenance, and are not counted as transcript messages. Replayed matching identities count once; conflicting valid records make coverage incomplete. No inferred partial/draft replacement semantics are claimed.
Native `purpose` and `role` labels matching any expected session ID or any row ID across selected OMP journals are redacted to `null` before final grouping/export, independent of journal selection order; valid usage remains accounted. If an OMP identity scan is incomplete because of malformed or resource-limited input, all native purpose/model-role labels are withheld rather than risk exporting an identity.

Native source references used to delimit these decoders:

- OMP v18.6.1 [session format](https://github.com/can1357/oh-my-pi/blob/v18.6.1/docs/session.md), [`SessionMessageEntry` and `ModelUsageEntry`](https://github.com/can1357/oh-my-pi/blob/v18.6.1/packages/coding-agent/src/session/session-entries.ts), [`Usage`](https://github.com/can1357/oh-my-pi/blob/v18.6.1/packages/catalog/src/types.ts), and [`StopReason`](https://github.com/can1357/oh-my-pi/blob/v18.6.1/packages/ai/src/types.ts).
- Codex CLI 0.160.0 [`TokenUsage` protocol](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/protocol/src/protocol.rs) and [`TokenUsageInfo` display contract](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/tui/src/token_usage.rs). Token-count info is optional in the native event schema; when a token-count event has no usable info, this report marks coverage incomplete rather than treating it as an ordinary non-usage event. Codex interruption is represented by `event_msg` / `payload.type = "turn_aborted"`; OMP interruption uses `message.stopReason = "aborted"` (or `model_usage.stopReason = "aborted"`).

Missing native submetrics and absent cost remain `null`; each optional orchestration submetric remains independently unknown when not reported. A present malformed native submetric or malformed model-usage provenance makes coverage incomplete. A group with any usage lacking a recorded estimate has unknown aggregate recorded cost. No rates, invoice totals, or elapsed-time compute are inferred. Path-like model metadata is reported as `unreported`, without exporting the source string. Malformed, invalid, aborted, unsupported, missing-actor, or no-usage coverage is explicitly incomplete. This report cannot establish completeness beyond the supplied journal paths and actor inventory.
Identity collisions alone redact only the colliding provenance value; they do not invalidate or omit the usage record.

OMP native row identity/replay state is capped at 10,000 distinct record IDs per selected journal and never evicts an identity. That per-journal state covers rows not billed as well as assistant/model-usage rows so a later exported provenance value can be checked against every row ID in the journal. A separate global privacy-membership set is capped at 10,000 distinct OMP row IDs across selected journals. If that global cap is reached, valid accounting continues in later rows and journals, but all native purpose/model-role labels are withheld; coverage is incomplete and the resource-limit flag is set. By contrast, malformed scans or a per-journal identity cap also withhold all native provenance, and malformed/per-journal limits stop accounting in the affected journal while later selected journals remain processable.

Build/package uses the existing MCP dependency set and Node 20-compatible CommonJS bundle. The package exposes `ags-mcp-session-report` from `dist/session-journal-cli.js`. Use both `--json` and human output modes for local checks; output contains aggregate values only.
