# Session Retrospective — OMP adapter

> **Status: source feature, not a released product.** This package is an optional,
> separately installable adapter under `integrations/`; it is not part of the
> published CLI/MCP surface and is not installed or enabled automatically. See
> `CHANGELOG.md` (`[Unreleased]`) for what is still unimplemented.

Owner-local session retrospectives for **OMP 18.13.1**, scoped by a
**human-authored local manifest**. The adapter contains only host integration:
parsing, privacy filters, local rules, rendering, and the private store live in
the public package `agent-skills-standard-mcp/retrospective`. No core rule is
copied here.

## Capability status

| Capability | Status |
| --- | --- |
| `/retrospective manifest <absolute-path>` | **Supported.** Prepares exactly the sessions declared in a manifest the user authored. |
| `/retrospective` (no arguments) | **Unsupported by design.** Explains the capability gap below and prepares nothing. |
| Automatic host-scope projection | **Unsupported.** OMP 18.13.1 exposes no verified descendant inventory or diagnostic-role signal through the extension context, so this adapter will not infer a tree, narrow it silently, or classify a session as eligible work. |
| Passive invitation / `session_stop` status | **Not implemented.** It needs a proven diagnostic/readiness fact the pinned host API does not provide. Registering it would persist `diagnostic: false`/`ready: true` claims this adapter cannot prove. Manual preparation is the supported route. |
| Agent-facing checkpoint tool | **Not present.** No automatic preparation path exists to authorize, so there is no agent tool. |
| Report reading in model context | **Absent.** No report or evidence tool; `ags-retrospective paths` is the human-facing locator. |

Static capability codes shown or documented for local users:
`OMP-AUTO-SCOPE-UNSUPPORTED` (automatic projection), `OMP-AUTO-ELIGIBILITY-UNSUPPORTED`
(passive checkpoint/invitation path, not implemented), `STORAGE_RISK_NOT_ACKNOWLEDGED`
(per-run confirmation declined), `STORE_ROOT_INSIDE_PROJECT` (real-path/repository
containment refusal), and `STORE_ROOT_UNRESOLVED` (containment could not be proven).

## Configuration

Example config content (the file's location is chosen by the user, never by the
project):

```json
{
  "schemaVersion": 1,
  "invitationOwner": "omp",
  "enabled": true,
  "root": "/absolute/private/store/root"
}
```

- The config file is read **only** from the explicit `OMP_SESSION_RETROSPECTIVE_CONFIG`
  environment variable, which must be an **absolute** path. A relative value is
  refused (`config-env-relative`); it is never resolved against the session cwd.
- There is **no project-local config**: `<cwd>/.omp/session-retrospective.json` is
  ignored, because a repository the user does not control must not be able to place
  private report output inside its own working tree or a synced folder. There is no
  ancestor walk and no home-directory fallback. The pinned 18.13.1
  `ExtensionContext` exposes no agent directory, and the archive does not include a
  declaration for `getAgentDir`, so no user-level default is assumed.
- `invitationOwner`: `"omp"` or `"paseo"`, the shared ownership field for passive
  invitations. Because this adapter currently implements no passive invitation, the
  field only records ownership for a future supported surface; manual commands are
  unaffected by it.
- `root`: absolute store root; required for preparation. The store root is resolved
  with `fs.realpath` (a not-yet-existing root uses its nearest existing ancestor plus
  the remaining segments), and it is refused with `STORE_ROOT_INSIDE_PROJECT` when it
  equals or lies inside the real session working directory **or** inside the nearest
  ancestor containing a `.git` entry (directory or file, detected with `lstat`; no git
  spawn). This is symlink-proof and repository-wide, so a session started in a
  repository subdirectory cannot point the store at another path in the same worktree.
  If real paths cannot be resolved, preparation is refused with
  `STORE_ROOT_UNRESOLVED`.
- `enabled`: defaults to `true`.
- Unknown keys, a relative root, an unsupported owner, invalid UTF-8, a non-regular
  file, or a file over 65,536 bytes make the config **invalid**. Invalid config keeps
  the adapter inert and shows a bounded reason code (`config-root`,
  `config-too-large`, `config-not-regular`, `config-not-utf8`, `config-unknown-key`,
  `config-owner`, `config-enabled`, `config-version`, `config-malformed`,
  `config-unreadable`, `config-env-relative`). A missing env value or file keeps
  manual-only defaults.

The reader rejects symlinks and non-regular files and bounds allocation before any
JSON parse; there is no post-read truncation. The adapter never writes config or
global agent settings.

## Storage-risk acknowledgement

Every preparation run asks a local confirmation before `prepareLocal`. The message
states that the store root may be covered by sync, backup, or snapshot tools this
adapter cannot detect, that acknowledging applies to this run only, and that it
does not override owner-only permission checks on the store or its files. The
confirmation is the pinned `ExtensionCommandContext` UI API
`ctx.ui.confirm(title, message): Promise<boolean>`.

A declined or dismissed confirmation notifies `STORAGE_RISK_NOT_ACKNOWLEDGED`,
prepares nothing, and returns that code. Nothing is remembered or persisted, so the
next run asks again. The accepted per-run acknowledgement is also carried as
`storageRiskAcknowledged: true` in the core `PrepareRequest`, and that field is set
only after the confirmation returned true. The headless path remains unchanged: it
prints the manual instruction, which includes the CLI's required
`--ack-storage-risk` flag, and prepares nothing.

## Scope and coverage honesty

- Preparation uses the manifest the user supplies, verbatim: its main session,
  cutoff, checkpoint id, and declared nodes. The adapter does not add nodes, verify
  that the manifest describes an open session, or reinterpret dispositions.
- Sessions **not** declared in the manifest are not included. The command reports
  the declared counts only — for example
  `Preparing the 3 session(s) declared in your manifest (2 local-allowed, 1 explicit gaps).`
  Titles, paths, and event content never appear in that notice.
- Unsupported or unauthorized sessions stay explicit gaps only when the manifest
  declares them as such (`restricted`, `unavailable`, `remote-not-authorized` with
  `source: null`). The adapter never fabricates a gap node or a complete tree.
- Without automatic host projection, a user-authored manifest can still declare only
  the main session. The adapter does not silently choose that scope; completeness
  remains the manifest author's responsibility.

## Command reference

```text
/retrospective                          # explain the capability gap; prepare nothing
/retrospective manifest <absolute-path> # prepare the user-authored manifest
```

- `ctx.hasUI === false` (headless/print): the command notifies the neutral manual
  instruction — including the human-only `ags-retrospective prepare` form — and
  prepares nothing. No analysis and no text go to model context.
- Subagent sessions: main-session only; the command explains that.
- Relative manifest paths are refused; no cwd-relative resolution.
- All user-visible errors are bounded diagnostic codes (for example `STORE_FULL`);
  raw error messages and paths are never printed.

## Host API evidence (OMP 18.13.1)

Implemented against the installed host's documented extension surface only:

- `pi.registerCommand(name, { description, handler })`, `pi.setLabel(label)` —
  `omp://extensions.md`, `omp://skills/authoring-extensions.md`.
- `ctx.hasUI`, `ctx.agent.kind`, `ctx.cwd`, `ctx.ui.notify`, `ctx.ui.setStatus`,
  `ctx.ui.confirm(title, message): Promise<boolean>` — `omp://extensions.md`.
  `confirm` was verified by reading the pinned declaration in
  `oh-my-pi-pi-coding-agent-18.13.1.tgz`, `package/dist/types/extensibility/extensions/types.d.ts:169`.

Deliberately unused because not verified on 18.13.1: cross-session child
enumeration, session trees, diagnostic/readiness facts, provider/model invocation,
session mutation, `session_stop` eligibility, and `session_shutdown` work.

## Install (local, opt-in)

The package is not published and has no global installation path. For a local
trial, in this directory:

```bash
# 1. Pinned core build produced by the core integration task (tarball, not a source path).
pnpm add ../../../mcp/dist/agent-skills-standard-mcp-0.8.0.tgz

# 2. Host type package for compile-time checking, exact installed version.
pnpm add -D @oh-my-pi/pi-coding-agent@18.13.1

# 3. Load this extension explicitly; nothing is copied into ~/.omp.
omp --extension ./index.ts
```

Do not add this path to `~/.omp/agent/config.yaml` unless you intend a persistent,
user-wide opt-in; that is a human decision, not part of this package.

## Verification status

Source is frozen for review; these were **not executed** during authoring because
dependency installation, builds, tests, and host runtime launches belong to the
orchestrator:

```bash
cd integrations/session-retrospective/omp
pnpm typecheck                  # -> tsc --noEmit -p tsconfig.json
pnpm test                       # -> vitest run
omp --extension ./index.ts      # synthetic-session manual smoke
```

Prerequisites: the pinned core tarball built from `mcp/` and an installable
`@oh-my-pi/pi-coding-agent@18.13.1` type package. At authoring time neither was present in this
worktree, so no typecheck, test, or live host result was claimed then — that limitation is kept as
history.

**Current evidence (macOS, scoped to the pinned SDK).** `node scripts/verify-retrospective-adapters.mjs`
— the command behind CI job `retrospective-adapters` — packs each adapter's exact pinned SDK specs
into a scratch archive, typechecks the adapter against them, and runs its suite. Against OMP
18.13.1 this adapter typechecks with 0 errors and passes 27/27 tests. That proves declared-SDK
compatibility and the fixture suite only. The package stays **unpublished**, is **not installed**
into any host, and **loading it in a live OMP host is unverified**; the manual smoke below remains
the way to check that.

## Behavioral tests authored (`test/adapter.spec.ts`)

Registration wiring (command only, no tool, no lifecycle hook); automatic-scope
refusal with its static code; headless manual instruction (including the CLI
`--ack-storage-risk` flag); relative manifest refusal; usage for unknown actions;
subagent refusal; manifest-scoped preparation with declared-scope disclosure, a
recorded per-run storage-risk confirmation, and the core request field
`storageRiskAcknowledged: true`; declined acknowledgement prepares nothing and
returns `STORAGE_RISK_NOT_ACKNOWLEDGED`; real-path containment cases on temporary
directories (symlinked alias of the session cwd refused, root elsewhere in the same
repository from a subdirectory refused with the repository-basis message, root
outside the repository accepted, not-yet-existing root under an outside parent
accepted); declared-gap counts without invented nodes; bounded failure code;
invalid-config inertness; unconfigured guidance; project-local config ignored with no
read; relative config env path refused with no read; and bounded reader cases (valid
small file, oversized file refused before parse, oversized growth after descriptor
stat, directory refused, symlink refused, invalid UTF-8 refused, missing file as
absent defaults, unknown key, relative root).

## Limitations

- No automatic tree inventory, automatic invitation, or agent checkpoint tool;
  those require verified host facts that 18.13.1 does not expose.
- A manifest is user-declared: completeness is the author's responsibility, and the
  notice reports only declared counts.
- In ACP/RPC or other headless contexts, a command that refuses or cannot show the
  required UI performs no analysis or model-visible action. An accepted interactive
  manifest command prepares a retrospective only after the per-run storage-risk
  confirmation.
- `root` must be chosen by the user; the config file is supplied only through an
  absolute `OMP_SESSION_RETROSPECTIVE_CONFIG` path, and there is no project-local or
  implicit home-directory store.
