# Task 7 report — deterministic lifecycle and full-actor usage qualification

Status: `GREEN implemented` (source + regression tests complete; nothing
executed). No tests, checks, builds, lint, formatters, model calls, delegation,
premium or commit. `mcp/src/tools/index.ts` and
`mcp/src/services/TelemetryWriter.ts` untouched.

## Ownership transfer (effective now)

- `scripts/harness-smoke/qualification.ts` and
  `scripts/harness-smoke/qualification.test.ts` are **no longer Task 7 owned**;
  they were transferred to Personal · Delivery
  `39829cee-d17b-488b-aebc-9538b005dc47`. No further edits were made to those
  files after transfer.
- Residual reviewer findings in that module, intentionally not fixed here:
  anonymous (`undefined`) task/attempt identities can compare equal and verify,
  and a dispatch recorded with `outcome: "observed_fail"` still establishes the
  active task. The new owner has these; this report does not claim they are
  closed.
- Retained here: SessionJournal/WorkflowTelemetry/CLI accounting, evals cost
  and cohort fixes, docs, and this report.


## Settled source

### `mcp/src/services/SessionJournal.ts`
- `AttemptOutcome` includes `cancelled`; every outcome keeps its own usage group.
- Declared `taskId` / `parentTaskId` labels; groups expose them (`null` when
  undeclared).
- Optional `expectedActors` inventory; `coverage.missingActors` lists only
  role/task/parent/purpose labels, never native IDs; duplicates rejected.
- Report-boundary redaction of declared `taskId` / `parentTaskId` /
  `auxiliaryPurpose` labels that collide with any expected or selected native
  identity (session or row ID). Usage stays accounted, groups/missingActors show
  unknown, `coverage.redactedActorLabels` counts distinct collisions, and
  coverage becomes incomplete.

### `mcp/src/session-journal-cli.ts`
Task/Parent columns and a missing-actor line built from declared labels only.

### `mcp/src/services/WorkflowTelemetry.ts`
`reasoningBilling: "separate" | "included-in-output"`; included reasoning is not
priced twice, separate keeps the old behavior, and a positive reasoning price
with undeclared semantics returns `null` cost plus `costSource: "unavailable"`
and `reasoningBilling` in `missingHostFields`. Mock-echo and payload-mapping
specs deleted; provenance behavior retained.

### `scripts/evals` pipeline
- Explicit baseline provenance: v2 manifest top-level `baselineRunId` is copied
  into `RunResults.baselineRunId` by the scorer; the reporter reads that field.
  No casts, no metadata fallback.
- `RunMetadata.taskUsage` records `{arm, outcome, usage, taskId?,
  parentTaskId?, actorRole?, attemptId?}`. `execute.ts` records completed /
  interrupted (quota) / failed attempts with `usage: null` (never estimated) and
  does not invent task or actor identities.
- `summarizeTaskUsage` returns totals, outcome counts, `observedActors`,
  `unknownActorAttempts`, `taskIds`, and `complete`. `complete` requires an
  explicit declared actor inventory fully observed, one task, known attempt
  identity, all lanes metered and a resolved price. It is never inferred from
  the array.
- `compareTaskUsage` withholds savings for empty cohorts, unmetered lanes,
  unresolved price, unknown membership, uncertified coverage, mismatched task
  scope — in that order — and only then emits a number.
- `buildEvalsReportMarkdown` Task Economics section uses `run.baselineRunId`,
  reports observed actors and unknown-actor attempts, and withholds savings
  because executed lanes are worker attempts without a certified full inventory.

### `scripts/harness-smoke`
- Shared vocabulary from `cli/src/capabilities/agentCapabilities.ts`; records
  use declared surface IDs validated against `AGENT_CAPABILITIES` (surface kind
  rejected).
- Evidence containment uses `fs.realpathSync` for both the evidence root and
  the referenced target, before reading: lexical-only paths that escape,
  missing targets, and symlinks inside the root pointing outside are rejected.
  Digests are computed on the bytes actually read.
- `assessSupport` verifies artifact existence, digest and revision at the report
  boundary; supported requires retained live discovery + execution + per-control
  denial; synthetic stays `not_verified`; failed denial is `unsupported`; the
  unauthenticated-provenance limitation is retained.
- `summarizeLifecycle` scopes every record to the dispatching task and revision
  and to the active attempt (a failed resume never replaces the active attempt);
  completion/receipt/acceptance from another task or attempt are ignored.
  Acceptance requires a known dispatching actor and a different reviewer.
  Authority-changing resume throws.
- `checkDelegationQualification` returns `fail` with explicit
  `lifecycle=invalid` when lifecycle evidence is contradictory, so an otherwise
  supported assessment cannot print `pass`; `run.ts --qualification-only
  --claim <path>` is the offline path (exit 2 without a claim, no probes,
  network, or model calls); default full smoke unchanged and still includes the
  qualification row.

### Docs
`mcp/SESSION_REPORT.md` (attribution, cancelled, expectedActors, collision
redaction) and `docs/EVALS.md` (taskUsage identities, explicit baseline
provenance, certification-before-savings).

## Regression tests added this round

- Journal: task labels colliding with a native identity are redacted, usage
  retained, `missingActors` labels withheld, coverage incomplete, and the raw
  native ID absent from serialized output.
- Lifecycle: completion/receipt/acceptance from another task ignored;
  failed resume does not replace the active attempt; missing dispatching actor
  blocks independent acceptance; contradictory lifecycle makes the harness check
  `fail` with `lifecycle=invalid`.
- Evidence containment: trace artifact symlinked outside the root rejected
  (`loadConformanceRecords` and `assessSupport`); claim record-index symlink
  outside the repository root rejected by the harness check.
- Cohort economics: failed/retried/cancelled attempts retained with certified
  identity; savings withheld for unmetered lanes, unresolved price, unknown
  membership, uncertified inventory, and mismatched task scope.

## Exact offline smoke (no checks were run; for the orchestrator)

Workspace-relative fixtures, no network/model call:

```bash
SMOKE=.agent/sdd/provider-neutral-delegation/smoke
rm -rf "$SMOKE" && mkdir -p "$SMOKE/workspace" "$SMOKE/evidence"

cat > "$SMOKE/session.jsonl" <<EOF
{"timestamp":"2026-10-23T00:00:00.000Z","type":"session_meta","payload":{"id":"sess-smoke-1","cwd":"$PWD/$SMOKE/workspace"}}
{"timestamp":"2026-10-23T00:01:00.000Z","type":"event_msg","payload":{"type":"token_count","info":{"last_token_usage":{"input_tokens":10,"cached_input_tokens":0,"output_tokens":5,"reasoning_output_tokens":0,"total_tokens":15}}}}
EOF
cat > "$SMOKE/manifest.json" <<EOF
{"workspace":"$PWD/$SMOKE/workspace","startedAt":"2026-10-23T00:00:00.000Z","completedAt":"2026-10-23T00:10:00.000Z","sessions":[{"path":"session.jsonl","format":"codex","role":"implementation","attemptOutcome":"cancelled","taskId":"task-a","parentTaskId":"task-root"}],"expectedSessionIds":["sess-smoke-1"],"expectedActors":[{"role":"implementation","taskId":"task-a","parentTaskId":"task-root"},{"role":"review","taskId":"task-a","parentTaskId":"task-root"}],"phaseWindows":[]}
EOF
rtk pnpm --filter ./mcp sessions:report --manifest "$SMOKE/manifest.json" --json

printf '%s\n' '{"event":"synthetic-discovery"}' > "$SMOKE/evidence/discovery.jsonl"
printf '%s\n' '{"event":"synthetic-execution"}' > "$SMOKE/evidence/execution.jsonl"
DISC=$(shasum -a 256 "$SMOKE/evidence/discovery.jsonl" | awk '{print $1}')
EXEC=$(shasum -a 256 "$SMOKE/evidence/execution.jsonl" | awk '{print $1}')
cat > "$SMOKE/records.jsonl" <<EOF
{"host":"codex","surface":"codex-subagents","version":"0.0.0-smoke","revision":"smoke-1","operation":"dispatch","layer":"discovery","executor":"synthetic","outcome":"observed_pass","trace":"$SMOKE/evidence/discovery.jsonl","digest":"$DISC","controls":[],"scenario":"smoke-discovery"}
{"host":"codex","surface":"codex-subagents","version":"0.0.0-smoke","revision":"smoke-1","operation":"dispatch","layer":"execution","executor":"synthetic","outcome":"observed_pass","trace":"$SMOKE/evidence/execution.jsonl","digest":"$EXEC","controls":[],"scenario":"smoke-execution"}
EOF
cat > "$SMOKE/claim.json" <<EOF
{"host":"codex","surface":"codex-subagents","version":"0.0.0-smoke","revision":"smoke-1","operation":"dispatch","controls":[],"records":["$SMOKE/records.jsonl"]}
EOF
rtk pnpm harness:smoke -- --qualification-only --claim "$SMOKE/claim.json"
rtk pnpm evals:report
```

Expected: cancelled attempt retained with task labels; missing `review` actor
listed by labels; qualification row `support=not_verified provenance=fixture`;
`--qualification-only` without `--claim` exits 2; Task Economics withholds
savings ("full actor coverage is not certified") for worker-only runs.

## Residual gated evidence

Native discovery/invocation/denial traces on pinned hosts (AC-5.a/b), matched
repeated baseline/current/proposed trials (AC-7.c), human approval (AC-6.c).
Gated examples remain `codex --version`, `codex mcp list`, host agent discovery,
bounded synthetic dispatch/denial scenarios, `pnpm evals:manifest -- --execute`.
