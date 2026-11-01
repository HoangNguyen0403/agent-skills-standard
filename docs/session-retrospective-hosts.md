# Session Retrospectives — Host Integration and Limitations

The primary route needs no host integration. Two tools inside the `agent-skills-standard` MCP
server, registered on stdio only, prepare and check a retrospective from any MCP-capable host that
runs that server locally: `prepare_retrospective` (no arguments; orchestrator or unassigned agent
only) and `get_retrospective_status` (consent state only). It works with or without OMP or Paseo,
and without an adapter, an invitation package or a host version check. Both tools exist in this
repository's source; no published registry version contains them.

Host adapters are optional discovery aids layered on the same local CLI: a discoverable slash
command or panel action that hands the CLI an explicit manifest. They never gate the capability,
and everything they can reach is reachable from a terminal.

> **Status: source feature, not a released product.** The `ags-retrospective` CLI and local
> analysis build and pass their local tests and CLI/tarball smoke on macOS; nothing is published to
> the registry. The Paseo and OMP adapter packages also exist as source under
> `integrations/session-retrospective/` and are not installed; **Paseo's session-data-collecting and
> report-reading RPCs are disabled**, and its panel shows an inert unavailable explanation that
> directs you to the local CLI. The OMP adapter typechecks and its unit tests pass against pinned
> OMP 18.13.1 SDK types; loading it in a live OMP host is unverified. Version facts below come from
> installed binaries, released SDK packages and public host documentation — not from a completed
> integration run. See `CHANGELOG.md` → `[Unreleased]`.

## Transport rule

The server registers both tools in exactly one guarded block, `if (transport === "stdio")` in
`mcp/src/server.ts`. The HTTP entry point pins its transport to `"sse"`
(`mcp/src/http.ts:41`), so the retrospective tools never appear on an SSE session or on the HTTP
server, and the nudge is suppressed there as well. A local run defaults to stdio; only an explicit
`MCP_TRANSPORT=sse` or the HTTP entry point changes that.

The consequence, stated plainly: **a remote or HTTP deployment of this server cannot prepare a
retrospective.** Use a local stdio server, or use the CLI directly. The tools read session files and
publish to a private store on the machine running the server, so a remote deployment has nothing to
analyse and nowhere to publish. SSE and HTTP surfaces simply lack the tools rather than degrading
them into something weaker.

## Provider coverage

Scope: what a host's session files can contribute to the analysis and what the server can measure
about itself, checked on real session folders on this machine. This table says nothing about which
adapter surfaces exist; that is the Compatibility table below.

| Provider | Session binding | Server skill lookups | Per-session timing and host skill reads |
| --- | --- | --- | --- |
| OMP | exact, from native session files | yes | yes |
| Codex | no reader in the engine yet; tracker-only, never a wrong bind | yes | not measured |
| Claude Code | no reader yet; tracker-only | yes | not measured |
| Gemini | no reader yet; tracker-only | yes | not measured |

The server-lookup column comes from the server's own record of the calls it served in the current
process, so it works for any host that calls this server over stdio — including host families with
no session reader at all. That record resets when the server restarts; the report then names its
window as "this server process since <time>" instead of "the whole session".

For a host without a reader, the first summary line says `partial` and
`tracker only (no session files read)`. The engine never guesses a binding, so the missing reader is
a coverage limit rather than an error, and no session is ever attached to the wrong host.

Codex loads skills by reading `SKILL.md` through shell commands, and Claude Code has its own `Skill`
tool. Counting those would need new session readers and further privacy fields, so it is not part of
this change. Host skill reads are currently counted for OMP only, and loaded is not the same as
followed. What the report does with these numbers is in the first-run guide:
[`session-retrospective.md`](./session-retrospective.md).

## Compatibility

Scope: CLI and adapter surfaces — who can start a preparation, and how. It does not describe what a
host can contribute to the analysis; Provider coverage above does that.

| Host | Version | Surface used | Status |
| --- | --- | --- | --- |
| Terminal / any host | Node.js 20+ | `ags-retrospective prepare` after a source build or local tarball install | source build or local tarball; macOS-only verification |
| Paseo | 0.13.2 (installed) | source package; panel action exists but its data-collecting/report-reading RPCs are disabled | capability disabled; adapter not installed |
| Paseo | < 0.13 | none as an adapter; MCP-native route through a local stdio server | unsupported as an adapter; manual CLI or MCP-native route |
| OMP | 18.13.1 (installed) | source manual adapter: `/retrospective manifest <absolute-path>` with a per-run storage-risk confirmation | verified by the CI adapter script against the pinned 18.13.1 SDK tarball; live host loading unverified |
| Other hosts | any | none as an adapter; MCP-native route through a local stdio server | unsupported for invitations; manual CLI + manifest, or MCP-native route |

Rows that name an adapter start a preparation through the CLI. The MCP-native route is not a row
here: it is the server's own transport rule (above) plus the server-lookup column of Provider
coverage, and it needs no adapter version.

The installed Paseo is 0.13.2. The panel is inert because the session-data and report-reading RPCs
stay disabled until host human admission is verified — not because of a version gap. Installing or
upgrading a host is a human decision; nothing here upgrades, installs or reconfigures a host for
you.

## What "unsupported" means

On a host without a verified adapter surface:

- there is no adapter invitation, and no approximation of one by regex-matching words like "done",
  by polling, or by watching file timestamps;
- if the host can call a local stdio MCP server, the MCP-native route is available to it regardless;
- otherwise you still get the full manual path — author a manifest, then run `prepare` yourself;
- the report is identical. Only discoverability differs.

A host that cannot expose a reliable completion signal is documented as unsupported for
invitations. It is never quietly narrowed to "works everywhere". **Automatic host invitations are
unsupported on every host today**: there is no Paseo invitation package, because the released Paseo
SDK cannot enumerate child sessions, so a checkpoint tool could never succeed. The MCP-native nudge
is not a host invitation — it only rides on tool responses the agent already requested (see
Ownership).

## Paseo

Paseo does not need this package for the MCP-native route: an agent that calls a local stdio
`agent-skills-standard` server can prepare a retrospective through it. Whether that server inherits
Paseo's session environment variables (`PASEO_*`) is untested; see Known limits.

Everything below is the optional adapter, one source package, user-owned, not installed by this
work, and **not advertised as an available capability**:

- **`paseo/` (status panel)** — targets 0.13.2, written against `@getpaseo/plugin@0.13.2` typings;
  runtime behaviour is unverified. It registers a Command Center action and a `/retrospective`
  slash command, but the **session-data-collecting and report-reading RPCs are disabled**: the
  panel is inert, explains that the capability is unavailable, and points you at the local CLI. It
  does not read session data on the host, prepare a report, or return report content. There is no
  environment variable, flag or setting that enables it; enabling waits on verified human admission
  of the host RPC context (identity and cancellation signal), which is not proven. Scoped evidence:
  the CI adapter script typechecks this package against the pinned `@getpaseo/plugin@0.13.2` tarball
  (with React Native types) with 0 errors and its 11/11 tests pass on macOS. The package is still
  unpublished, not installed, and unverified in a live Paseo host.

Constraints the package is written to keep (not runtime-verified):

- no report-reading tool, so a hosted model cannot pull report text through a tool response;
- action tokens and consent clicks never enter prompts or agent tools;
- no host-side collection, no automatic RPC data read, and no report transmission to a model;
- no modal, sound, focus change or automatic agent continuation.

Known limitations:

- The deprecated timeline payload is empty in current versions; history must come through
  supported SDK methods, and the plugin must not read undocumented databases.
- Without a verified session-read surface, the only supported input is an explicit local manifest
  fed to the local CLI with disclosed coverage — not silent guessing.
- Same-host IPC is not remote transport, and the disabled panel never transfers report content.
  If a client runs on a different device than the session, paths belong to the owning host.
- External links accept HTTP(S) only. `file:` links are not assumed to work. Where an
  open-folder API is unavailable, you get a clearly labelled full path, never a broken clickable
  promise.

## OMP

OMP can use the MCP-native route through a local stdio server. The adapter described here is a
separate, manual-manifest CLI surface. `integrations/session-retrospective/omp` is **manual-only**
on OMP 18.13.1. It typechecks and its unit tests pass against the pinned 18.13.1 SDK types; loading
it in a live OMP host is unverified. It registers `pi.registerCommand('retrospective', ...)`; the
handler runs outside model context.

- `/retrospective` with no argument refuses with the static code `OMP-AUTO-SCOPE-UNSUPPORTED` and
  prepares nothing — no title, `cwd`, path or directory inference, and no projected session tree.
- `/retrospective manifest <absolute-path>` prepares exactly the declared manifest, after
  reporting declared scope only (node count, `local-allowed` count, explicit gaps) plus "Sessions
  not declared there are not included."
- **Every run asks for the storage-risk acknowledgement**: a per-run confirmation dialog must be
  accepted, and declining returns `STORAGE_RISK_NOT_ACKNOWLEDGED` before any request is built. The
  core request type now carries a required `storageRiskAcknowledged: true`, and the library
  refuses the same code before any read. The adapter's printed CLI hint includes
  `--ack-storage-risk`.
- **Store root is never read from project-local configuration.** `<cwd>/.omp/...` config is not
  consulted; only an explicit absolute `OMP_SESSION_RETROSPECTIVE_CONFIG` override is accepted. A
  root inside the current folder **or anywhere in the same Git repository** — resolved through
  symlinks, so an alias cannot slip past — is refused with `STORE_ROOT_INSIDE_PROJECT`, and an
  unresolvable root is refused with `STORE_ROOT_UNRESOLVED`. A cloned or untrusted checkout
  therefore cannot redirect report storage into its own tree. Do not create project-local config
  for this feature.
- **Automatic invitations are unsupported.** OMP 18.13.1 exposes no verified diagnostic-role or
  readiness fact, so the adapter registers no checkpoint tool, no `session_stop` handler, no
  `setStatus` invitation and no invitation state. `agent_end` is notification-only,
  `session_settled` means quiescence, and `session_shutdown` is short cleanup — none of them is
  used to invite. This is host-wide: no invitation package exists for any host.
- Child relationships must be declared in the manifest; missing external Paseo children remain
  explicit coverage gaps. There is no home-wide scan and no remote fetch.
- Extension module globals are shared between main and child sessions, so any state is keyed by
  the actual session ID, never one module-level "current session".

OMP is also the only provider whose native session files currently yield per-session timing and
host skill reads (`read skill://<name>` calls). Only a path-derived, sanitized skill id is kept, and
it is not checked against the registry; the read boundary is in
[`session-retrospective-privacy.md`](./session-retrospective-privacy.md).

OMP UI limitations:

- When `ctx.hasUI` is false (headless, ACP, scripted runs, some remote surfaces), the command
  returns a neutral unsupported notice plus the manual CLI instruction. It performs no analysis,
  emits no model message and opens no blocking dialog — so a programmatic call cannot bypass the
  confirmation.
- Passive `setStatus` is not an invitation channel here: with no verified readiness fact there is
  nothing eligible to display. Those surfaces get the manual path only.

## Ownership: one inviter per session

No adapter exposes an invitation surface today, so no adapter invites. The shared
**invitation-owner** setting remains a recorded field only; it is never guessed from session titles,
working directories or timestamps.

The MCP-native nudge is not a host invitation and is not governed by that setting. It is one fixed
paragraph appended to the output of `audit_session_compliance` or `get_session_cost`, and only when
the user has enabled consent, the transport is stdio, and at least 20 substantive tool calls (tool
calls other than `get_session_cost`) have happened since the last prepare. It never starts a
conversation, never reaches a host that does not call those tools, and an empty nudge leaves the
output byte-identical to the output without the feature.

## Known limits in host terms

- Binding needs an earlier recorded call in the same server process. The host has not written the
  current call's own row to the session file when the tool runs, so the tool matches the server's
  earlier recorded calls (tool name and receive time, 250 ms tolerance) against calls in the
  consented session roots. A freshly started server with no prior call cannot bind.
- An empty tracker — no prior tool calls in that process — returns `not-substantive`, not an empty
  report.
- The first call after a restart makes a new report. Earlier reports are never deleted or
  rewritten, so repeated restarts accumulate files in the store.
- The session root is labelled `unverified root`: the report does not claim the configured source
  roots are the host's complete session store.
- Whether the server inherits `PI_SESSION_FILE` or Paseo's `PASEO_*` variables from the launching
  host is untested.
- The Codex turn rule is a conservative assumption; Codex has no reader in the engine yet.
- Nested workers beyond 256 per session are not scored.
- Nothing is deleted automatically. Remove one prepared session with
  `ags-retrospective delete --root <abs> --session <id> --host <id> --confirm`.

## Manual host smoke checklist (user-run, NOT verified here)

Nothing below has been executed against a real host in this work. Each step lists the expected
result; a mismatch is a defect report, not a reason to relax the docs.

MCP server over stdio:

1. Start the server locally from the source build (`ags-mcp`, whose default transport is stdio).
   Expected: `prepare_retrospective` and `get_retrospective_status` appear in the tool list. A
   server started with `MCP_TRANSPORT=sse`, or through the HTTP entry point, lists neither.
2. With consent disabled, call `prepare_retrospective`. Expected: a `disabled` state that asks the
   user to run `ags-retrospective enable`; nothing is written.
3. With consent enabled, call `audit_session_compliance` fewer than 20 substantive calls into the
   session. Expected: no nudge paragraph. Once 20 or more substantive calls have happened since
   the last prepare, expected: one fixed paragraph telling workers to ignore it and the
   orchestrator to prepare.
4. Run `ags-retrospective disable`, then call `get_retrospective_status`. Expected: `disabled`.

OMP 18.13.1:

1. Create an owner-only store root **outside any Git repository**, e.g. `mkdir -m 700 -p "$HOME/ags/diagnostics"`. Expected: an absolute path that is not inside this checkout or any other repository.
2. Write the config JSON yourself, outside the repo, with exactly this shape:

   ```json
   {"schemaVersion":1,"invitationOwner":"omp","root":"/absolute/path/outside-any-repo"}
   ```

   Expected: the file exists; a repo-local `<cwd>/.omp/...` file is ignored by design.
3. In the shell you will launch from, export the config's absolute path: `export OMP_SESSION_RETROSPECTIVE_CONFIG=/absolute/path/outside-repo/config.json`. Expected: accepted; a relative value is refused as a config error. An already-running host does not see a new export — launch or restart OMP **after** this step.
4. Launch OMP with the extension loaded, e.g. `omp --extension <repo>/integrations/session-retrospective/omp/index.ts` (if your build names that flag differently, load it through your OMP extensions setting). Expected: the command registers with no error.
5. Author a manifest by hand (two-node synthetic example from the first-run guide). Expected: no adapter generates it for you.
6. Run `/retrospective manifest <absolute-manifest-path>`. Expected: a declared-scope notice (node count, `local-allowed` count, gaps) then the storage-risk confirmation dialog.
7. Decline the dialog. Expected: `STORAGE_RISK_NOT_ACKNOWLEDGED`, no receipt, nothing written.
8. Re-run and accept. Expected: a minimal six-key receipt; artifacts land under the configured root, not the repo.
9. Restart OMP with `OMP_SESSION_RETROSPECTIVE_CONFIG` pointing at a config whose root is inside the repo (or inside the current folder, or via a symlink to it). Expected: `STORE_ROOT_INSIDE_PROJECT` before any manifest read.
10. Start a headless/ACP run and invoke the command. Expected: a neutral manual-CLI instruction, no dialog and no analysis.

Paseo 0.13.2:

1. Install the plugin directory `integrations/session-retrospective/paseo` through Paseo's documented plugin installer (check `paseo --help` / the Paseo plugin docs for the exact command; this guide does not invent syntax). Expected: the plugin loads without changing global agent config.
2. Open **Session retrospective status** from the Command Center, or run `/retrospective`. Expected: an inert panel stating the capability is unavailable, with the manual local-CLI route.
3. Check the panel/RPC responses. Expected: `retrospective.prepare` / `.view` / `.consent` / `.disposition` all return `UNSUPPORTED`; no root path, artifact id or report text appears.
4. Disable by removing the plugin entry and reloading. Expected: no listeners or RPC handlers remain; saved agents and sessions are unchanged.

## Disabling and uninstalling

Nothing here edits your global configuration automatically, and disabling never changes saved
agents, providers or sessions.

1. **MCP-native route** — `ags-retrospective disable` revokes consent without needing a terminal and
   prints `{"schemaVersion":1,"enabled":false,"removed":<boolean>}`. Both tools then report
   `disabled`, and the nudge stays empty. `ags-retrospective consent-status` reports the state and,
   when disabled, the reason; `ags-retrospective enable` is the one-time opt-in and requires an
   interactive terminal. No tool can enable the feature, so an agent cannot grant itself access.
2. **Core CLI** — simply stop running it. Disable the feature by not invoking `prepare`; no daemon
   is installed.
3. **Paseo integration** — remove the plugin from the host's plugin configuration (or point the
   plugin entry at nothing) and reload. Unloading removes its subscriptions and RPC handlers. If you
   also want the artifacts gone, delete the session or the root yourself.
4. **OMP integration** — remove the extension entry from your OMP extension list and restart the
   session. The `/retrospective` command disappears with it; it registers no listener to remove.
5. **Storage** — the store is only files under your chosen root. Deleting that directory removes
   everything; use `ags-retrospective delete` when you want the managed-scope deletion instead of a
   raw directory removal.

## What this change does not include

Skill, workflow and rule text that would prompt an agent to call the retrospective tools is not part
of this change. It comes later, after a value pilot, so no installed host currently asks for a
retrospective on its own. Automatic host invitations remain unsupported, and the online contracts
are specified but not implemented.

## Where the files live

Reports belong to the host that owns the session. The MCP tools return two file paths (summary and
ledger); an adapter may show links resolved through validated artifact IDs and that host's
navigation surface, and always includes the full native path as a fallback. Never open anything
automatically — the human clicks Open report, Review proposals, Open folder, or copies a path.

- Privacy, exclusions and retention: [`session-retrospective-privacy.md`](./session-retrospective-privacy.md)
- First run and CLI contract: [`session-retrospective.md`](./session-retrospective.md)
- Future online contracts (NOT IMPLEMENTED): [`session-retrospective-online-contract.md`](./session-retrospective-online-contract.md)
