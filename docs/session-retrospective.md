# Session Retrospectives — First-Run Guide

Prepare a local, evidence-backed retrospective for a finished agent session, then read it
yourself and decide what to change. Default behaviour: **zero model calls, zero outbound
requests, zero automatic edits** to skills, workflows, memory or configuration.

With the `agent-skills-standard` MCP server registered over stdio and a one-time human opt-in, the
orchestrator calls `prepare_retrospective`. The server binds its own session file from its own
recorded tool calls, counts what happened, and publishes `summary.md`, `ledger.json` and
`report.html` into a private local store. Native discovery writes no manifest. An explicit,
human-authored `LocalManifest` v1 can instead be supplied to the local CLI
(`ags retrospective prepare --manifest <absolute>`); it is declared scope, not authenticated host
inventory.

It reads only explicitly authorized local sources, applies deterministic local rules, and publishes
into a private local store. It neither rewrites a transcript, writes memory, changes a skill, nor
makes model or network calls.

The read boundary covers allowlisted structural fields — session and parent session ids, model,
assistant stop reason, tool name and tool-call id, the server tool name of this server's own
`write xd://mcp__agent_skills_standard_<tool>` calls, sanitized skill ids of `read skill://...`
calls, and `<permission-request>` records inside `permission-required` notification messages (opaque
request id, tool, kind, command text with linear-time best-effort secret redaction bounded at 2000
chars, joined to `respond_to_permission` verdicts). It also reads folder labels `{name, parent}` from
the session header `cwd` (no raw path stored or shown), and executes safe, bounded `execFile` git calls
in the session's working folder to read commit and file counts (which reads outside the listed source
roots; commit messages, file names, and hashes are never stored); the full table is in
[`session-retrospective-privacy.md`](./session-retrospective-privacy.md).

> **Status: capability release boundary.** The three manual MCP retrospective tools and the
> `ags retrospective` CLI commands shipped in `agent-skills-standard-mcp` 0.8.1 over stdio.
> `ags retrospective prepare --manifest` is unreleased source using the same consent, store and verifier.
> The automatic completion-preparation extension through `get_session_cost` is a separate
> unreleased source capability tracked in PR #295.
> This diagnostic-signals plan is also **unreleased source work**: consent version 5 and
> agent-record flags, ledger version 2, new diagnostic signals, `record_decision`, and the
> native secure-ingress package/CI candidate are not part of the released 0.8.1 capability.
> Darwin arm64/x64 and GNU/Linux glibc arm64/x64 are planned artifact targets; configuration or
> source does not establish artifact availability, runtime support, release, machine activation, or
> verified behavior. Tracking: `CHANGELOG.md` → `[Unreleased]`.

## Getting started

Works with any MCP client that connects to the `agent-skills-standard` server over stdio, with or
without OMP or Paseo. Nothing runs until a human enables it once. Host coverage — which providers
have a session reader and which surface uses which transport — is in
[`session-retrospective-hosts.md`](./session-retrospective-hosts.md); this guide keeps no
provider table of its own.

There is no separate `ags-retrospective` binary: the user-facing command is `ags retrospective <action>`
(in the `agent-skills-standard` CLI), which runs the pinned `agent-skills-standard-mcp` package
(`agent-skills-standard-mcp retrospective <action>` is the same thing and works directly without `ags`).
Until an `ags` release pins an MCP version containing this feature (`0.8.0` or newer), `ags retrospective`
refuses with a version message, and a pre-release build can be tested with `AGS_MCP_PACKAGE_SPEC=file:/absolute/path/agent-skills-standard-mcp-<version>.tgz` (a `file:` prefix is required; a bare path is run as a command by `npx`).

### One-time opt-in

A human runs this in an interactive terminal:

```bash
ags retrospective enable [--store-root <abs>] [--source-root <abs>]...
  [--agent-record-root <abs>]... [--no-agent-records]
```

When no agent-record root is supplied, `~/.paseo/agents` is proposed only when a presence check
finds a real directory. `--no-agent-records` opts out. The prompt discloses agent-record roots
separately from transcript roots, and records only the roots that the human approved.

- An interactive terminal is required. Without one the command refuses with `TTY_REQUIRED` and
  writes nothing.
- It prints fixed consent text plus the store root and the exact source roots that will be read on
  stderr, and accepts only the exact word `yes`. Anything else refuses with `CONSENT_DECLINED` and
  writes nothing.
- Default store root: `~/ags/diagnostics`. Default source roots: whichever exist among
  `~/.omp/agent/sessions` and `~/.codex/sessions`.
- `--source-root` is repeatable, must be absolute and must exist, and replaces the defaults. If no
  source root is left, the command refuses with `NO_SOURCE_ROOTS`. A path that is, contains, or sits
  inside an unsupported provider store — including through a symlink alias — is refused with
  `SOURCE_ROOT_UNSUPPORTED_STORE` before anything is printed or written. A source or store path that
  cannot be resolved — permission denied on a component, a symlink loop, a non-directory component, a
  dangling link, or an I/O error — refuses with `SOURCE_ROOT_CANONICALIZATION_FAILED` instead of
  falling back to a lexical path.
- If `~/.claude/projects` or `~/.gemini/tmp` exists, the prompt lists it in a separate disclosure
  section: presence only, never enumerated, read, parsed, or added to the consent record. It is not
  evidence that the provider is running, and a relocated store (for example a custom
  `CLAUDE_CONFIG_DIR`) is not detected. A discovered default root that resolves into one of those
  folders (for example a symlinked `~/.omp`) is refused with `SOURCE_ROOT_UNSUPPORTED_STORE` too.
  That refusal canonicalizes the candidate root and store paths for the alias check — path metadata
  only; it reads no transcript content and enumerates nothing.
- The prompt names only the roots recorded in the consent file; nothing outside them is scanned.
- stdout is exactly `{"schemaVersion":1,"enabled":true}`.

**An agent can never enable this.** There is no tool, no flag and no non-interactive route, so a
model cannot turn collection on for itself.

`ags retrospective disable` needs no terminal and prints
`{"schemaVersion":1,"enabled":false,"removed":<boolean>}`.

`ags retrospective status` prints `{"schemaVersion":1,"state":"enabled"}` with `storeRoot`
and `allowedSourceRoots` when enabled, or `{"schemaVersion":1,"state":"disabled"}` with an optional
`reason` otherwise (forwarded as `consent-status` in the underlying package). A missing record is a normal `disabled`.

The record is `retrospective-consent.json`: POSIX
`$XDG_CONFIG_HOME/agent-skills-standard/retrospective-consent.json` when `XDG_CONFIG_HOME` is set
and absolute, else `~/.config/agent-skills-standard/retrospective-consent.json`; on Windows
`%APPDATA%\agent-skills-standard\retrospective-consent.json`.

Consent text is version `5`. Version 5 permits optional Paseo agent-record roots and records four
agent fields only (`id`, `provider`, `persistence.sessionId`, and
`labels["paseo.parent-agent-id"]`). Existing version 1–4 records are disabled with reason `version`;
the human must run `ags retrospective enable` again. Consent is not upgraded automatically.
### The nudge

`audit_session_compliance` and `get_session_cost` append one fixed paragraph only when all three
hold: consent is enabled, the transport is stdio, and at least 20 substantive tool calls happened
since the last prepare. "Substantive" means every recorded tool call except `get_session_cost`
itself, so repeated cost reporting cannot manufacture new work.

The paragraph is the same every time. It tells workers that hold an assignment packet to ignore it,
and tells the orchestrator to call `prepare_retrospective`, then report the coverage, the counts and
the three file paths (`summary.md`, `ledger.json`, `report.html`) to the user. When the nudge is empty, tool output is byte-identical to the
output without this feature.

### The MCP tools

| Tool | Arguments | Call it as |
| --- | --- | --- |
| `prepare_retrospective` | `title` (optional string, max 200 chars, displayed as "agent-supplied, unverified") | The orchestrator, or an agent with no assignment packet. A worker holding an assignment packet must not call it. Standalone direct invocation requires no prior `get_session_cost` call or active workflow. |
| `get_retrospective_status` | none | Anyone; returns consent state only, from the same fail-closed record. |
| `prepare_retrospective_index` | `since` (optional YYYY-MM-DD), `until` (optional YYYY-MM-DD), `folder` (optional string, max 120 chars) | Anyone / orchestrator; housekeeping tool to generate `<storeRoot>/index.html` across stored sessions. Does not count toward substantive nudge calls. |

All three are registered on the stdio transport only (`mcp/src/server.ts`), so they are absent from
the SSE transport and from the HTTP server (`mcp/src/http.ts` pins `transport: "sse"`).
`prepare_retrospective` finds the caller's own session file by matching the server's own recorded
tool calls (tool name and receive time) against calls in session files inside the consented source
roots, with a 250 ms tolerance. A tie, any unreadable, oversized or over-cap candidate, or a nested
worker file yields `ambiguous-session` or `child-session` — never a guess, and no recency tiebreak.
It then aggregates in one bounded streaming pass over a fixed, digest-checked prefix of each file,
builds a claim ledger of fixed-template observations, and runs a deterministic verifier that must
pass before publication. Zero model calls, zero network requests. Revoking consent mid-run stops
reads and publication.

### Explicit manifest preparation (`ags retrospective prepare`)

For a session that is already over, or for a declared multi-agent tree that native discovery cannot
bind uniquely, a human can pass a `LocalManifest` v1 file to the local CLI:

```bash
ags retrospective prepare --manifest /absolute/path/manifest.json
```

The manifest declares `main`, `checkpointId`, `cutoff`, and one node per expected actor with a
`disposition` (`local-allowed`, `restricted`, `unavailable`, `remote-not-authorized`), an optional
declared `label` (a report alias, max 24 safe characters), and for `local-allowed` nodes an absolute
`source` path. Rules, all fail-closed:

- The file must declare `provenance: "user-supplied"`. A manifest claiming `host-local` is refused:
  a provenance string never proves trusted host origin.
- Every `local-allowed` source must resolve (lexically **and** after symlink canonicalization) inside
  a consented source root. Outside paths, symlink aliases and duplicate sources are refused before
  any read.
- Every declared parent must also be declared; cycles, duplicate session keys, more than 128 nodes,
  or depth over 16 are refused.
- A `local-allowed` source that is confirmed absent stays a visible `missing` actor. Its turns,
  usage and timing remain unknown, never zero. `restricted`, `unavailable` and
  `remote-not-authorized` nodes are shown but never read.
- The effective checkpoint is a digest of the declared nodes plus an evidence-semantics revision, so
  adding, removing or relabelling a node publishes a fresh generation instead of returning an older
  one.
- `cutoff` is an evidence boundary, not report metadata: rows after it are excluded from every
  count. A file that has grown since the run therefore does not inflate the historical baseline.

The manifest is a declaration of scope, not inventory authenticated by the host. The report names
the declaration provenance and does not claim complete delegation unless every declared actor was
read.

### Result states

| State | What it tells the operator |
| --- | --- |
| `prepared` | A new generation was published; the result carries the coverage, the counts, the artifact id and the three file paths (`summary.md`, `ledger.json`, `report.html`). |
| `already-prepared` | A committed ledger already existed for this session; the result reports those published numbers instead of publishing again. |
| `disabled` | Consent is off or unreadable (fail-closed); the agent is told to ask the user to run `ags retrospective enable`. |
| `not-substantive` | The server's tracker recorded no tool calls, typically right after a restart; nothing is published. |
| `ambiguous-session` | No unique session file could be bound (a tie, or an unreadable, oversized or over-cap candidate); nothing is published, and there is no recency tiebreak. |
| `child-session` | The caller's session file belongs to a nested worker; nothing is published, because this tool is orchestrator-only. |
| `failed` | The run aborted with a stable code; nothing is published. |

A published result contains only numbers, fixed words, the artifact id and the three file paths. It
never carries transcript text, claim sentences or the report body. One honest limitation: the tool
returns file **paths**, so an agent with file-read access could open `summary.md`. That file
contains numbers and fixed sentences only: no skill names or ids, no command text, no transcript text.

### Where the files go

Everything lands in the private store under the consented store root, in a `v2` generation:
`summary.md`, `ledger.json`, `report.html` and `generation.json`. Nothing is uploaded; nothing opens
automatically.

The current v2 store accepts ledger schema versions 1 and 2 without rewriting historical
generations. Older ledgers may omit `inventory`, `permissionFriction`, and new diagnostic fields;
missing evidence is not measured, never zero. Earlier two-file generations retain their original
layout, and v1-format generations remain readable and deletable through the store API.
Genuinely malformed stored ledgers fail closed with `STORED_LEDGER_INVALID`. Every new run hashes
an evidence-semantics revision into its checkpoint, so changed counting rules publish a new
generation instead of joining an old one.

### Report layout

Each published generation in the v2 store produces **three local artifacts**:

1. `summary.md` — a concise, model-safe summary (capped at 80 lines and 8 KB). It contains no
   skill names or IDs, no command text, and no raw transcript text.
2. `ledger.json` — verified facts, claims, evidence IDs, day-model cells, and committed counts.
3. `report.html` — a self-contained HTML report generated directly by the engine (never by a
   workflow or model; no workflow calls `prepare_retrospective`). It uses inline CSS, no script,
   no external URLs, strict CSP (`default-src 'none'; style-src 'unsafe-inline'`), and escapes all
   dynamic text. Note: rendering has been checked structurally only, not visually.

#### How to read the counts

These distinctions hold across `summary.md`, `report.html` and `ledger.json`. The reports are a
presentation of the committed ledger; the ledger schema and the meaning of its fields are unchanged.

- **Files read versus worker inventory.** Header evidence coverage and tree coverage describe distinct
  evidence: observed task calls and host-agent records, or create_agent call attempts, do not prove
  successful worker creation. Delegation coverage uses declared worker inventory when known and
  labels fallback counts as estimates otherwise. Known inventory gaps remain explicit; estimates
  cannot distinguish failed spawn attempts from worker sessions outside searched directories.
- **Permission response attempts versus requests.** `permission-answers` counts recorded
  `respond_to_permission` tool-call attempts; it does not establish that the host applied a response.
  These attempt totals are separate from request-level counts.
- **Request-count basis and category selection.** With complete event capture, request totals,
  tool/program breakdowns and response categories deduplicate actor+request identities across nodes.
  The earliest valid timestamped response supplies each category; ties keep the first observed
  response. When capture is incomplete, those aggregate counts fall back to raw observations and
  may duplicate. `answeredWithoutRequest` follows the same selected basis.
- **Raw command observation rows.** Command rows always report raw per-node observation counts,
  including unmatched observations, so their units can differ from aggregate request totals.
  Unmatched observations are not unique unanswered requests.
- **Every category stays visible.** Requested `allow`, requested `deny`, `other` and `unanswered`
  remain distinct in summaries and tables. Zero means "none recorded in what was read," not "none
  occurred"; partial reads may omit events or actors, and missing data proves neither global absence
  nor successful enforcement.

#### `summary.md` structure

Summary header reports evidence coverage, tree coverage, evidence mode, root status, delegation coverage, and cutoff. Tree coverage counts observed task calls and host-agent records or create_agent call attempts; calls may fail and do not prove successful creation. Delegation coverage uses declared worker inventory when known and labels fallback counts as estimates.

The ledger distinguishes measured zero from not measured. User-role rows may include host
notifications and are not human-turn counts. Recorded decisions are agent-declared and unverified.
The `<created>` denominator is evidence-based, not confirmed process creation: task counts use
observed task-call attempts; host counts use the descendant record graph when the root matches,
otherwise observed `create_agent` call attempts.

When coverage is partial or a declared actor is unread, the next block names how many declared
actors were read and how many are missing, restricted, unavailable, remote or unlinked. Unknown
inventory never certifies completeness; fallback worker linkage is labeled as an estimate. With a
declared roster, `## Delegation` lists every actor, its declared parent, its read state, and its
turns (`unknown`, never zero, when unread).

Then fixed second-level sections:

- `## Bottom line` — observed worker count and main cost, recorded response attempts, and AGS lookups.
- `## Do next` — prioritized, actionable next steps for the operator or manager.
- `## For the maintainer` — declared inventory gaps or worker-linkage lower bounds when inventory is
  known; estimated linkage and tracker-binding limitations otherwise, if present.
- `## Limits` — fixed caveats: counts show where to look, not why; cost is an estimate from a price
  table.
`time.main` is not measured when main-session timestamps are absent, even if worker timestamps
establish tree `time.wallSeconds`. If a bounded failure-state cap sets `failureRuns.truncated`,
reported runs and longest streaks are observed lower bounds; this warning does not by itself make
file or tree coverage partial. See
[`session-retrospective-privacy.md`](./session-retrospective-privacy.md) for exact collection
boundaries.

#### `report.html` layout

The HTML report is structured for quick human review without external dependencies or scripts,
preserving strict CSP (`default-src 'none'; style-src 'unsafe-inline'`), zero `<script>` tags, zero
external URLs, and full HTML escaping:

- **Top navigation bar (`<nav class="top-nav">`)** — rendered above the header when a back-link or
  section jump pills exist:
  - *`← All sessions` back-link* — rendered when generated in store layout (`indexHref` set to
    `../../../../index.html` by `runRetrospective` and validated by `sanitizeSafeRelativeHref`,
    allowing only safe relative store paths with no scheme, query/fragment, control characters, or
    arbitrary `..` traversal). Omitted when rendered standalone without a valid `indexHref`.
  - *Section jump pills* — `#sec-*` anchor links for every rendered section with status badges/counts
    (`Roster`, `Permissions`, `Friction`, `Outcome`, `Timeline`, `Cost`, `Tool failures`, `Error stops`,
    `Lookups`, `Trend`, `Agents`, `Limits`, `Maintainer`); flagged `Roster`, `Permissions`,
    `Tool failures`, `Error stops`, and unresolved-friction pills carry alert styling. Clicking a pill
    jumps to `<details id="sec-...">` and applies a `:target` outline highlight.
- **Header and Summary Tiles** — displays folder label `{name, parent}` (taken from the session header
  `cwd`; no raw absolute path is stored or shown), branch at report time, session id, time window,
  coverage, delegation, and cutoff instant, followed by top-level summary metric tiles. A partial
  coverage warning is rendered first, immediately under `<h1>`.
- **Decisions for you** — high-level decision guidance based on verified findings.
- **Do next (ACT / WATCH cards)** — each card details:
  - *Saw*: the observed condition.
  - *Change*: recommended action with its owner (e.g. permission setup, orchestration config).
  - *Next time*: the concrete measure to watch.
  - *Unknown*: what the data cannot establish.
  These cards remain open.
- **Native `<details>` Sections with Smart Auto-Expand** — all subsequent sections are wrapped in
  native `<details class="sec" id="sec-...">` elements, each showing a headline summary number in its
  title row and wrapping data tables in responsive `.table-wrap` horizontal-scroll containers
  (`.table-wrap.nowrap-first` for date/verdict first columns). Sections backing active findings expand
  automatically (`<details open>`); secondary or clean sections stay collapsed by default:
  - *Permission requests* (`#sec-permissions`; headline: e.g. `X requests, Y requested deny, Z other,
    U unanswered`) — **expanded by default** when `requested deny > 0`, `unanswered > 0`, or the
    `guardrail-answers` improvement has `level === "act"`; collapsed otherwise. With complete event
    capture, aggregate request/tool/program totals deduplicate actor+request identities across nodes
    and use the earliest valid timestamped response (ties keep the first observed) for each category.
    Incomplete capture falls back to raw observations, which may duplicate. Command rows show raw
    per-node observation counts; unmatched observations are not unique unanswered requests. Command
    text undergoes linear-time secret redaction (2000 chars ceiling); operators are advised to check
    commands before sharing.
  - *Outcome* (`#sec-outcome`; headline: commit and file counts) — **collapsed by default**.
    Repository outcome metrics across all branches in the session window (commits, merge commits,
    reverts, files changed, insertions, deletions; branch now) read via `execFile` from the session
    folder outside source roots; or an unavailability reason (`folder-missing`, `not-a-repo`,
    `git-error`, `not-measured`).
  - *Timeline* (`#sec-timeline`; headline: e.g. `X days`) — **collapsed by default**. Per-day
    assistant turns, cost, and error stops.
  - *Cost and models* (`#sec-cost`; headline: e.g. `$X.XX est., Y models`) — **expanded by default**
    when the `cost-concentration` improvement has `level === "act"`; collapsed otherwise.
    Main-versus-workers cost breakdown (price-table estimate in dollars), and per-model rows with
    turns, input/output/cached tokens, and error stops.
  - *Tool failures* (`#sec-tools`; headline: e.g. `X of Y tool calls failed`) — **expanded by
    default** when tool failures > 0 and at least one `act`-level improvement is present; collapsed
    otherwise. Calls and error counts per tool.
  - *Error stops* (`#sec-errors`; headline: e.g. `X error stops`) — **expanded by default** when
    total error stops > 0 or the `agent-error-concentration` improvement has `level === "act"`;
    collapsed otherwise. Error stops broken down by day and model.
  - *AGS lookups* (`#sec-lookups`; headline: e.g. `X lookups, Y matched nothing`) — **expanded by
    default** when `unguarded-edits` or `lookup-misses` improvement has `level === "act"`; collapsed
    otherwise. Routing breakdown for `load_skills_for_files`, `load_skills_for_keywords`,
    `get_skill`, `get_workflow`, and `get_category_guide`; skills returned parsed from
    `<!-- skill: <category>/<id> | matched: ... -->` markers (validated against registry IDs;
    "returned" is not "followed"); lookups matching nothing, bodies returned, and bodies reused from
    context. Tracker numbers are "not measured" for replayed sessions.
  - *Compared with earlier reports for this folder* (`#sec-trend`; headline: e.g. `compared with X
    earlier reports`) — **collapsed by default**. Trend comparison table against up to three earlier
    generations for the same folder (read-only over the store, same folder only). Earlier-session
    column headers (`session <id8> ending <date>`) render as clickable relative links
    (`../../../<sessionToken>/generations/<generationId>/report.html`) when that generation's
    `report.html` exists inside the store root and passes `sanitizeSafeRelativeHref`; otherwise plain
    text headers.
  - *Agents* (`#sec-agents`; headline: e.g. `X of Y agents observed`) — **expanded by default** when
    `agent-error-concentration` or `human-intervention` improvement has `level === "act"`; collapsed
    otherwise. Table of up to 12 observed agents (plus an overflow summary row if more), kind, model,
    turns, cost, cached tokens per turn, compactions, tool errors/calls, and permission-response
    attempts.
  - *Limits* (`#sec-limits`) — **collapsed by default**. Fixed engine bounds, disclaimers, and
    pricing table notes.
  - *For the maintainer* (`#sec-maintainer`; headline: e.g. `X items`) — **collapsed by default**.
    Maintainer notices on unlinked agents (~313 of 342 unlinked in pilot data) and process-scoped
    tracker limits.
  A one-line hint notes that flagged sections expand automatically and readers can jump via the top
  bar or click any title to expand or collapse. There is no script-based "expand all".

#### `ledger.json` claims and evidence

`ledger.json` holds verified facts, claims, day-model cells (up to 50 plus named cells), and committed
counts. Every numeric claim value is backed by an evidence entry:

- Fixed-template claims: `coverage`, `error-stop-exposure`, `skill-usage`, `skill-trigger-timing`,
  `host-skill-reads`, `tool-errors`, `permission-answers`, `cost-drivers`, `routing-order`,
  `ags-lookups`, `session-outcome`, and `permission-requests`.
- Per-row evidence IDs back every value (e.g. `agg:permreq:tool:<name>:asked`, `agg:claim:<claim>:<value>`),
  which the deterministic verifier checks before publication.
- `coverage` keeps `agentsCreated`, `sessionsLinked` and `unlinkedAgents`: when inventory is known,
  worker totals derive from declared actors; otherwise they use an estimate. `permission-answers`
  retains recorded tool-call attempt counts. `permission-requests` uses deduplicated actor+request
  identities across nodes only with complete event capture, selecting the earliest valid
  timestamped response (ties first seen); incomplete capture uses raw observations that may
  duplicate. Command rows remain raw observation counts. `answeredWithoutRequest` follows the
  selected aggregate basis. The renderer changes presentation only; no claim id, field, evidence id
  or schema version changes.
- Repeat calls read this committed ledger, allowing `already-prepared` to report published numbers.

### Cross-session index (`index.html`)

To see patterns, cost concentration, and recurring problems across multiple finished sessions, the
engine provides a cross-session index command and a companion MCP tool. This is an engine command
and MCP tool, never a workflow (a workflow is non-deterministic agent text that skips the verifier).

#### CLI invocation

```bash
ags retrospective index [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--folder NAME]
```

- Requires enabled consent (uses the consented `storeRoot`). Missing consent prints the standard
  `{"schemaVersion":1,"state":"disabled",...}` JSON payload.
- On success, stdout is one JSON line:
  `{"schemaVersion":1,"state":"written","path":"...","sessions":N,"omitted":M,"unreadable":K,"since":"...","until":"..."}`.
- Invalid arguments exit `1` with `{"schemaVersion":1,"error":{"code":"<CODE>"}}` on stderr, where
  code is `INVALID_DATE`, `INVALID_RANGE`, or `INVALID_FOLDER`.
- Unknown flags exit `2`.

#### MCP tool: `prepare_retrospective_index`

Registered on stdio only (absent on SSE and HTTP), consent-gated like `prepare_retrospective`:

- Arguments: `since` (optional string, YYYY-MM-DD), `until` (optional string, YYYY-MM-DD), and
  `folder` (optional string, max 120 chars).
- Returns only fixed text:
  `Retrospective index written: <n> sessions (<m> older in range not shown), <k> unreadable, window <since> to <until>. Open: <path>`
  (or fixed disabled text, or fixed invalid-query text naming only the error code).
- It never echoes the folder value in tool returns.
- Housekeeping tool: calling it does not increment the substantive-tool-call counter for the
  retrospective nudge.

#### Date and folder filter rules

Filtering is applied when the page is built (the generated HTML contains no client-side scripts):

- Dates are UTC `YYYY-MM-DD`, inclusive, matched against the UTC day the session's report ended
  (the ledger `to` timestamp).
- Defaults: `until` defaults to today (UTC); `since` defaults to 29 days earlier (a 30-day window).
  If only `since` is supplied, `until` is today. If only `until` is supplied, `since` is 29 days
  earlier.
- The maximum allowed window is 366 days (`INVALID_RANGE` beyond that, or if `since` is after `until`).
- `folder` matches the stored ledger folder `name` or `parent/name` exactly (case-sensitive).
- At most 200 sessions are shown, newest first. If more matched, the page notes how many older
  sessions were omitted and advises narrowing the range.

#### Source, privacy and output

- **Reads only stored ledgers:** reads only existing `v2` ledgers in the consented store root (the
  same read-only enumeration used by the trend comparison). It never opens session files, runs no
  git commands, and stores no command text.
- **No new consent text required:** reads stay strictly within the already-consented store root;
  index generation reads neither session files nor the new presence-only disclosure.
- **Atomic publication:** output is written to `<storeRoot>/index.html` with owner-only permissions
  (mode 0600) via atomic write. It is replaced on every call (no incremental state). The store does
  not list it and does not count it as a generation; its size (a few KB) does count toward the
  store byte cap, because the cap measures the whole store root.
- **One row per session:** shows the generation with the latest end time (ties broken by greatest
  artifact id). A session with multiple reports displays a `+N earlier` note.
- **Unreadable reports:** ledgers that cannot be read or lack a usable end date (older formats,
  damaged, oversized > 2 MiB, missing date) are counted as `unreadable` and noted on the page;
  they are never shown as sessions.

#### Page layout

Like `report.html`, the index is self-contained HTML (inline CSS, no `<script>`, no external URLs,
strict CSP `default-src 'none'; style-src 'unsafe-inline'`, all dynamic text HTML-escaped):

1. **Header & Summary Tiles:** displays the date window and folder filter, followed by summary
   tiles over all matched sessions: *Sessions*, *Estimated cost*, *ACT items*, and *Permission
   denials*.
2. **Recurring problems table:** wrapped in a responsive `.table-wrap` container; sorts rules with
   active `ACT` sessions (`actSessions > 0`) above `WATCH only` rules (`0` ACT sessions), then by
   active ACT count, session count, and rule key. Columns show `Rule`, `Owner`, `Priority` (`ACT`
   vs muted `WATCH only` badge, with `WATCH only` rows muted), `Sessions`, and `ACT in` count
   badge, with fixed owners:
   - *Permission answers* -> permission setup
   - *Main agent carries most of the cost* -> orchestration config
   - *Edits without a file lookup* -> agent routing
   - *Lookups that matched nothing* -> agent routing
   - *Human interventions* -> orchestration config
   - *Agents ending in errors* -> provider route monitoring
   - *Delegation not observable* -> session linkage
   - *Tracker numbers not measured* -> tracker binding
3. **Pure-CSS ACT filter & Native `<details>` monthly sections:**
   - *Show ACT sessions only toggle:* a zero-JS checkbox filter (`#act-only`) immediately before the
     monthly sections hides non-ACT rows (`tr.no-act`) via `#act-only:checked ~ details.sec tr.no-act`
     without any script.
   - *Monthly `<details class="sec">` groups:* grouped by month, newest month open by default, older
     months collapsed. Each summary headline lists session count, estimated cost, and ACT count.
   - *Overflow-safe tables & badges:* wrapped in `.table-wrap`, keeping `Date`, `Outcome`, `Cost`,
     `ACT`, `WATCH`, `Denied`, and `Report` cells non-wrapping (`white-space: nowrap`) while
     `Session (agent-supplied)` (title or short id, with `+N earlier` note), `Folder` (`parent/name`
     or `name`), and `Branch` wrap cleanly inside bounded column widths. Numeric cells display
     color-coded `ACT`, `WATCH`, and `Denied` badges (`0` muted), and `Report` shows an `Open report`
     button linking via safe relative path to `report.html` (or a muted `missing` badge when absent).
4. **Hints & Range controls:** if no reports match, displays `No reports in this range.` along with
   total store sessions and the newest report date. Shows count of unreadable or omitted reports,
   and the exact CLI command (`ags retrospective index --since YYYY-MM-DD --until YYYY-MM-DD --folder NAME`)
   to narrow or widen the window.

#### Verification on real data

Tested against five finished sessions in a real store: the default window matched all five, a
narrowed window matched four, a folder filter matched the two sessions of that folder, and an empty
range showed the empty text and total store session count. Totals ($324.64 est., 26 denials, 3 ACT
items) matched the individual reports, and relative links resolved inside the store. Checked
structurally only (no scripts, no external URLs, relative links without unsafe `..` escape), not
visually rendered in a browser.
Tests: structural unit tests (`retrospective-index.spec.ts`, `retrospective-report-html.spec.ts`,
`retrospective-trend.spec.ts`, `retrospective-run.spec.ts`) pass (177 tests across 4 files),
verifying CSP, HTML escaping, relative-link sanitization, layout classes, priority sorting, pure-CSS
ACT filtering, top navigation, and smart `<details open>` rules; date logic, window edges, tie rules,
ordering, caps, escaping, and recurring counts were also mutation-checked. Visual rendering of
synthetic multi-session `index.html` and `report.html` fixtures was also inspected in headless Chrome
at 1280px desktop width (confirming clean column wrapping and zero overlap; `390px` macOS headless
Chrome screenshots cropped against macOS minimum window width).

#### Operational limits

- Shows only the latest report per session.
- Session day is the UTC day of the report end time.
- Recurring table counts sessions per rule across the window, not temporal trends.
- Turn counts include all observed workers.
- Cost is a price-table estimate.
- Unprepared sessions never appear; the index reflects only stored reports.
- Date filtering is applied at build time; changing the window requires running the command or tool
  again.
### Disabling and storage

`ags retrospective disable` turns collection off immediately and prints
`{"schemaVersion":1,"enabled":false,"removed":<boolean>}`, where `removed` reports whether a
consent record existed to delete. It needs no terminal, but a human runs it; no agent tool can.

Nothing is deleted automatically. Earlier reports remain in the store unless you delete them;
deleting the store directory removes stored reports.

Reports published before a disable are not deleted, and the first call after a server restart
makes a new report rather than editing an earlier one.

## Bounds you will hit

Retrospective collection and storage are bounded as follows:

| Limit | Value |
| --- | --- |
| Source bytes read | 33,554,432 (32 MiB) |
| Single line | 1,048,576 (1 MiB) |
| Events | 100,000 |
| Elapsed time | 30,000 ms |
| Output bytes | 4,194,304 (4 MiB) |
| Remote requests / automatic retries | 0 / 0 |
| Concurrent runs per session | 1 |
| Store size / published generations | 268,435,456 bytes / 256 |

Byte bounds count invalid and discarded input too. Exhausting a bound yields a labelled partial
result plus a continuation choice — never a silent budget increase or automatic restart. Store
caps refuse new generations; they never delete older ones to make room.

## Exit codes

When running `ags retrospective`:

| Code | Meaning |
| --- | --- |
| `0` | complete, or successful index publication; also `--help` |
| `1` | refusal or failure (absent consent, unsafe root, invalid date/range/folder on index) |
| `2` | usage error (unknown action or option, missing option value, relative `--store-root`, argument over 4096 characters, NUL byte) |

Failure output never echoes a filesystem or runtime message, a stack trace or file content — only a stable error code.

## Triggering a retrospective

- **MCP-native:** the orchestrator calls `prepare_retrospective`. No manifest, no path
  argument, no host panel. The server binds its own session file or reports why it cannot.
- **Cross-session index:** run `ags retrospective index` from a terminal or invoke `prepare_retrospective_index` via MCP over stdio to regenerate `<storeRoot>/index.html`.
- **Not part of this change:** the skill, workflow and rule text that would make an agent call
  `prepare_retrospective` on its own. That arrives after a value pilot, so today only this guide
  and the nudge point an agent at the tool.

## Maintaining review follow-through (manual)

A published generation records what happened. It never records what you decided to do about it, and
this release adds no Review, Action or Benefit field, no lookup command, no schema validator, no
`index.html` badge and no automatic freshness check. Follow-through is a **manual convention**: one
private JSONL file you maintain, outside the worktree and outside the consented store root. Nothing
in AGS writes, reads, validates or displays it.

Proposed default location (not created by anything; make it yourself, owner-only, single writer):
`~/ags/retrospective-reviews/<project>/review-register.jsonl`. One JSON object per line, scoped to one
project, append-only. Deleting or rewriting the store never touches this file, and it never overrides
a consent record, a host profile or a permission decision.

### 1. Locate the exact generation first

A review is only meaningful against a specific generation, so record the locator, not a date guess.
`prepare_retrospective` returns the three artifact paths; the same generation sits at:

```
<storeRoot>/sessions/<sessionToken>/generations/<generationId>/{summary.md,ledger.json,report.html}
```

- `sessionToken` is 32 lowercase hex characters. `generationId` is **opaque**: copy the exact
  directory name or path a tool handed you. The current generator emits a 6-digit ordinal, a
  hyphen, then 12 hex characters (for example `000001-f4d32175d64f`), but that is one observed
  shape — a register must accept any ID the store returns rather than enforce that format.
- A v2 generation also holds `generation.json` with `generationId`, `runId`, `checkpointId` and
  `publishedAt`. An older v1 generation has no `generation.json`; that absence is legacy, not damage.
- The store's own index entry adds a `fence` value. An entry whose fence differs from the session's
  current deletion fence predates the latest deletion and is **not authoritative for current use**,
  even though the historical files may still be readable.
- Engine `status` (`complete`, `partial`, `failed`) describes the run, not your review. Never copy it
  into a review field.

**Digest.** Record a SHA-256 of the exact file you read (`ledger.json`, `summary.md` or
`report.html`), plus when and how you captured it. Compute it with your usual local tooling: no AGS
command produces, validates or compares this digest. A digest captured later never retroactively
proves the reviewed bytes: if capture time or provenance is unknown, the record cannot later claim
`current` (see §4).

### 2. Record grouping: one action, separate benefit

Three record types, linked by ID. Every record carries `record_type` and a unique `record_id`, so a
benefit — not only a review — can be superseded or replayed. Never store the action description
twice.

```jsonl
{"record_type":"review","record_id":"rev-<yyyymmdd>-<slug>-1","source":{"project":"<project>","store_alias":"<alias>","session_token":"<32-hex>","generation":"<generation-id>"},"artifact":"ledger.json","digest_sha256":"<64-hex>","digest_captured":"<timestamp-or-unknown>","digest_provenance":"<who/how-or-unknown>","fence":"<observed-fence-or-unknown>","scope":"<what was inspected>","limits":"<what was not inspected>","reviewer":"<role; identity basis>","findings":["<finding>"],"evidence":["<project-relative path or alias>"],"action_refs":["act-<slug>"],"event_time":"<timestamp-or-unknown>","supersedes":null}
{"record_type":"action","record_id":"act-<slug>-1","action_id":"act-<slug>","project":"<project>","description":"<change>","action_refs":["rev-<yyyymmdd>-<slug>-1"],"affected_generations":["<alias>/<session_token>/<generation-id>"],"state":"proposed","approval":"<actor, artifact revision, scope, or unknown>","implementation_evidence":["<path@revision>"],"verification":"<criteria and result, or NOT RUN>","limits":"<unverified boundaries>","release_state":"not_required","supersedes":null}
{"record_type":"benefit","record_id":"ben-<slug>-1","action_ref":"act-<slug>","metric":"<what is measured>","scope":"<where>","comparator":"<baseline or none>","evidence":["<path@revision>"],"pricing":"<source or unavailable>","measurement_state":"unmeasured","note":"<why>","supersedes":null}
```

- Each `affected_generations` entry is `<store_alias>/<session_token>/<generation-id>`, with
  `project` in the action context, so no generation ID is used alone as cross-session identity. An
  action may also resolve its targets through `action_refs` to reviews whose `source` object carries
  the same locator.
- `action_refs` names the other side of the link: in a review it points to `action_id` values; in an
  action it points to review `record_id` values. `benefit.action_ref` points to an `action_id`.
- `action.state` is one of `proposed`, `approved`, `implemented`, `verified`, `rejected`, `reopened`.
  `verified` only ever means the recorded criteria passed; unrecorded criteria remain unverified.
- `release_state` is separate from implementation. A repository-only change may be
  `not_required`; it is never `deployed` without matching evidence.
- `measurement_state` is one of `measured`, `baseline-only`, `unmeasured`, `inconclusive`,
  `not-applicable`. Fewer cached tokens alone is a proxy, not a saving. Without a comparator,
  accepted outcomes and repair-inclusive cost evidence, record `baseline-only` or `unmeasured`;
  never write a number as a saving.
- `supersedes` may be null; when non-null, it names an existing `record_id`. Do not use `unknown`
  as a `supersedes` value because it cannot identify a predecessor. Prefer `unknown` over a plausible
  guess in descriptive fields, and leave a field out only when the record type does not apply.

### 3. Independent reviews, corrections and conflicts

- Two records with the **same** `record_id` and different content are a conflict: keep both lines and
  add a correction record naming the conflict. Do not silently edit the earlier line.
- Two **different** correction records that both `supersedes` the same prior `record_id` are
  conflicting branches. Keep both; do not pick one. Treat the affected action or benefit's current
  use as `conflict` or `unknown` until the register owner resolves it. These are derived/manual
  current-use statuses, not values in the `action.state` or `measurement_state` vocabularies.
- Two records with different `record_id` values, the same `digest_sha256` and different scope or
  reviewer are **independent reviews, not duplicates**. An identical-ID replay with identical
  content is a duplicate replay; flag it and move on.
- Corrections append: a new record with its own `record_id` and `supersedes` naming the record it
  corrects. `record_id`, source revision and declared scope — not timestamps alone — disambiguate
  them.
- Several reviews may share one `action_id`; one action may concern several generations
  (`affected_generations`). Never attach an old review to a newer generation someone else produced.

### 4. Currentness: current, stale, unavailable, unknown

Check by hand, at read time. There is no automatic staleness detection.

| Observation | What to record | What it means |
| --- | --- | --- |
| Reviewed-byte identity known (digest and capture provenance recorded), authorized source present and readable, recomputed digest matches, and the observed current fence equals the recorded fence | `current` | The review still describes the source it names. |
| Source present but the digest differs | `stale` | The historical review stands; it is not current-use authority. |
| Deletion, revocation or removal is known | `unavailable` | Historical review preserved; the source is not available for current use or access. |
| Reviewed digest has unknown capture time or provenance, or the current fence cannot be observed | `unknown` | Unknown is not `current` and not `pass`. Re-read from a readable, authorized source before acting. |
| No matching record at all | — | "No recorded review" — not proof that nobody reviewed it. |

A digest captured after the fact never retroactively proves the reviewed bytes, and neither `stale` nor
`unavailable` nor `unknown` grants access, authority or a fresh review. Where known removal is
separated from unobserved evidence, keep them distinct: an unobservable fence is `unknown`, not
`unavailable`.

### 5. Privacy, ownership and retention

- One writer: a named maintainer, on their own account. Concurrent writers, projections, validation
  and index integration are out of scope and need their own design.
- Keep the register outside both the worktree and the consented store root, mode `0600`, and never
  inside generated HTML or a published generation.
- Reference evidence by project-relative path or approved alias plus revision. A path alone is not
  proof of content or freshness. Exclude raw host paths, real session ids, command text with
  secrets, and anything the privacy guide excludes.
- Retention is an explicit maintainer decision: keep a recoverable private copy before retiring a
  worktree, and archive history rather than deleting it by default. Source deletion or privacy
  policy outranks the register — drop removed payloads.

### 6. From findings to the next task, using the existing routing rules

Act on a finding by routing bounded work, not by restating routing rules here. The canonical contract
lives in
[`common-task-complexity-routing`](../skills/common/common-task-complexity-routing/references/routing-table.md#capability-and-effort-resolution)
(capability and effort, per-slice sizing, dispatch receipt) and
[`common-subagent-driven-development`](../skills/common/common-subagent-driven-development/SKILL.md)
(placement, briefs, handoff, freeze). What the register adds is the evidence to reuse:

- **Reuse before re-reading.** When approved evidence already answers the question, do not dispatch
  another scout; size each slice on its own spread, novelty and centrality rather than inheriting a
  parent's tier.
- **Read narrow, delegate only for a named benefit.** When the main context needs exact known
  content, read those paths directly. Use one bundled eligible extraction over known paths only
  when it has a stated benefit — parallelism, context pressure, isolation; not "more thorough".
  A `scout` label is not a guarantee of cheap routing.
- **Keep required primary reads.** Independent review and security primary-source reads stay with an
  independent actor, and host/profile/permission policy still governs routing. Register entries
  never substitute for either.
- **Record the route you actually got.** Capture the requested capability hint, the observable
  provider/model/effort, the effort support (`applied`, `unsupported`, `unknown`), the eligibility
  reference and the budget availability (`unknown` when the host does not expose it). Naming a
  profile in prompt text is not configuration.
- **Bind reuse to a revision.** Reuse discovery only while the named revision or digest is
  unchanged; when the source changes or is disputed, re-read the primary evidence. Required
  independent/security review reads are never replaced by register entries.
- **Hand off the decision, not the transcript.** A phase handoff carries authority, accepted
  criteria, open risks, owned paths and the freeze state. It carries no implied approval to widen
  scope, spend, deploy or call premium.
- **Account baseline-only.** Total cost includes parent, workers, independent review, repair and
  failed attempts. Missing prices or token classes stay `unavailable`; unmeasured benefit stays
  unmeasured.

## Next steps

- Privacy, exclusions and retention: [`session-retrospective-privacy.md`](./session-retrospective-privacy.md)
- Host coverage, transport, disabling and uninstall: [`session-retrospective-hosts.md`](./session-retrospective-hosts.md)
- Operating the retrospective habit: `skills/common/common-session-retrospective/SKILL.md`
- Recording review, action and benefit against a generation:
  [Maintaining review follow-through (manual)](#maintaining-review-follow-through-manual)
