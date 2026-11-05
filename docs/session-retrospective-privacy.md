# Session Retrospectives — Privacy, Storage and Retention

Read this before you enable collection for the first time. It states what the
preparer can see, what it must never see, what leaves your machine and what it cannot guarantee.

> **Status: source feature, not a released product.** Behaviour described here is the agreed
> contract for this repository's in-progress work. Runtime verification, including
> process-level network observation and cross-platform path checks, remains pending. See
> `CHANGELOG.md` → `[Unreleased]`.

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
**ONLY already-stored v2 ledgers** in the consented store root. It never opens session files, runs
no git commands, and contains NO command text. No new consent text is needed (nothing is read outside
the already-consented store root).

Reading a session file is the most sensitive step in this feature, so the boundary is fixed.

The agreed boundary approves allowlisted structural fields for session files, plus git outcome
metrics and permission requests:

| Field | Source shape | Why it is needed | What is kept |
| --- | --- | --- | --- |
| Session id and parent session id | the `session` row's `id` and `parentSession`, or the `session_meta` payload's `id` | binds this file to a session and recognises a nested worker file | the identifiers, used for binding and child detection |
| Model identifier | `message.model`, falling back to `row.model` | groups turns, cost and error stops by model | the bounded identifier |
| Assistant stop reason | `message.stopReason` | counts error stops (the `error` value) in the per-day, per-model cells | the bounded identifier and its counts |
| Tool name and tool-call id | the `toolCall` / `tool_use` part's `name` and `id`, and the matching `toolResult` row's `toolName`, `toolCallId` and failure flag | counts tool calls and failed calls without reading arguments, and feeds the `create_agent` / `task` agent counts | the tool name and per-tool counts; ids are tracked only to de-duplicate |
| Server tool name for `write` calls to `xd://mcp__agent_skills_standard_<tool>` | the device path argument of this server's own tool calls | binds the session file to this server and counts skill lookups | the tool name only |
| Sanitized skill id for `read` calls to `skill://...` | the URI argument | counts host skill reads on the OMP path | the sanitized skill id only, not checked against the registry |
| Permission requests | `<permission-request>` JSON inside `permission-required` notification rows (orchestrator user rows only) | reviews tools and commands agents asked permission to run | opaque request id, tool name, kind, command text (or request title) after linear-time secret redaction (2000 chars ceiling), joined to `respond_to_permission` verdict |
| Folder label | `cwd` in session header | identifies working directory without raw paths | `{name, parent}` folder label only; raw path is never stored or shown |
| Optional title | optional `title` argument on `prepare_retrospective` | operator display | sanitized string up to 200 chars, displayed as "agent-supplied, unverified" |
| Git outcome counts | git in session working folder | measures repository changes | commit and diff counts across all branches in window (commits, merge commits, reverts, files changed, insertions, deletions; branch now) |

### Permission request command redaction

Permission request command text is read from `<permission-request>` JSON records in orchestrator
`permission-required` notification messages. For `bash` calls this is the command; for other tools
it is the request title (e.g. `Allow tool: write Path: xd://mcp__...`). Before storage or display,
command text undergoes pure, linear-time, best-effort secret redaction:

1. Input beyond 4,000 characters is cut first. Control characters (except `\n` and `\t`) are
   replaced with a space.
2. Environment variable assignments where the variable name contains `KEY`, `TOKEN`, `SECRET`,
   `PASSWORD`, `PASSWD`, `CREDENTIAL`, `AUTH`, `COOKIE`, or `SESSION` become `NAME=[redacted]`.
3. Sensitive flags (`--password`, `--passwd`, `--token`, `--secret`, `--api-key`, `--apikey`,
   `--auth`, `--credentials`) have their values replaced with `[redacted]`.
4. Sensitive HTTP headers (`Authorization`, `Cookie`, etc.) and `Bearer` tokens become `[redacted]`.
5. URL userinfo (`scheme://user:pass@host`) becomes `scheme://[redacted]@host`.
6. Known secret token shapes (`sk-`, GitHub tokens `gh[pousr]_` and `github_pat_`, AWS key IDs
   `AKIA...`, Slack tokens `xox[abprs]-`, JWTs `eyJ...`) are replaced with `[redacted]`.
7. Any other run of 40+ characters from `[A-Za-z0-9+_=-]` with a digit and either an uppercase letter
   or pure hex is redacted (slash-separated paths and lowercase identifiers are kept so the command
   remains reviewable).
8. The sanitized text is capped at 2,000 characters (truncated with `…[truncated]`).

**Display boundary:** Command text appears **ONLY** in `ledger.json` and `report.html` (the report
displays up to 50 distinct requests, denied first, plus tool and program tables). `summary.md` shows
only counts, tool names, and the derived program word (first word after wrappers like `rtk proxy`
and `env`). Because redaction is best-effort, an unusual secret format can be missed; the report
advises operators to check commands before sharing.

### Git outcome safety and root boundary

Git outcome metrics read repository activity from the session's working folder. **NOTE: this reads
outside the listed source roots**, which is explicitly disclosed in the version 2 and 3 consent text.

The engine enforces strict execution boundaries:

- **`execFile` only** — git is invoked directly via `child_process.execFile`; no shell is ever spawned.
- **Restricted arguments** — each git invocation prepends:
  `-c core.fsmonitor=false -c core.hooksPath=<null device> -c core.pager=cat -c diff.external= -c core.untrackedCache=false -C <realpath>`.
- **Scrubbed environment** — passes only `GIT_TERMINAL_PROMPT=0`, `GIT_OPTIONAL_LOCKS=0`,
  `GIT_CONFIG_NOSYSTEM=1`, `GIT_CONFIG_GLOBAL=<null device>`, `LC_ALL=C`, plus `PATH` and (on
  Windows) `SystemRoot`.
- **Only safe subcommands** — only `rev-parse`, `symbolic-ref`, and `log` ever run.
- **POSIX ownership check** — on POSIX systems, the real folder owner UID must match the running
  process UID; a mismatch returns `git-error`.
- **Resource limits** — execution has a 5,000 ms timeout and a 1 MiB (`1048576` bytes) output cap.
- **Zero content storage** — commit subjects, commit messages, file names, file contents, and commit
  hashes are **never** stored or reported. Commits are counted across all branches in the session
  window; the reported branch is the branch at report time.
- **Fail-closed unreachability** — when git metrics cannot be gathered, the reason is reported as
  `folder-missing`, `not-a-repo`, `git-error`, or `not-measured`.

Everything else in session files remains unread: message text, reasoning, unapproved tool arguments,
tool output, and raw file contents are never read or retained.

**What the tool returns.** `prepare_retrospective` returns a small fixed-text result: the state,
counts, the artifact id and the three file paths (`summary.md`, `ledger.json`, `report.html`). It never
returns transcript text, a claim sentence or a report body.

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

The consent text is version `4` (version 4 discloses canonicalization of source and store paths for
alias checks, path metadata only). An existing record with version `1`, `2` or `3` is treated as
disabled (reason `version`), requiring the user to run `ags retrospective enable` again to re-consent.

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

The session reader is bounded by the allowlisted structural fields listed above plus event identity,
timestamps and recorded usage numbers:

- stable event and message identifiers, timestamps, event kinds;
- launch settings: provider, model, tool identifiers;
- typed outcomes: `claimed-complete`, `passed`, `failed`, `denied`, `canceled`, `unknown`;
- permission decisions, error classes, retry and verification result codes;
- recorded usage counters when the host recorded them (otherwise `null` — missing telemetry is
  unknown, never inferred from model name or elapsed time);
- coverage facts: node disposition, coverage level, truncation, gaps.

## What is excluded at source

- Thinking, private reasoning, and system or developer prompt content.
- All free-form tool arguments, commands, raw stdout/stderr, and full message text.
- Credentials, environment dumps, and anything the source policy cannot classify.

Non-negotiable consequences:

- **Redaction is imperfect.** Tool output, quoted text and message bodies routinely contain
  excluded material, and roles alone do not prove safety. The preparer omits unclassifiable
  fields and discloses the resulting coverage loss — it does not promise a secret-free output.
- **Metadata values are themselves untrusted.** Only values matching known identifier grammars
  are kept; uncertain values are omitted rather than propagated.
- **A "full observable transcript" claim never includes private reasoning** or historical system
  prompts that the source did not retain.

## Coverage of the delegation tree

The coverage *objective* is the whole main conversation plus every proven descendant, across
repositories, workspaces and accounts. The *result* is frequently narrower:

| Coverage | Meaning |
| --- | --- |
| `structured-events` | allowlisted events available for the requested range |
| `partial` | available, but truncated, compacted or cut off by a declared bound |
| `summary-only` | only a handoff summary survives; no events to re-derive |
| `restricted` | exists but is not authorized for local reading |
| `unavailable` | not present on this machine |

`restricted` and `remote-not-authorized` nodes produce placeholders and gaps. An inaccessible
branch is **never** reported as fully enumerated, and a summary inherits its source's
restrictions — summarization is not declassification.

Paths, URLs and filesystem references found inside transcript text are data, never instructions:
they are not followed, fetched, opened or executed. Source transcripts are read-only and are never
rewritten, moved or compacted.

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
  evidence mode, root, delegation (how many created agents have a read session file) and the
  session scope.
- `ledger.json` — verified facts, claims, evidence ids, day-model cells, and committed counts.
- `report.html` — self-contained HTML report generated by the engine (never by a workflow or model;
  inline CSS, no script, no external URLs, CSP `default-src 'none'; style-src 'unsafe-inline'`, all
  dynamic text escaped). Layout features header and tiles, "Decisions for you", ACT/WATCH cards
  under "Do next", and native `<details>` collapsed sections with headline numbers. Checked
  structurally, not visually.
- `generation.json` — the layout and serialization record written only for a v2 generation.

#### Cross-session index artifact (`index.html`)

When generated via `ags retrospective index` or `prepare_retrospective_index`, `<storeRoot>/index.html`
is written directly into the store root:

- **Owner-only atomic write:** created mode `0600` via atomic write; replaced in full on every run
  (no incremental state).
- **Not a generation:** the store does not count it as a generation and does not list it in
  generation listings; its size does count toward the store byte cap, because the cap measures the
  whole store root.
- **Content & privacy:** reads only stored v2 ledgers. Contains folder `parent/name`, branch (from
  stored git outcome), agent-supplied title (unverified; escaped), outcome text, cost estimate, turns
  (all observed agents), ACT/WATCH counts, permission denials, and relative links to each session's
  `report.html`. It contains **no command text**.

Older generations written by earlier builds (two-file v2) and ledgers without the new fields are
unreadable and fail closed with `STORED_LEDGER_INVALID` (intended; a test covers it).

Earlier v1 generations keep their own four artifacts — `report.md`, `proposals.md`,
`session.json` and `receipt.json` — and stay readable and deletable via the store API; they are
never rewritten into v2. Earlier reports remain in the store unless you delete them.

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
