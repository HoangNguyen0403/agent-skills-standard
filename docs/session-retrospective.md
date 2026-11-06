# Session Retrospectives — First-Run Guide

Prepare a local, evidence-backed retrospective for a finished agent session, then read it
yourself and decide what to change. Default behaviour: **zero model calls, zero outbound
requests, zero automatic edits** to skills, workflows, memory or configuration.

With the `agent-skills-standard` MCP server registered over stdio and a one-time human opt-in, the
orchestrator calls `prepare_retrospective`. The server binds its own session file from its own
recorded tool calls, counts what happened, and publishes `summary.md`, `ledger.json` and
`report.html` into a private local store. No manifest is written or read.

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

> **Status: capability release boundary.** The three MCP retrospective tools
> (`prepare_retrospective`, `get_retrospective_status`, `prepare_retrospective_index`) and the
> `ags retrospective` CLI command (`enable`, `disable`, `status`, `index`) are included over stdio
> in released `agent-skills-standard-mcp` 0.8.1.
> The extended automatic completion preparation via `get_session_cost` (`completion` object with role and task counts)
> is an unreleased source capability currently in PR #295.
> Tracking entry: `CHANGELOG.md` → `[Unreleased]`.

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
```

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

The consent text is version `4` (version 2 added permission request command recording and git
activity metrics read outside source roots; version 3 added the presence-only disclosure of local
transcript folders for providers this build cannot read; version 4 discloses that source-root and
unsupported-store paths are canonicalized for alias checks, using path metadata only, with no
transcript content read by that check). An existing record with version `1`, `2` or `3` is treated as
disabled (reason `version`), requiring the user to run `ags retrospective enable` again to re-consent;
consent never expands silently. It is owner-only and read fail-closed: missing, empty, malformed,
unknown-key, relative-path, wrong-version, group/other-readable, symlink and non-regular files all
count as disabled (reasons `missing`, `invalid`, `permissive`, `symlink`, `version`).
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

Older generations written by earlier builds (two-file v2) and ledgers without the new fields are
unreadable and fail closed with `STORED_LEDGER_INVALID` (intended; a test covers it).
Earlier generations written by earlier builds (v1) stay readable and deletable via the store API,
and are never rewritten by this path.

### Report layout

Each published generation in the v2 store produces **three local artifacts**:

1. `summary.md` — a concise, model-safe summary (capped at 80 lines and 8 KB). It contains no
   skill names or IDs, no command text, and no raw transcript text.
2. `ledger.json` — verified facts, claims, evidence IDs, day-model cells, and committed counts.
3. `report.html` — a self-contained HTML report generated directly by the engine (never by a
   workflow or model; no workflow calls `prepare_retrospective`). It uses inline CSS, no script,
   no external URLs, strict CSP (`default-src 'none'; style-src 'unsafe-inline'`), and escapes all
   dynamic text. Note: rendering has been checked structurally only, not visually.

#### `summary.md` structure

The header lines of `summary.md`:

```text
Coverage: <complete|partial> | Evidence: <native session files|tracker only (no session files read)> | Root: <unverified root|n/a> | Delegation: <n/a|none created|K of N created agents read> | Cutoff: <iso>
Scope: session <first 8 characters of session id> | folder <parent/name> | <first event time> to <last event time>
```

If an optional title was passed to `prepare_retrospective`, an unverified title line follows:
`Title: <title> (agent-supplied, unverified)`.

Then fixed second-level sections:

- `## Bottom line` — summary clauses for observed agents, main cost and turns (with percentage share
  and cached token rates), permission answers (with denials), and AGS lookups by main vs. workers.
- `## Scorecards` — compact scorecard lines covering Guardrails, Delegation & cost, Tool health, AGS
  lookups, and Outcome.
- `## Do next` — prioritized, actionable next steps for the operator or manager.
- `## For the maintainer` — structural coverage gaps (e.g. unlinked child agent sessions) and
  tracker-binding limitations, if present.
- `## Limits` — fixed caveats: counts show where to look, not why; cost is an estimate from a price
  table.

#### `report.html` layout

The HTML report is structured for quick human review without external dependencies or scripts:

- **Header and Summary Tiles** — displays folder label `{name, parent}` (taken from the session header
  `cwd`; no raw absolute path is stored or shown), branch at report time, session id, time window,
  coverage, delegation, and cutoff instant, followed by top-level summary metric tiles.
- **Decisions for you** — high-level decision guidance based on verified findings.
- **Do next (ACT / WATCH cards)** — each card details:
  - *Saw*: the observed condition.
  - *Change*: recommended action with its owner (e.g. permission setup, orchestration config).
  - *Next time*: the concrete measure to watch.
  - *Unknown*: what the data cannot establish.
  These cards remain open.
- **Collapsed Native Details Sections** — all subsequent sections are wrapped in native `<details>`
  elements, collapsed by default, each showing a headline summary number in its title row:
  - *Permission requests* (headline: e.g. `X requests, Y denied, Z unanswered`) — shows up to 50
    distinct permission requests, denied first, plus tool and program tables. Command text (or
    request title) undergoes linear-time secret redaction (2000 chars ceiling); operators are advised
    to check commands before sharing.
  - *Outcome* (headline: commit and file counts) — repository outcome metrics across all branches in
    the session window (commits, merge commits, reverts, files changed, insertions, deletions;
    branch now) read via `execFile` from the session folder outside source roots; or an unavailability
    reason (`folder-missing`, `not-a-repo`, `git-error`, `not-measured`).
  - *Timeline* (headline: e.g. `X days`) — per-day assistant turns, cost, and error stops.
  - *Cost and models* (headline: e.g. `$X.XX est., Y models`) — main-versus-workers cost breakdown
    (price-table estimate in dollars), and per-model rows with turns, input/output/cached tokens, and
    error stops.
  - *Tool failures* (headline: e.g. `X of Y tool calls failed`) — calls and error counts per tool.
  - *Error stops* (headline: e.g. `X error stops`) — error stops broken down by day and model.
  - *AGS lookups* (headline: e.g. `X lookups, Y matched nothing`) — routing breakdown for
    `load_skills_for_files`, `load_skills_for_keywords`, `get_skill`, `get_workflow`, and
    `get_category_guide`; skills returned parsed from `<!-- skill: <category>/<id> | matched: ... -->`
    markers (validated against registry IDs; "returned" is not "followed"); lookups matching nothing,
    bodies returned, and bodies reused from context. Tracker numbers are "not measured" for replayed
    sessions.
  - *Compared with earlier reports for this folder* (headline: e.g. `compared with X earlier reports`) —
    trend comparison table against up to three earlier generations for the same folder (read-only
    over the store, same folder only).
  - *Agents* (headline: e.g. `X agents`) — table of observed agents, turns, cost, compactions, cache
    reads, error stops, tool calls, edit/bash/read calls, lookups, and models.
  - *Limits* — fixed engine bounds, disclaimers, and pricing table notes.
  - *For the maintainer* (headline: e.g. `X items`) — maintainer notices on unlinked agents (~313 of
    342 unlinked in pilot data) and process-scoped tracker limits.
  A one-line hint explains the collapsing. There is no script-based "expand all".

#### `ledger.json` claims and evidence

`ledger.json` holds verified facts, claims, day-model cells (up to 50 plus named cells), and committed
counts. Every numeric claim value is backed by an evidence entry:

- Fixed-template claims: `coverage`, `error-stop-exposure`, `skill-usage`, `skill-trigger-timing`,
  `host-skill-reads`, `tool-errors`, `permission-answers`, `cost-drivers`, `routing-order`,
  `ags-lookups`, `session-outcome`, and `permission-requests`.
- Per-row evidence IDs back every value (e.g. `agg:permreq:tool:<name>:asked`, `agg:claim:<claim>:<value>`),
  which the deterministic verifier checks before publication.
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

Like `report.html`, the index is self-contained HTML (inline CSS, no script, no external URLs, CSP
`default-src 'none'; style-src 'unsafe-inline'`, all dynamic text HTML-escaped):

1. **Header & Summary Tiles:** displays the date window and folder filter, followed by summary
   tiles over all matched sessions: *Sessions*, *Estimated cost*, *ACT items*, and *Permission
   denials*.
2. **Recurring problems table:** an open table showing rules that fired across the matched sessions,
   how many sessions matched, how many had an ACT-level finding, and their fixed owner:
   - *Permission answers* -> permission setup
   - *Main agent carries most of the cost* -> orchestration config
   - *Edits without a file lookup* -> agent routing
   - *Lookups that matched nothing* -> agent routing
   - *Human interventions* -> orchestration config
   - *Agents ending in errors* -> provider route monitoring
   - *Delegation not observable* -> session linkage
   - *Tracker numbers not measured* -> tracker binding
3. **Native `<details>` monthly sections:** grouped by month, newest month open by default, older
   months collapsed. Each summary headline lists session count, estimated cost, and ACT count.
   The table contains Date, Session (agent-supplied title or short id, with `+N earlier` note),
   Folder (`parent/name` or `name`), Branch, Outcome, Cost, ACT, WATCH, Denied, and a relative link
   to `report.html`.
4. **Hints & Range controls:** if no reports match, displays `No reports in this range.` along with
   total store sessions and the newest report date. Shows count of unreadable or omitted reports,
   and the exact CLI command to narrow or widen the window.

#### Verification on real data

Tested against five finished sessions in a real store: the default window matched all five, a
narrowed window matched four, a folder filter matched the two sessions of that folder, and an empty
range showed the empty text and total store session count. Totals ($324.64 est., 26 denials, 3 ACT
items) matched the individual reports, and relative links resolved inside the store. Checked
structurally only (no scripts, no external URLs, relative links without `..`), not visually rendered.
Tests: the MCP suite passes; date logic, window edges, tie rules, ordering, caps, escaping, and
recurring counts were mutation-checked.

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

## Next steps

- Privacy, exclusions and retention: [`session-retrospective-privacy.md`](./session-retrospective-privacy.md)
- Host coverage, transport, disabling and uninstall: [`session-retrospective-hosts.md`](./session-retrospective-hosts.md)
- Operating the retrospective habit: `skills/common/common-session-retrospective/SKILL.md`
