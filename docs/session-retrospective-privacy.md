# Session Retrospectives — Privacy, Storage and Retention

Read this before you run `prepare` for the first time. It states what the preparer can see,
what it must never see, what leaves your machine and what it cannot guarantee.

> **Status: source feature, not a released product.** Behaviour described here is the agreed
> contract for this repository's in-progress work. Runtime verification, including
> process-level network observation and cross-platform path checks, remains pending. See
> `CHANGELOG.md` → `[Unreleased]`.

## Processing model

| Stage | Runs where | What it touches |
| --- | --- | --- |
| Inventory | your machine | manifest metadata only (host/session IDs, parentage, disposition) |
| Collection | your machine | allowlisted structured fields from `local-allowed` sources |
| Analysis | your machine | deterministic local rules; no model, no network |
| Render | your machine | static templates and validated enums |
| Publication | your machine | private local store under the chosen root |

Default counters are fixed: **0 model calls, 0 outbound requests, 0 automatic retries, 1
concurrent run per session.** There is no scheduler, no background learner and no telemetry
upload.

## What is collected

Allowlisted structured metadata only:

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

The node inventory reads only the manifest. Paths, URLs and filesystem references found inside
transcript text are data, never instructions: they are not followed, fetched, opened or executed.
Source transcripts are read-only and are never rewritten, moved or compacted.

## Egress: local processing versus return channels

Two different risks are routinely confused. Keep them separate:

- **Local processing** — collection, analysis, rendering and publication happen on the machine
  that owns the session. Nothing is uploaded.
- **Return channel** — the *receipt* returned to a hosted agent is content too. If a report,
  excerpt, title or path is returned through an agent tool response, that is egress to a model
  provider even though no upload endpoint was called.

Therefore a hosted caller receives only the minimal receipt: schema version, opaque artifact and
run IDs, status, and the `modelCalls` / `outboundRequests` counters. No paths, titles, excerpts or
report text. There is deliberately **no MCP prepare tool and no MCP report-reading tool.**

Report content is reachable only by a human action in a terminal `paths` invocation on the owning
machine. **Host panels do not read or return report content today:** the Paseo session-data and
report-reading RPCs are disabled, and the panel only states that the capability is unavailable.
There is no toggle, environment variable or setting to enable them; enabling waits on verified host
human admission.

No automatic RPC data read, no host-side collection and no report transmission to a model occur on
any path described in this document.

**Remote clients.** If your host client runs on device A while the session lives on host B, then
any content displayed in the client is transported A←B. That transport is real transmission between
two devices, not a local-only operation. Default behaviour for a remote client is to show a receipt
and a path belonging to the owning host; content transfer requires separate authorization. Paths
resolved on the wrong machine are simply invalid — never reinterpret a remote path against the
viewing client's filesystem.

## Storage

- Default root `~/ags/diagnostics`, resolved on the machine that owns the session (not by shell
  expansion, not by the viewing client's home directory). Any absolute root can be configured
  through the host's supported configuration mechanism.
- Created owner-only from the outset: POSIX `0700` directories and `0600` files, or equivalent
  Windows ACLs. Existing roots are validated before use; a pre-existing root with group or other
  permissions is refused with `ROOT_PERMISSIVE` (also `ROOT_SYMLINK`, `ROOT_OWNER_MISMATCH`).
  Remediate with `mkdir -m 700` for a new dedicated root or `chmod 700` on an existing dedicated
  directory — never a shared checkout or a synced/cloud folder.
- Host-side root selection is user-scoped: the OMP adapter ignores project-local `<cwd>/.omp/...`
  configuration, accepts only an explicit absolute `OMP_SESSION_RETROSPECTIVE_CONFIG` override, and
  refuses a root inside the current folder or anywhere in the same Git repository (resolved through
  symlinks) — `STORE_ROOT_INSIDE_PROJECT`, or `STORE_ROOT_UNRESOLVED` when it cannot resolve. A
  cloned checkout cannot redirect report storage into its own tree.
- Unsafe traversal is refused: symlinks, junctions and reparse-point races are rejected with a
  refusal or a safe-root remediation request. Where the platform cannot enforce the protection,
  the tool refuses rather than claiming a guarantee it cannot keep.
- **Neutral names by default.** Folder labels carry no readable project or session title unless
  you explicitly enable readable labels; titles are sensitive metadata, not authority. Names are
  filesystem-safe, bounded, Windows-reserved-name aware and Unicode-sanitized. Full session and
  host IDs live in private metadata so short-ID collisions can never overwrite another session.
  No credentials in names, indexes or temporary files.
- Generation layout, newest generation last:

  ```text
  <root>/
    index.md
    <session-group>/
      <date>_<time>_<opaque-id>/
        session.json        # metadata only; never the transcript
        report.md
        proposals.md
        revisions/
  ```

- Complete generations are published atomically; writers are serialized. A cancelled or failed
  run cannot resurrect output after publication begins.
- **Diagnostics are minimized too.** CLI refusals emit a stable error code in strict JSON, never a
  filesystem path, a runtime/fs message, a stack trace or file content. `status` returns
  identifiers and status only; `paths` returns the three artifact paths and nothing else.

## Retention, cancellation and deletion

- **Retention is manual.** Nothing expires automatically. You delete; the store refuses to grow
  past its bounds instead of pruning your history.
- **Cancellation** keeps only what was already published — a clearly marked partial generation —
  and never promotes proposals. A run that is refused or fails before publication publishes
  nothing at all, so there is no artefact to inspect. Deleting a session removes its published
  generations, revisions, partials, cached exports and **all index-history generations**, so no
  older snapshot keeps listing it — the whole managed scope for that session. If the history prune
  is interrupted, deletion reports `DELETE_INDEX_HISTORY_INCOMPLETE`; re-run `delete` to finish,
  and the deletion stays authoritative in the meantime. A small opaque fence record (session token,
  timestamps, no paths, labels or excerpts) is retained by design as deletion residue.
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

`prepare` therefore requires `--ack-storage-risk` on **every** run, and refuses with
`STORAGE_RISK_NOT_ACKNOWLEDGED` without it. The acknowledgement records that you accepted an
unknown sync/backup risk; it is a decision record, not a mitigation, and it never overrides
private permissions:

- owner-only permissions and root validation still apply in full;
- unsafe roots (symlinks, junctions, reparse-point races, owner mismatch) are refused whatever
  you acknowledged;
- if private permission enforcement is unavailable on the platform, the run is refused outright
  rather than continued under the acknowledgement.

The same acknowledgement is required from adapter flows, in the adapter's own local UI on every
run: the OMP command asks in a confirmation dialog and returns `STORAGE_RISK_NOT_ACKNOWLEDGED` if
you decline. This is not only a UI convention: the core request type requires
`storageRiskAcknowledged: true`, and the library refuses the same code before any read, schema
parse, store access or claim. The Paseo panel is disabled and collects nothing.

Choosing a root you have verified as neither synced nor backed up **reduces known exposure**; it
does not prove absence. Parent-volume backups, host snapshots, provider-side version history and a
sync/backup agent running as your user are invisible to this tool, so the residual uncertainty and
the mandatory acknowledgement remain.

## What is explicitly not guaranteed

- No perfect redaction and no guarantee that arbitrary logs are secret-free.
- No secure erasure after deletion.
- No sandbox guarantee from the plugin or host: an inert viewer is a presentation choice, not an
  enforced isolation boundary. Report rendering uses plain text with raw HTML and external
  resources disabled, and transcript-supplied links stay inert, but a viewer that does not enforce
  this is disclosed rather than described as protected.
- No proof of runtime network isolation from source code alone. Egress is zero by construction at
  the call graph level (`modelCalls: 0`, `outboundRequests: 0`); an independent process-level
  observation is the evidence, and that evidence is not yet recorded for this work.
