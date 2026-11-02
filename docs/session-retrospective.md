# Session Retrospectives — First-Run Guide

Prepare a local, evidence-backed retrospective for a finished agent session, then read it
yourself and decide what to change. Default behaviour: **zero model calls, zero outbound
requests, zero automatic edits** to skills, workflows, memory or configuration.

Two paths produce that artifact:

- **MCP-native (primary).** With the `agent-skills-standard` MCP server registered over stdio and a
  one-time human opt-in, the orchestrator calls `prepare_retrospective`. The server binds its own
  session file from its own recorded tool calls, counts what happened, and publishes `summary.md`,
  `ledger.json` and `report.html`. No manifest is written or read.
- **Manual manifest (advanced).** You author a manifest naming the session, its checkpoint, its
  cutoff and every node in the delegation tree, then run `ags-retrospective prepare` from a
  terminal. Use it for custom manifests, external manifests, or hosts without a session
  reader.

Both paths read only explicitly authorized local sources, apply deterministic local rules, and
publish into a private local store. Neither rewrites a transcript, writes memory, changes a skill
For the MCP-native path, the read boundary covers allowlisted structural fields — session and parent
session ids, model, assistant stop reason, tool name and tool-call id, the server tool name of this
server's own `write xd://mcp__agent_skills_standard_<tool>` calls, sanitized skill ids of `read skill://...`
calls, and `<permission-request>` records inside `permission-required` notification messages (opaque
request id, tool, kind, command text with linear-time best-effort secret redaction bounded at 2000
chars, joined to `respond_to_permission` verdicts). It also reads folder labels `{name, parent}` from
the session header `cwd` (no raw path stored or shown), and executes safe, bounded `execFile` git calls
in the session's working folder to read commit and file counts (which reads outside the listed source
roots; commit messages, file names, and hashes are never stored); the full table is in
[`session-retrospective-privacy.md`](./session-retrospective-privacy.md).

> **Status: unreleased source, not a released product.** The MCP-native tools
> (`prepare_retrospective`, `get_retrospective_status`, `prepare_retrospective_index`), the consent
> commands (`enable`, `disable`, `consent-status`), the cross-session index command (`index`) and the
> manual manifest CLI exist only in the source tree (`mcp/src/retrospective*`,
> `mcp/src/tools/retrospective.ts`), with the public `agent-skills-standard-mcp/retrospective`
> subpath. On macOS the fresh build (including the declaration emit), the 1037-test MCP suite
> (5 skipped) and the CLI/tarball smoke pass locally; redaction, git-argument, environment, and index
> rules were mutation-checked; nothing is published to the registry, so no registry version contains
> any of it. There are no host adapter packages; the MCP tools and the `ags-retrospective` CLI are the
> surfaces. Windows/Linux, live host loading, native host UI and process-level egress proof remain
> unverified; no CI job runs on Windows.
> Tracking entry: `CHANGELOG.md` → `[Unreleased]`.

## MCP-native retrospective (primary path)

Works with any MCP client that connects to the `agent-skills-standard` server over stdio, with or
without OMP or Paseo. Nothing runs until a human enables it once. Host coverage — which providers
have a session reader and which surface uses which transport — is in
[`session-retrospective-hosts.md`](./session-retrospective-hosts.md); this guide keeps no
provider table of its own. The `ags-retrospective` binary comes from the same source build or
locally packed tarball described under [Prerequisites](#prerequisites); nothing is published.

### One-time opt-in

A human runs this in an interactive terminal:

```bash
ags-retrospective enable [--store-root <abs>] [--source-root <abs>]...
```

- An interactive terminal is required. Without one the command refuses with `TTY_REQUIRED` and
  writes nothing.
- It prints fixed consent text plus the store root and the allowed source roots on stderr, and
  accepts only the exact word `yes`. Anything else refuses with `CONSENT_DECLINED` and writes
  nothing.
- Default store root: `~/ags/diagnostics`. Default source roots: whichever exist among
  `~/.omp/agent/sessions` and `~/.codex/sessions`.
- `--source-root` is repeatable, must be absolute and must exist, and replaces the defaults. If no
  source root is left, the command refuses with `NO_SOURCE_ROOTS`.
- stdout is exactly `{"schemaVersion":1,"enabled":true}`.

**An agent can never enable this.** There is no tool, no flag and no non-interactive route, so a
model cannot turn collection on for itself.

`ags-retrospective disable` needs no terminal and prints
`{"schemaVersion":1,"enabled":false,"removed":<boolean>}`.

`ags-retrospective consent-status` prints `{"schemaVersion":1,"state":"enabled"}` with `storeRoot`
and `allowedSourceRoots` when enabled, or `{"schemaVersion":1,"state":"disabled"}` with an optional
`reason` otherwise. A missing record is a normal `disabled`.

The record is `retrospective-consent.json`: POSIX
`$XDG_CONFIG_HOME/agent-skills-standard/retrospective-consent.json` when `XDG_CONFIG_HOME` is set
and absolute, else `~/.config/agent-skills-standard/retrospective-consent.json`; on Windows
`%APPDATA%\agent-skills-standard\retrospective-consent.json`.

The consent text is version `2` (it explicitly discloses permission request command recording and git
activity metrics read outside source roots). An existing record with version `1` is treated as disabled
(reason `version`), requiring the user to run `ags-retrospective enable` again to re-consent. It is
owner-only and read fail-closed: missing, empty, malformed, unknown-key, relative-path, wrong-version,
group/other-readable, symlink and non-regular files all count as disabled (reasons `missing`,
`invalid`, `permissive`, `symlink`, `version`).
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
| `prepare_retrospective` | `title` (optional string, max 200 chars, displayed as "agent-supplied, unverified") | The orchestrator, or an agent with no assignment packet. A worker holding an assignment packet must not call it. |
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
| `already-prepared` | A committed ledger already existed for this session and checkpoint; the result reports those published numbers instead of publishing again. |
| `disabled` | Consent is off or unreadable (fail-closed); the agent is told to ask the user to run `ags-retrospective enable`. |
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
Generations written by the manual path (`v1`) stay readable and deletable, and are never rewritten
by this path.

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
ags-retrospective index [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--folder NAME]
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
  consent text remains version 2.
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
Tests: 1,034 pass (5 skipped); date logic, window edges, tie rules, ordering, caps, escaping, and
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
### Disabling and deleting

`ags-retrospective disable` turns collection off immediately and prints
`{"schemaVersion":1,"enabled":false,"removed":<boolean>}`, where `removed` reports whether a
consent record existed to delete. It needs no terminal, but a human runs it; no agent tool can.

Nothing is deleted automatically. Remove one session's published generations with the same
managed-scope deletion as the manual path:

```bash
ags-retrospective delete --root <abs> --session <id> --host <id> --confirm
```

Reports published before a disable are not deleted, and the first call after a server restart
makes a new report rather than editing an earlier one.

## Manual manifest path (advanced)

Use this path when you need a custom manifest, or when the
session lives under a host without a session reader. The MCP-native path above comes first; this
path stays supported and unchanged.

### Prerequisites

- Node.js 20+ (`agent-skills-standard-mcp` targets `node20`).
- A private local root (default `~/ags/diagnostics`, created with owner-only permissions).
- A manifest describing the session you want reviewed. **You author it** — the CLI consumes the
  manifest you pass explicitly.

**Nothing is published yet.** The published MCP package does not contain the `ags-retrospective`
binary, and `npx agent-skills-standard-mcp` does **not** put it on `PATH` or expose
`agent-skills-standard-mcp/retrospective`. Two local routes were smoke-tested on macOS; neither is a
registry install:

```bash
# Route A — source build in a checkout (passed local smoke on macOS)
rtk pnpm install
rtk pnpm --filter agent-skills-standard-mcp build
node mcp/dist/retrospective-cli.js --help          # explicit path, no PATH install
node -e "const r = require('./mcp/dist/retrospective.js'); console.log(typeof r.prepareLocal)"

# Route B — a locally packed tarball (consumer-smoked on macOS; not published)
( cd mcp && rtk proxy pnpm pack )                  # produces agent-skills-standard-mcp-<version>.tgz
pnpm add <path-to-agent-skills-standard-mcp-<version>.tgz>
pnpm exec ags-retrospective --help                 # local install: binary is in node_modules/.bin
node -e "const r = require('agent-skills-standard-mcp/retrospective'); console.log(typeof r.prepareLocal)"
```

`pnpm add` installs into the current project's `node_modules/.bin`, not your global `PATH`, so the
binary must be invoked as `pnpm exec ags-retrospective …` (or `npx ags-retrospective …`) from that
project. The bare `ags-retrospective …` commands below are the contract form: prefix each with
`pnpm exec` (or run from a shell where the binary really is on `PATH`) when you installed via
Route B. Route A keeps the explicit `node mcp/dist/retrospective-cli.js …` form instead.

Every command below is the **agreed CLI contract** for that binary, not proof of an executable
release. Run it only in the package context you actually installed it into.

### Step 1 — choose and validate a root

Default: `~/ags/diagnostics`, resolved on the machine that owns the session. Override with
`--root <absolute path>`; a relative path is a usage error.

Pick a location you are willing to keep. The store is created owner-only (`0700` directories,
`0600` files, or equivalent Windows ACLs) and existing roots are validated before use. But
**no tool can prove a folder is not cloud-synced or backed up**, and the provider of such a
folder can copy report content off the machine. `prepare` therefore requires
`--ack-storage-risk` on every run: it records that *you* accepted that unknown sync/backup risk.

The acknowledgement is a decision record, never a mitigation:

- it does **not** relax private permissions — owner-only enforcement still applies, and unsafe
  roots (symlinks, junctions, reparse races, owner mismatch) are refused regardless;
- if private permission enforcement is unavailable on the platform, the run is refused, not
  continued under the acknowledgement.

**First run will commonly fail until the root is owner-only.** A pre-existing root with group or
other permissions is refused with `ROOT_PERMISSIVE` (related refusals: `ROOT_SYMLINK`,
`ROOT_OWNER_MISMATCH`, `PRIVATE_MODE`, `PRIVATE_OWNER_MISMATCH`, `INVALID_ROOT_PATH`). A default
`~/ags/diagnostics` that already exists as `0755` is exactly that case. Remediate one way:

```bash
# prefer a new dedicated, owner-only root
mkdir -m 700 -p "$HOME/ags/diagnostics"
# or tighten a dedicated existing directory (never a shared or synced folder)
chmod 700 "$HOME/ags/diagnostics"
```

Do **not** point the root at a shared project checkout or a synced/cloud folder to work around the
refusal; move the root instead.

Relocating the root to a location *you* have verified is not synced or backed up can reduce known
exposure. It cannot prove absence: parent-volume backups, host snapshots and a sync/backup agent
running as your user remain outside anything this tool can see. The acknowledgement therefore
stays mandatory on every `prepare`, and the residual uncertainty stays documented. See
[`session-retrospective-privacy.md`](./session-retrospective-privacy.md).

### Step 2 — write or generate the manifest

The manifest is strict: `schemaVersion: 1`, no unknown keys, at most 262,144 bytes, exactly one
root node with a `null` parent, unique `(hostId, sessionId)` keys, and `source: null` for any
node that is not `local-allowed`.

Synthetic example — fabricated identifiers and paths, no real session data:

```json
{
  "schemaVersion": 1,
  "provenance": "user-supplied",
  "main": { "hostId": "example-host", "sessionId": "synthetic-session-0001" },
  "checkpointId": "synthetic-checkpoint-0001",
  "cutoff": "2026-01-01T00:00:00Z",
  "nodes": [
    {
      "key": { "hostId": "example-host", "sessionId": "synthetic-session-0001" },
      "parent": null,
      "disposition": "local-allowed",
      "source": { "format": "omp", "absolutePath": "/tmp/synthetic/synthetic-session-0001.jsonl" }
    },
    {
      "key": { "hostId": "example-host", "sessionId": "synthetic-child-0002" },
      "parent": { "hostId": "example-host", "sessionId": "synthetic-session-0001" },
      "disposition": "restricted",
      "source": null
    }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `provenance` | `user-supplied` (you wrote it) or `host-local` (a host environment wrote it). The preparer never upgrades provenance. |
| `main` | The main session. Exactly one node must have `parent: null` and it must be this key. |
| `checkpointId` | Stable identity of the completion checkpoint being reviewed. Not a turn ID; turn IDs can be null or repeat. |
| `cutoff` | ISO-8601 instant; evidence after it is out of scope. Compare as UTC instants after parsing. |
| `nodes[].disposition` | `local-allowed`, `restricted`, `unavailable`, `remote-not-authorized`. |
| `nodes[].source` | `{ format: "omp" \| "codex", absolutePath }` — **required** for `local-allowed`, **must be `null`** otherwise. `absolutePath` must be absolute (max 4096 chars), and is taken from the manifest only — never from transcript text. |

A node marked `restricted`, `unavailable` or `remote-not-authorized` must carry `source: null`
and becomes an explicit gap in the report. Nothing is fetched on its behalf.

### Step 3 — prepare, with explicit consent

Contract form (Route A: `node mcp/dist/retrospective-cli.js prepare …`; Route B: `pnpm exec ags-retrospective prepare …`):

```bash
ags-retrospective prepare \
  --manifest ./synthetic-manifest.json \
  --consent local-only \
  --root "$HOME/ags/diagnostics" \
  --ack-storage-risk
```

- `--consent local-only` is required. It authorizes bounded local processing of the manifest's
  authorized sources and nothing else: no model calls, no remote evidence, no telemetry upload,
  no report text leaving your machine. Any other `--consent` value is refused
  (`CONSENT_MODE_REFUSED`); a `--mode` other than `local-only` returns `MODE_UNAVAILABLE` before
  any collection starts and is never mapped onto a local run.
- **A CLI flag is an attestation, not authentication.** An interactive human must supply the
  flag; an agent that silently supplies `--consent` is outside the contract.
- `--root` is optional (default above). **`--ack-storage-risk` is required on every prepare** —
  see step 1. Omitting it is refused with `STORAGE_RISK_NOT_ACKNOWLEDGED`.

stdout is exactly one JSON line — the six-key receipt, and nothing else. No paths, titles,
excerpts or report text ever appear there:

```json
{"schemaVersion":1,"artifactId":"<opaque-id>","runId":"<opaque-id>","status":"complete","modelCalls":0,"outboundRequests":0}
```

`artifactId` identifies the published report artifact; other artifacts of the same generation are
reached through `paths`. `status` is `complete` or `partial`. A `failed` status is reserved: a
failed prepare publishes nothing at all, so no receipt is printed and the exit code is `1`.
`partial` means a declared limit was reached or coverage gaps made a full pass impossible; it is
labelled, never silently reported as complete.

Refusals print one JSON line to **stderr** carrying a stable code and nothing else — no manifest
path, no filesystem or runtime message, no stack trace:

```json
{"schemaVersion":1,"error":{"code":"STORAGE_RISK_NOT_ACKNOWLEDGED"}}
```

Codes include `CONSENT_REQUIRED`, `CONSENT_MODE_REFUSED`, `MODE_UNAVAILABLE`,
`STORAGE_RISK_NOT_ACKNOWLEDGED`, `MANIFEST_INVALID`, `INVALID_NODE_KEY`, `ABORTED`,
`CONFIRMATION_REQUIRED`, `STORE_ROOT_INSIDE_PROJECT`, `STORE_ROOT_UNRESOLVED`, and store/root
refusals such as `ROOT_PERMISSIVE`, `ROOT_SYMLINK`, `ROOT_OWNER_MISMATCH`, `PRIVATE_MODE`,
`PRIVATE_OWNER_MISMATCH`, `INVALID_ROOT_PATH`, `ARTIFACT_NOT_FOUND`,
`DELETE_INDEX_HISTORY_INCOMPLETE`. Anything unrecognized is reported as `FAILED`.

Two refusals are recoverable rather than terminal:

- `DELETE_INDEX_HISTORY_INCOMPLETE` — the session data is already removed, but pruning older index
  history did not finish. Re-run `delete` to complete it; the deletion stays authoritative.
- `CLAIM_REVOKED` — the run was revoked by a deletion or cancellation. Re-run deletion or cancel
  explicitly to recover; do not retry the original run.

### Step 4 — read the result yourself

```bash
ags-retrospective status --root "$HOME/ags/diagnostics" --artifact <opaque-id>   # IDs and status only
ags-retrospective paths  --root "$HOME/ags/diagnostics" --artifact <opaque-id>   # strict JSON paths
```

`status` returns `{"schemaVersion":1,"artifactId":"…","kind":"…","status":"…"}` — identifiers and
status only, never evidence.

`paths` returns strict JSON with the three human-facing paths of the generation:

```json
{"report":"/home/you/ags/diagnostics/…/report.md","proposals":"/home/you/ags/diagnostics/…/proposals.md","session":"/home/you/ags/diagnostics/…/session.json"}
```

A member is `null` when that generation did not publish it (a budget-forced partial can omit
`proposals`/`session`); a missing report is `ARTIFACT_NOT_FOUND`. `paths` is a **human-facing**
command: it exists so *you* can open the report in a local editor. It must not be invoked
automatically through a hosted agent's tool return — that would be content egress to the model.
Nothing opens automatically, at any point.

The generation holds `report.md` (session, outcome, coverage, findings, successful practices,
metric limits) — always published, even as a minimal partial — plus `proposals.md` (one proposal
per distinct reusable root cause, or an explicit "no proposals") and `session.json` metadata
(never the transcript). A budget-forced partial may omit `proposals`/`session`; the published
report then says so. Proposals are `proposed` only.

### Step 5 — delete when done

```bash
ags-retrospective delete --root "$HOME/ags/diagnostics" --session <sessionId> --host <hostId> --confirm
```

Deletion is scoped to the validated managed store: the session's published generations,
revisions, partials and index entries. `--confirm` is required (`CONFIRMATION_REQUIRED`
otherwise), and the command prints `{"schemaVersion":1,"deleted":…,"removedArtifacts":…}`. It
does not touch your source transcripts, host data, backups, or copies another program made.

## Bounds you will hit

The manual `prepare` run is bounded as follows.

| Limit | Value |
| --- | --- |
| Source bytes read | 33,554,432 (32 MiB) |
| Single line | 1,048,576 (1 MiB) |
| Events | 100,000 |
| Nodes / tree depth | 128 / 16 |
| Elapsed time | 30,000 ms |
| Output bytes | 4,194,304 (4 MiB) |
| Local pages | 128 (page size 100, explicit continuation only) |
| Remote requests / automatic retries | 0 / 0 |
| Concurrent runs per session | 1 |
| Store size / published generations | 268,435,456 bytes / 256 |

Byte bounds count invalid and discarded input too. Exhausting a bound yields a labelled partial
result plus a continuation choice — never a silent budget increase or automatic restart. Store
caps refuse new generations; they never delete older ones to make room.

## Exit codes

| Code | Meaning |
| `0` | complete, or an explicitly labelled partial publication; successful index publication; also `--help` |
| `1` | refusal or failure (absent consent, missing storage-risk acknowledgement, bad manifest, unsafe root, unsupported mode, artifact not found, invalid date/range/folder on index) |
| `2` | usage error (unknown command or option, option belonging to another command, missing option value, relative `--root`, more than 24 arguments, argument over 4096 characters, NUL byte) |
Failure output never echoes the manifest path, a filesystem or runtime message, a stack trace or
file content — only a stable error code.

## Triggering a retrospective

- **MCP-native (primary):** the orchestrator calls `prepare_retrospective`. No manifest, no path
  argument, no host panel. The server binds its own session file or reports why it cannot.
- **Cross-session index:** run `ags-retrospective index` from a terminal or invoke `prepare_retrospective_index` via MCP over stdio to regenerate `<storeRoot>/index.html`.
- **Manual CLI (advanced), every host:** author a manifest, then run `prepare` yourself. This is
  the fallback for hosts without a session reader and for custom manifests.
- **Automatic invitations are unsupported on every host.** No host invitation package exists.
- **Not part of this change:** the skill, workflow and rule text that would make an agent call
  `prepare_retrospective` on its own. That arrives after a value pilot, so today only this guide
  and the nudge point an agent at the tool.

Where a future invitation surface does exist, it must never be a modal, sound, focus change or
automatic agent turn, and subagent completion must never trigger one.

## Next steps

- Privacy, exclusions and retention: [`session-retrospective-privacy.md`](./session-retrospective-privacy.md)
- Host coverage, transport, disabling and uninstall: [`session-retrospective-hosts.md`](./session-retrospective-hosts.md)
- Future online contracts (NOT IMPLEMENTED): [`session-retrospective-online-contract.md`](./session-retrospective-online-contract.md)
- Operating the retrospective habit: `skills/common/common-session-retrospective/SKILL.md`
