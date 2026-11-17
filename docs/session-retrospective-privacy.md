# Session Retrospectives — Privacy, Storage and Retention

Read this before you enable collection for the first time. It states what the
preparer can see, what it must never see, what leaves your machine and what it cannot guarantee.

> **Status: capability release boundary.** Manual retrospective tools and CLI commands are released in
> `agent-skills-standard-mcp` 0.8.1 over local stdio. Extended automatic preparation via `get_session_cost`
> completion readiness is unreleased source in PR #295. See `CHANGELOG.md` → `[Unreleased]`.

The consent-v5, ledger-v2, diagnostic-signal and native secure-ingress package/CI changes described
below are unreleased source work, not part of MCP 0.8.1. They do not establish that consent is
enabled on any machine or that native package artifacts are available or released.

## Processing model

| Stage | Runs where | What it touches |
| --- | --- | --- |
| Collection | your machine | allowlisted structured fields from `local-allowed` sources |
| Analysis | your machine | deterministic local rules; no model, no network |
| Render | your machine | static templates, HTML escaping, inline CSS, CSP `default-src 'none'; style-src 'unsafe-inline'`, no script, no external URLs |
| Publication | your machine | private local store under the chosen root (three artifacts: `summary.md`, `ledger.json`, `report.html`, plus `generation.json`; and cross-session `<storeRoot>/index.html`) |

Default counters are fixed: **0 model calls, 0 outbound requests, 0 automatic retries, 1
concurrent run per session.** There is no scheduler, no background learner and no telemetry
upload.

## MCP-native path: what is read

The agent-skills-standard MCP server registers `prepare_retrospective` (optional `title` argument),
`get_retrospective_status` (consent state only), and `prepare_retrospective_index` (optional `since`,
`until`, `folder`) on the stdio transport alone, so they do not exist on SSE or on the HTTP server.
The path works with or without OMP or Paseo.

Cross-session index generation (`ags retrospective index` and `prepare_retrospective_index`) reads
only ledger schemas 1 and 2 in the supported current v2 store layout under the consented root. It
never opens session files, runs git commands, or includes command text. Schema-1 fields that are
absent remain not measured; stored files are never rewritten. Unsupported historical layouts,
including earlier two-file v2 generations, fail closed with `STORED_LEDGER_INVALID`.

Reading a session file is the most sensitive step in this feature, so the boundary is fixed.

The reader accepts only documented structural fields. New retrospective fields are listed explicitly:

| Field | Source shape | Why it is needed | What is kept |
| --- | --- | --- | --- |
| Session and parent-session identifiers | session header/metadata | bind files and detect child sessions | identifiers |
| Model, stop reason, tool name and tool-call id | structured event rows | group usage, failures and decisions | bounded identifiers; ids only for de-duplication |
| Server tool name for this server's own MCP calls | `write` device path | bind and count lookups | tool name only |
| Sanitized skill id | `read skill://...` URI | count host skill reads | sanitized id only |
| Permission requests | structured permission notifications | count and review requests | opaque id, tool, kind, redacted command/title and verdict; command/title only in ledger and report |
| Folder label and optional title | session header `cwd`; caller title | identify folder and report | `{name,parent}` only; title is agent-supplied and unverified |
| Git outcome counts | bounded git calls in the session folder | measure repository changes | counts only; no names, messages, hashes or content |
| User-row attribution and steering | structured user-role rows | distinguish row categories | bounded attribution bucket and boolean; user-role rows are not inferred human turns |
| Row ordering and timestamps | structured rows | failure streaks, durations and permission latency | timestamps and derived counts; missing timestamps are not zero |
| Decision record arguments | this server's own `record_decision` call, bounded input | report agent-recorded decisions | validated fields; label redacted/sanitized for the generated ledger/report only |
| Paseo agent records | optionally consented agent-record roots | link sessions to agents | only `id`, `provider`, `persistence.sessionId`, and `labels["paseo.parent-agent-id"]` |

The host normally writes original tool arguments into its session transcript before retrospective
processing. The stored label in that source transcript may therefore remain unredacted. Redaction
and sanitization apply to the generated ledger and report; they do not rewrite or sanitize source
transcripts or other host copies. The decision tool records neither approval nor authorization.

### Permission request command redaction

Permission request commands are read only from structured permission records and redacted before storage or display. Redaction is best-effort; unusual secrets can remain. Command text is shown only in the ledger and HTML report, never in the summary or tool response.

### Git outcome safety and root boundary

Git outcome metrics read repository activity from the session folder outside the listed source roots, as disclosed at consent. Safe bounded `execFile` calls collect counts only; commit messages, file names, hashes and contents are never stored or reported.

Everything else in session files remains unread: message text, reasoning, system/developer prompts, arbitrary tool arguments, tool output and raw file contents.

**What the tool returns.** `prepare_retrospective` returns fixed receipt fields and artifact paths,
never transcript text, a claim sentence, report body, decision label or agent-record path.

## Consent file (MCP-native opt-in)

The MCP-native path is opt-in, once, by the human. `ags retrospective enable` requires an
interactive terminal and prints the consent roots before accepting the exact word `yes`.
Agent-record roots, when enabled, are disclosed separately and are not inferred as authorized by
the session source roots.

Session transcripts are read only inside the recorded source roots; optional Paseo records are read
only inside the separately recorded agent-record roots. Repository activity metrics are read from
git in the session folder outside source roots as disclosed at consent. The consent text is version
`5`; existing version 1–4 records fail closed with reason `version` and require the human to enable
again. Consent version 5 does not itself enable consent on any machine.

The consent file remains owner-only and fail-closed. Missing, malformed, unknown-key, unsafe,
permissive, linked or unsupported-version records never authorize reads.

**What the tool returns.** `prepare_retrospective` returns a small fixed-text result: the state,
counts, the artifact id and the three file paths (`summary.md`, `ledger.json`, `report.html`). It never
returns transcript text, a claim sentence or a report body.

## Explicit manifest path (`ags retrospective prepare`)

A manifest is supplied by the human, not discovered by the host. It is a declaration of scope, not
authenticated inventory: `provenance` records the claim and never upgrades it.

- **Only declared local sources are opened.** Each `local-allowed` absolute path must resolve inside
  a consented source root, both lexically and after `realpath`. An outside path, a symlink alias, a
  symlink leaf, or the same source declared twice is refused before any read (`UNSAFE_SOURCE_PATH`,
  `DUPLICATE_SOURCE`). A manifest claiming `host-local` is refused
  (`UNVERIFIED_MANIFEST_PROVENANCE`).
- **No new fields are read.** Aggregation still reads only the allowlisted structural fields in the
  table above; the manifest itself contributes keys, dispositions, optional labels and absolute
  paths, not transcript content.
- **Optional labels are report aliases.** A `label` is bounded to 24 safe characters, escaped in
  HTML, and is never treated as an identity or a host-authenticated name. Without a label the report
  uses a generated alias derived from a SHA-256 prefix of the session id; raw session ids are not
  shown in the roster.
- **Missing and unread actors are gaps, not zeros.** Their turns, cost and timing stay unknown, and
  no `complete` coverage is shown while any declared actor is unread or unlinked.
- **The CLI receipt stays minimal.** stdout carries the state, coverage, counts, artifact id and
  store paths only; stderr carries a stable error code and never a filesystem message or content.
- **The historical cutoff is an evidence boundary.** Rows after it are excluded before counting, so
  a transcript that grew after a recorded run cannot change that run's historical baseline.

## Consent file (MCP-native opt-in)

The MCP-native path is opt-in, once, by the human. `ags retrospective enable` requires an
interactive terminal (otherwise it refuses `TTY_REQUIRED` and writes nothing), prints the fixed
consent text plus the store root and the exact source roots that will be read, and accepts only the
exact word `yes` (otherwise `CONSENT_DECLINED`, and nothing is written). `ags retrospective disable`
needs no terminal. `ags retrospective status` prints the state and, when enabled, the store root and
the allowed source roots.
Command detail, including the root flags, is in
[./session-retrospective.md](./session-retrospective.md).

The prompt also discloses, in a separate section, local transcript folders belonging to providers
this build has no reader for — the documented defaults `~/.claude/projects` and `~/.gemini/tmp`.
That disclosure is presence-only: one `lstat` per path, no enumeration, no file opened, nothing
parsed, and the paths are never added to the consent record. A detected folder does not mean the
provider is running, and a relocated store is not detected. Nothing inside those folders is read at
any later point.

Separately from presence detection, the overlap check canonicalizes the candidate root and each
store path (resolving symlinks, including through existing ancestors) and compares lexical and
canonical forms in both directions. That is path metadata only: it reads no transcript content, opens
no store file and enumerates nothing. It refuses a custom `--source-root` that is one of those
folders, an ancestor of one, a descendant of one, or an alias that resolves onto one, and it applies
the same check to discovered default roots, because a symlinked `~/.omp` or `~/.codex` parent could
otherwise resolve into a store that `discovery.ts` would enumerate. Refusal is
`SOURCE_ROOT_UNSUPPORTED_STORE`, before the prompt is shown, so a consented root can never make an
unsupported store readable. Resolution is fail-closed: only a genuinely absent suffix is appended
after `lstat` confirms the entry does not exist. A dangling link, an unreadable component, a symlink
loop, a non-directory component or an I/O error refuses enable with
`SOURCE_ROOT_CANONICALIZATION_FAILED` rather than falling back to a lexical path that could hide an
alias. The canonicalization is disclosed in the consent text itself.

The record lives at:

- POSIX: `$XDG_CONFIG_HOME/agent-skills-standard/retrospective-consent.json` when
  `XDG_CONFIG_HOME` is set and absolute; otherwise
  `~/.config/agent-skills-standard/retrospective-consent.json`.
- Windows: `%APPDATA%\agent-skills-standard\retrospective-consent.json`.

The roots named in that record are the boundary for session transcripts: the MCP-native path reads
session files only inside the recorded source roots and writes only under the recorded store root.
Repository activity metrics (commit and file counts) are read from git in the session's working folder,
which is outside the listed source roots, as explicitly disclosed in consent text version 2 and later.

The consent text is version `5`. Existing records at versions 1–4 are disabled with reason `version`
and require a human to run `ags retrospective enable` again. Version 5 permits optional agent-record
roots; it does not grant consent on a machine automatically.

The file is owner-only, and the reader fails closed. Each of these is a disabled state, never an
enabled state built from guessed data:

| Reason | Condition |
| --- | --- |
| `missing` | no record at the path |
| `invalid` | empty, malformed, unknown keys, a relative path, an oversized or non-regular file |
| `permissive` | group- or other-readable, owned by another user, or failing the Windows private-path check |
| `symlink` | the open refused the record because it is a symbolic link |
| `version` | a consent text version this build does not accept (including version 1, 2 and 3 records) |

Ownership, mode, size and content are checked on one open descriptor and on the bytes read from
it, and where the platform supports it the open itself refuses a symbolic link. The record
therefore fails closed rather than following a swapped entry. A missing record is a normal
disabled state, not an error.

An agent cannot enable it: there is no terminal, no flag and no tool that grants consent. Only
`ags retrospective enable` with a typed human `yes` writes the record.

## What is collected

The ledger records only measured fields: file coverage and separate delegation-tree counts; user-row
counts and bounded attribution/steering; assistant stop-reason counts; per-tool failure streaks;
durations and timed permission latencies; validated decision records; recorded usage; and declared
coverage gaps. These fields are derived from allowlisted structured rows, timestamps, tool results,
and the decision exception described above.

**Missing measurement is never zero.** Unsupported sources, absent timestamps, tracker-only runs,
older ledgers without a field, and truncated inputs remain explicitly not measured or partial.
Failure streaks are consecutive failed results of the same tool by the same agent; calls to other
tools do not break a streak, but a success of that tool does.

`time.main` is independently unmeasured when main-session timestamps are absent, even if worker
timestamps establish `time.wallSeconds`. When a bounded failure-state cap sets
`failureRuns.truncated`, reported runs and longest streaks are observed lower bounds. That signal
warning does not by itself make file or tree coverage partial.

The engine does not collect typed completion/check outcomes, retry codes, or verification result
codes. User-role message counts are not claims about human turns; rows may be host notifications.

- Thinking, private reasoning, and system or developer prompt content.
- Message bodies, raw stdout/stderr, and arbitrary tool arguments. The only argument exception is
  the bounded `record_decision` contract; permission command text is separately allowlisted and
  redacted.
- Credentials, environment dumps, and values outside the structural allowlist.

Redaction is best-effort, not a guarantee that arbitrary text is secret-free. Metadata is untrusted;
values outside known grammars are omitted or bucketed. Missing or unsupported evidence remains a
declared gap.

## Delegation-tree coverage

File coverage and tree coverage are separate. Task-agent creation counts come from observed task-call
attempts, not confirmed child creation. For host agents, creation counts use the descendant record
graph when the root matches; otherwise they use observed `create_agent` call attempts. These are
evidence counts, not proof that an agent was instantiated. Read coverage and linkage gaps remain
separate from file coverage; unlinked or unobserved agents can keep tree coverage partial even when
every read file is complete. Paseo linkage is optional and limited to consented agent-record roots
and the four fields listed above.

Paths and URLs found in transcript data are never followed, fetched, opened or executed. Source
transcripts are read-only and never rewritten, moved or compacted.

## Egress: local processing versus return channels

Two different risks are routinely confused. Keep them separate:

- **Local processing** — collection, analysis, rendering and publication happen on the machine
  that owns the session. Nothing is uploaded.
- **Return channel** — the *receipt* returned to a hosted agent is content too. If a report,
  excerpt, title or path is returned through an agent tool response, that is egress to a model
  provider even though no upload endpoint was called.

An agent that calls `prepare_retrospective` receives a small fixed-text result — the state, counts,
the artifact id and the three file paths (`summary.md`, `ledger.json`, `report.html`) — and
nothing else: no transcript text, no claim sentences, no report body. The three paths are a
deliberate, bounded piece of egress; the file contents behind them are not. `get_retrospective_status`
returns the consent state only, and `prepare_retrospective_index` returns fixed text with the path
to `<storeRoot>/index.html` (never returning report content or echoing the folder value). No MCP tool
reads a report back.

Report content is never returned by a tool response. Reaching it takes a deliberate local action:
opening one of the three returned paths — which a human does, and which an agent with file-read
access could also do. **Host panels do not read or return report content today:** the Paseo
session-data and report-reading RPCs are disabled, and the panel only states that the capability
is unavailable.
There is no toggle, environment variable or setting to enable them; enabling waits on verified host
human admission.

No automatic RPC data read, no host-side collection and no report-text transmission to a model
occur on any path described in this document.

**Remote clients.** If your host client runs on device A while the session lives on host B, then
any content displayed in the client is transported A←B. That transport is real transmission between
two devices, not a local-only operation. Default behaviour for a remote client is to show a receipt
and a path belonging to the owning host; content transfer requires separate authorization. Paths
resolved on the wrong machine are simply invalid — never reinterpret a remote path against the
viewing client's filesystem.

## Storage

- Default root `~/ags/diagnostics`, resolved on the machine that owns the session (not by shell
  expansion, not by the viewing client's home directory). Any absolute root can be configured
  through the host's supported configuration mechanism; on the MCP-native path that is
  `ags retrospective enable --store-root <abs>`.
- Created owner-only from the outset: POSIX `0700` directories and `0600` files, or equivalent
  Windows ACLs. Existing roots are validated before use; a pre-existing root with group or other
  permissions is refused with `ROOT_PERMISSIVE` (also `ROOT_SYMLINK`, `ROOT_OWNER_MISMATCH`).
  Remediate with `mkdir -m 700` for a new dedicated root or `chmod 700` on an existing dedicated
  directory — never a shared checkout or a synced/cloud folder.
- Unsafe traversal is refused: symlinks, junctions and reparse-point races are rejected with a
  refusal or a safe-root remediation request. Where the platform cannot enforce the protection,
  the tool refuses rather than claiming a guarantee it cannot keep. On Windows, a freshly created
  directory or file has its owner/ACL established and is device/inode re-checked afterwards; the
  store root uses the same path-based helper with the helper's own checks. This is substitution
  **detection**, not atomic prevention, against a process running as the same user. The
  owner-private parent directory is what excludes other users.
- **Neutral names by default.** Folder labels carry no readable project or session title unless
  you explicitly enable readable labels; titles are sensitive metadata, not authority. Names are
  filesystem-safe, bounded, Windows-reserved-name aware and Unicode-sanitized. Full session and
  host IDs live in private metadata so short-ID collisions can never overwrite another session.
  No credentials in names, indexes or temporary files.
- Generation layout, newest generation last:

  ```text
  <root>/
    index/              # committed artifact index: current pointer + generations
    sessions/
      <session-token>/
        meta.json       # metadata only; never the transcript
        generations/
          <generation-id>/
            summary.md      # v2
            ledger.json     # v2
            report.html     # v2
            generation.json # v2 layout record
    locks/  claims/  state/  fences/
  ```

- Complete generations are published atomically; writers are serialized. A cancelled or failed
  run cannot resurrect output after publication begins.
- **Diagnostics are minimized too.** Refusals emit a stable error code in strict JSON, never a
  filesystem path, a runtime/fs message, a stack trace or file content.

## Store contents (v2)

MCP-native generations use store layout `v2`. A v2 generation directory holds four files:

- `summary.md` — the concise report a human or model can open. Numbers and fixed sentences only; no
  skill names or ids, no command text, no transcript text. Its first two lines state coverage,
  evidence mode, root, and delegation counts (read session files against evidence-based creation
  counts) and the session scope.
- `ledger.json` — verified facts, claims, evidence ids, day-model cells, and committed counts.
- `report.html` — self-contained HTML report generated by the engine (never by a workflow or model;
  inline CSS, no `<script>`, no external URLs, CSP `default-src 'none'; style-src 'unsafe-inline'`,
  all dynamic text escaped). Layout features a top navigation bar (optional `← All sessions`
  relative back-link `../../../../index.html` when generated in store layout plus `#sec-*` section
  jump pills with `:target` highlight), header and tiles, "Decisions for you", ACT/WATCH cards under
  "Do next", and native `<details>` sections with overflow-safe `.table-wrap` tables, smart
  `<details open>` defaults for flagged sections (`Permission requests`, `Cost and models`,
  `Tool failures`, `Error stops`, `AGS lookups`, `Agents`; `Outcome`, `Timeline`, `Trend`, `Limits`,
  and `For the maintainer` collapsed by default), and clickable relative links on `Compared with
  earlier reports` column headers when resolvable inside the store root (sanitized to reject scheme
  injection, control characters, and unsafe `..` traversal). Checked structurally via unit tests
  and inspected in headless Chrome at 1280px desktop width on synthetic fixtures.
- `generation.json` — the layout and serialization record written only for a v2 generation.

#### Cross-session index artifact (`index.html`)

When generated via `ags retrospective index` or `prepare_retrospective_index`, `<storeRoot>/index.html`
is written directly into the store root:

- **Owner-only atomic write:** created mode `0600` via atomic write; replaced in full on every run
  (no incremental state).
- **Not a generation:** the store does not count it as a generation and does not list it in
  generation listings; its size does count toward the store byte cap, because the cap measures the
  whole store root.
- **Content & privacy:** reads only ledger schemas 1 and 2 in the supported current v2 store layout. Self-contained HTML with inline CSS, zero
  `<script>`, zero external URLs, strict CSP (`default-src 'none'; style-src 'unsafe-inline'`), and
  full HTML escaping. Contains folder `parent/name`, branch (from stored git outcome), agent-supplied
  title (unverified; escaped), outcome text, cost estimate, turns (all observed agents), `ACT` /
  `WATCH` / `Denied` badges, `ACT` vs `WATCH only` priority badges in `Recurring problems`, a
  pure-CSS `Show ACT sessions only` filter toggle, and `Open report` relative links to each
  session's `report.html` inside the store root (inside `.table-wrap` overflow-safe tables with
  non-wrapping date/money/count/action cells). It contains **no command text**. Checked structurally
  via unit tests and inspected in headless Chrome at 1280px desktop width on synthetic fixtures.

The current store layout accepts ledger schema versions 1 and 2. Schema-1 ledgers remain readable;
fields they lack are shown as not measured, never zero, and stored files are never rewritten.
Unsupported historical store layouts (including earlier two-file v2 generations) fail closed with
`STORED_LEDGER_INVALID`.

## Retention, cancellation and deletion
- **Retention is manual.** Nothing expires automatically. You delete; the store refuses to grow
  past its bounds instead of pruning your history.
- **Cancellation** keeps only what was already published — a clearly marked partial generation.
  A run that is refused or fails before publication publishes nothing at all, so there is no
  artefact to inspect. Deleting a session removes its published generations — v1 and v2 alike —
  and **all index-history generations**, so no older snapshot keeps listing it. A small opaque fence
  record (session token, timestamps, no paths, labels or excerpts) is retained by design as
  deletion residue.
- **Deletion scope is limited to the managed store.** Filesystem-level backups, host snapshots,
  sync-provider version history and copies you made elsewhere are outside it. The tool cannot
  perform secure erasure: deletion removes files, it does not guarantee that bytes are
  unrecoverable from disk, SSD wear-levelling, snapshots or backups.
- Store caps are 268,435,456 bytes and 256 published generations. Hitting a cap refuses a new
  generation; it never deletes an older one to make room.

## Sync folders, backups and acknowledgement

A private ACL does not stop a sync client. If the root (or any parent) is synced to a cloud
provider or included in backups, that provider receives copies of report content. Detection of
these setups is best-effort at most — there is **no promise of reliable sync-folder detection**.

The one-time consent record stores `storageRiskAcknowledged: true`, so running
`ags retrospective enable` is the acknowledgement. It records that you accepted an unknown
sync/backup risk; it is a decision record, not a mitigation, and it never overrides private
permissions:

- owner-only permissions and root validation still apply in full;
- unsafe roots (symlinks, junctions, reparse-point races, owner mismatch) are refused whatever
  you acknowledged;
- if private permission enforcement is unavailable on the platform, the run is refused outright
  rather than continued under the acknowledgement.

Choosing a root you have verified as neither synced nor backed up **reduces known exposure**; it
does not prove absence. Parent-volume backups, host snapshots, provider-side version history and a
sync/backup agent running as your user are invisible to this tool, so the residual uncertainty and
the mandatory acknowledgement remain.

## What is explicitly not guaranteed

- No perfect redaction and no guarantee that arbitrary logs are secret-free.
- No secure erasure after deletion.
- No sandbox guarantee: report rendering uses plain text with raw HTML and external resources
  disabled, and transcript-supplied links stay inert, but any external viewer that does not enforce
  this is disclosed rather than described as protected.
- No proof of runtime network isolation from source code alone. Egress is zero by construction at
  the call graph level (`modelCalls: 0`, `outboundRequests: 0`); an independent process-level
  observation is the evidence, and that evidence is not yet recorded for this work.
- No atomic same-user path-swap prevention on Windows. ACL establishment is path-based; freshly
  created children are device/inode re-checked after the helper call, while the store root relies
  on the helper's own checks. These detect but do not atomically prevent a process running as the
  same user from replacing an entry inside an owner-private parent. Hostile same-user code is
  outside this protection boundary; other users remain excluded by the private root and parent
  ACLs.
