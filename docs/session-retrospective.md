# Session Retrospectives — First-Run Guide

Prepare a local, evidence-backed retrospective for a finished agent session, then read it
yourself and decide what to change. Default behaviour: **zero model calls, zero outbound
requests, zero automatic edits** to skills, workflows, memory or configuration.

> **Status: source feature, not a released product.** Local storage, collection, deterministic
> analysis and the `ags-retrospective` CLI exist in `mcp/src/retrospective*` with the public
> `agent-skills-standard-mcp/retrospective` subpath. On macOS the fresh build (including the
> declaration emit), the MCP test suite and the CLI/tarball smoke pass locally; nothing is published
> to the registry. The optional Paseo and OMP adapter packages exist as source
> (`integrations/session-retrospective/`) and are not installed; the Paseo session-data/report-reading
> RPCs are **disabled** — that panel only explains the limitation and points to the local CLI.
> Windows/Linux, native host UI and process-level egress proof remain unverified.
> Tracking entry: `CHANGELOG.md` → `[Unreleased]`.

## What it does

1. Reads a **manifest** you supply. The manifest names the session, its checkpoint, its cutoff
   and every node in the delegation tree it may look at.
2. Collects **allowlisted structured events** from explicitly authorized local sources only.
3. Applies **deterministic local rules** to produce findings (`observed` / `candidate`),
   criteria states, and reviewable proposals. No model is involved.
4. Publishes `report.md` and `proposals.md` into a private local store and prints a **minimal
   JSON receipt** to stdout.

What it does not do: no transcript rewriting, no memory writes, no skill or routing changes,
no adoption, no upload, no "score".

## Prerequisites

- Node.js 20+ (`agent-skills-standard-mcp` targets `node20`).
- A private local root (default `~/ags/diagnostics`, created with owner-only permissions).
- A manifest describing the session you want reviewed. **You author it** — no adapter generates a
  manifest in this build; the adapters only consume one you pass explicitly.

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

## Host compatibility at a glance

| Host | Installed/known version | What works | Status |
| --- | --- | --- | --- |
| Any host, terminal | Node.js 20+ | manual `ags-retrospective prepare` after a source build or local tarball install | source build or local tarball; macOS-only verification |
| Paseo | 0.13.2 (installed here) | source package exists, but its data-collecting/report-reading RPCs are **disabled**; the panel only explains that and points to the local CLI | capability disabled; adapter not installed |
| OMP | 18.13.1 (installed here) | source adapter: `/retrospective manifest <absolute-path>` manual command only, with a per-run storage-risk confirmation | verified by the CI adapter script against pinned 18.13.1 SDK tarball; live host loading unverified |
| Everything else | — | manual CLI only, documented as unsupported for invitations | no automated invitation |

Full detail, including disabling and uninstall: [`session-retrospective-hosts.md`](./session-retrospective-hosts.md).

## Step 1 — choose and validate a root

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

## Step 2 — write or generate the manifest

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
| `provenance` | `user-supplied` (you wrote it) or `host-local` (a local adapter wrote it). The preparer never upgrades provenance. |
| `main` | The main session. Exactly one node must have `parent: null` and it must be this key. |
| `checkpointId` | Stable identity of the completion checkpoint being reviewed. Not a turn ID; turn IDs can be null or repeat. |
| `cutoff` | ISO-8601 instant; evidence after it is out of scope. Compare as UTC instants after parsing. |
| `nodes[].disposition` | `local-allowed`, `restricted`, `unavailable`, `remote-not-authorized`. |
| `nodes[].source` | `{ format: "omp" \| "codex", absolutePath }` — **required** for `local-allowed`, **must be `null`** otherwise. `absolutePath` must be absolute (max 4096 chars), and is taken from the manifest only — never from transcript text. |

A node marked `restricted`, `unavailable` or `remote-not-authorized` must carry `source: null`
and becomes an explicit gap in the report. Nothing is fetched on its behalf.

## Step 3 — prepare, with explicit consent

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
- **A CLI flag is an attestation, not authentication.** Adapters must capture a click in their
  local UI; an agent that silently supplies `--consent` is outside the contract.
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

## Step 4 — read the result yourself

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

## Step 5 — delete when done

```bash
ags-retrospective delete --root "$HOME/ags/diagnostics" --session <sessionId> --host <hostId> --confirm
```

Deletion is scoped to the validated managed store: the session's published generations,
revisions, partials and index entries. `--confirm` is required (`CONFIRMATION_REQUIRED`
otherwise), and the command prints `{"schemaVersion":1,"deleted":…,"removedArtifacts":…}`. It
does not touch your source transcripts, host data, backups, or copies another program made.

## Bounds you will hit

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
| --- | --- |
| `0` | complete, or an explicitly labelled partial publication; also `--help` |
| `1` | refusal or failure (absent consent, missing storage-risk acknowledgement, bad manifest, unsafe root, unsupported mode, artifact not found) |
| `2` | usage error (unknown command or option, option belonging to another command, missing option value, relative `--root`, more than 24 arguments, argument over 4096 characters, NUL byte) |

Failure output never echoes the manifest path, a filesystem or runtime message, a stack trace or
file content — only a stable error code.

## Triggering a retrospective

- **Manual, every host — the only supported path:** the local CLI above. Nothing in a host panel
  prepares a report for you today.
- **Paseo source package:** the session-data-collecting and report-reading RPCs are **disabled**.
  Choosing the retrospective action shows an inert panel that explains the unavailability and
  points you at the local CLI; it does not collect session data, prepare a report, or return report
  content. No environment variable or setting enables it — that waits on verified human admission
  from the host.
- **Automatic invitations are unsupported on every host.** There is no Paseo invitation package:
  the former hook variant was deleted because the released Paseo SDK cannot enumerate child
  sessions, so its checkpoint tool could never succeed.
- **OMP source adapter (manual only; verified by the CI adapter script against the pinned 18.13.1
  SDK tarball, live host loading unverified):** `/retrospective` with no argument refuses
  (`OMP-AUTO-SCOPE-UNSUPPORTED`) and `/retrospective manifest <absolute-path>` prepares the declared
  manifest after a **per-run storage-risk confirmation dialog** (declining returns
  `STORAGE_RISK_NOT_ACKNOWLEDGED`). Its printed CLI hint includes `--ack-storage-risk`. **Automatic
  invitations are unsupported** too: no verified diagnostic-role or readiness fact exists, so no
  checkpoint tool, no `session_stop` status and no invitation is registered.
- **Store root on OMP:** the root is never read from project-local `<cwd>/.omp/...` configuration.
  Only an explicit absolute `OMP_SESSION_RETROSPECTIVE_CONFIG` override is accepted, and a root
  inside the current folder **or anywhere in the same Git repository** (resolved through symlinks)
  is refused with `STORE_ROOT_INSIDE_PROJECT`; an unresolvable root is refused with
  `STORE_ROOT_UNRESOLVED`. Do not create project-local config for this.

Where a future invitation surface does exist, it must never be a modal, sound, focus change or
automatic agent turn, and subagent completion must never trigger one.

## Next steps

- Privacy, exclusions and retention: [`session-retrospective-privacy.md`](./session-retrospective-privacy.md)
- Host versions, disabling, uninstall: [`session-retrospective-hosts.md`](./session-retrospective-hosts.md)
- Future online contracts (NOT IMPLEMENTED): [`session-retrospective-online-contract.md`](./session-retrospective-online-contract.md)
- Operating the retrospective habit: `skills/common/common-session-retrospective/SKILL.md`
