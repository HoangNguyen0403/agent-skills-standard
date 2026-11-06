# Session Retrospectives — Host Integration and Limitations

The primary route needs no host integration. Three tools inside the `agent-skills-standard` MCP
server, registered on stdio only, prepare, check, and index retrospectives from any MCP-capable host
that runs that server locally: `prepare_retrospective` (orchestrator or unassigned agent only; takes
an optional `title` up to 200 chars, displayed as "agent-supplied, unverified"),
`get_retrospective_status` (consent state only), and `prepare_retrospective_index` (cross-session
index generation; optional `since`, `until`, `folder`). It works with or without OMP or Paseo, and
without a host adapter package or a host version check. The three MCP retrospective tools
and `ags retrospective` CLI command exist in the released `agent-skills-standard-mcp` 0.8.1 package over local stdio.
The extended automatic completion preparation via `get_session_cost` is unreleased source in PR #295.
The MCP tools and the `ags retrospective` CLI command are the surfaces; there are no host adapter packages.
Everything reachable by the feature is reachable through the MCP server or from a terminal.

> **Status: capability release boundary.** The `ags retrospective` CLI command and local
> analysis tools are available via `agent-skills-standard-mcp` 0.8.1 over local stdio; automatic completion preparation
> via `get_session_cost` with settled task counts is an in-progress source feature. Windows and Linux runtime remain unverified; no CI job runs on Windows. Version
> facts below come from installed binaries, released SDK packages and public host documentation — not
> from a completed integration run. See `CHANGELOG.md` → `[Unreleased]`.

## Transport rule

The server registers these tools in guarded blocks, `if (transport === "stdio")` in
`mcp/src/server.ts`. The HTTP entry point pins its transport to `"sse"` (`mcp/src/http.ts:41`), so
the retrospective tools never appear on an SSE session or on the HTTP server, and the nudge is
suppressed there as well. A local run defaults to stdio; only an explicit `MCP_TRANSPORT=sse` or the
HTTP entry point changes that.

The consequence, stated plainly: **a remote or HTTP deployment of this server cannot prepare a
retrospective.** Use a local stdio server, or use the CLI directly. The tools read session files and
publish to a private store on the machine running the server, so a remote deployment has nothing to
analyse and nowhere to publish. SSE and HTTP surfaces simply lack the tools rather than degrading
them into something weaker.

## Provider coverage

Scope: what a host's session files can contribute to the analysis and what the server can measure
about itself, checked on real session folders on this machine. This table describes session
sources; the CLI and MCP surfaces are described below.

| Provider | Session binding | Server skill lookups | Per-session timing and host skill reads |
| --- | --- | --- | --- |
| OMP | exact, from native session files | yes | yes |
| Codex | structural counts only; no session reader in engine yet | yes | not measured |
| Claude Code | no reader yet; tracker-only | yes | not measured |
| Gemini | no reader yet; tracker-only | yes | not measured |

The server-lookup column comes from the server's own record of the calls it served in the current
process, so it works for any host that calls this server over stdio — including host families with
no session reader at all. That record resets when the server restarts; the report then names its
window as "this server process since <time>" instead of "the whole session".

For a host without a reader, the first summary line says `partial` and
`tracker only (no session files read)`. The engine never guesses a binding, so the missing reader is
a coverage limit rather than an error, and no session is ever attached to the wrong host.

Because Claude Code and Gemini do keep local transcripts by default (`~/.claude/projects` and
`~/.gemini/tmp`), `ags retrospective enable` checks those two paths with a single `lstat` and lists
any that exist in a separate, non-consented disclosure section of the prompt. That is presence
information only: the folders are never enumerated, opened or parsed, they are not added to the
consent record, and their presence says nothing about whether the provider is running. The check
uses the documented default locations; a relocated store (for example a custom `CLAUDE_CONFIG_DIR`)
is not detected. `--source-root` replaces the default supported roots with explicit paths; it does
not add a transcript reader for a provider that has none, and naming a disclosed store, an ancestor,
a descendant, or a symlink alias of one is refused with `SOURCE_ROOT_UNSUPPORTED_STORE` before the
prompt is shown; a path that cannot be resolved refuses with
`SOURCE_ROOT_CANONICALIZATION_FAILED`.

Codex loads skills by reading `SKILL.md` through shell commands, and Claude Code has its own `Skill`
tool. Counting those would need new session readers and further privacy fields, so it is not part of
this change. Host skill reads are currently counted for OMP only, and loaded is not the same as
followed. What the report does with these numbers is in the first-run guide:
[`session-retrospective.md`](./session-retrospective.md).

## Compatibility

Scope: CLI and MCP surfaces — who can start a preparation, and how. It does not describe what a
host can contribute to the analysis; Provider coverage above does that.

| Surface | Invocation | Status |
| --- | --- | --- |
| Terminal / CLI | `ags retrospective enable`, `disable`, `status`, `index` after a source build or local tarball install | source build or local tarball; macOS-only verification |
| MCP-capable host (including OMP, Paseo) | `prepare_retrospective`, `get_retrospective_status`, `prepare_retrospective_index` via local stdio server | unreleased source; local stdio only |

There are no host adapter packages. A host uses the MCP-native route over a local stdio
server.

## What "unsupported" means

Without host adapter packages:

- there is no host integration package or plugin;
- if the host can call a local stdio MCP server, the MCP-native route is available to it;
- the MCP-native nudge is not a host invitation — it only rides on tool responses the agent already requested (see Ownership).

## Paseo
Paseo uses the MCP-native route: an agent that calls a local stdio `agent-skills-standard` server
can prepare a retrospective through it. There is no Paseo adapter package, status panel, or plugin.
Whether that server inherits Paseo's session environment variables (`PASEO_*`) is untested; see
Known limits.

## OMP

OMP uses the MCP-native route through a local stdio server. There is no OMP
adapter package, extension, or slash command.

OMP is also the only provider whose native session files currently yield per-session timing and
host skill reads (`read skill://<name>` calls). Only a path-derived, sanitized skill id is kept, and
it is not checked against the registry; the read boundary is in
[`session-retrospective-privacy.md`](./session-retrospective-privacy.md).

## Ownership and the retrospective nudge

There are no host adapter packages or host invitations. The MCP-native nudge is not a host
invitation: it is one fixed paragraph appended to the output of `audit_session_compliance` or
`get_session_cost`, and only when the user has enabled consent, the transport is stdio, and at
least 20 substantive tool calls (tool calls other than `get_session_cost`) have happened since the
last prepare. It never starts a conversation, never reaches a host that does not call those
tools, and an empty nudge leaves the output byte-identical to the output without the feature.

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
- Codex gets structural counts only; Claude Code and Gemini have no reader in the engine yet.
- Paseo agent sessions cannot be linked to the main session from session files alone (about 313 of
  342 created agents in pilot data are unobservable); this is explicitly reported as delegation coverage.
- Tracker-derived numbers (lookups that matched nothing, bodies returned) are "not measured" for
  replayed sessions.
- Consent text is version 4: an existing version 1, 2 or 3 consent record fails closed as disabled
  (`version`); re-run `ags retrospective enable` to grant consent.
- Older generations written by earlier builds (two-file v2) or ledgers lacking new fields fail closed
  with `STORED_LEDGER_INVALID`.
- Cost is an estimate based on a price table; "returned" skills does not mean "followed".
- Nested workers beyond 256 per session are not scored.
- Nothing is deleted automatically. Earlier reports remain in the store unless you delete them.

## Manual host smoke checklist (user-run, NOT verified here)

Nothing below has been executed against a real host in this work. Each step lists the expected
result; a mismatch is a defect report, not a reason to relax the docs.

MCP server over stdio:

1. Start the server locally from the source build (`ags-mcp`, whose default transport is stdio).
   Expected: `prepare_retrospective` and `get_retrospective_status` appear in the tool list. A
   server started with `MCP_TRANSPORT=sse`, or through the HTTP entry point, lists neither.
2. With consent disabled, call `prepare_retrospective`. Expected: a `disabled` state that asks the
   user to run `ags retrospective enable`; nothing is written.
3. With consent enabled, call `audit_session_compliance` fewer than 20 substantive calls into the
   session. Expected: no nudge paragraph. Once 20 or more substantive calls have happened since
   the last prepare, expected: one fixed paragraph telling workers to ignore it and the
   orchestrator to prepare.
4. Run `ags retrospective disable`, then call `get_retrospective_status`. Expected: `disabled`.


## Disabling and uninstalling

Nothing here edits your global configuration automatically, and disabling never changes saved
agents, providers or sessions.

1. **MCP-native route** — `ags retrospective disable` revokes consent without needing a terminal and
   prints `{"schemaVersion":1,"enabled":false,"removed":<boolean>}`. Both tools then report
   `disabled`, and the nudge stays empty. `ags retrospective status` reports the state and,
   when disabled, the reason; `ags retrospective enable` is the one-time opt-in and requires an
   interactive terminal. No tool can enable the feature, so an agent cannot grant itself access.
2. **Storage** — the store is only files under your chosen root. Deleting that directory removes
   stored reports.

## What this change does not include
Skill, workflow and rule text that would prompt an agent to call the retrospective tools is not part
of this change. It comes later, after a value pilot, so no installed host currently asks for a
retrospective on its own.

## Where the files live

Reports belong to the host that owns the session. The MCP tools return three file paths (summary,
ledger, and HTML report), with full native paths. Never open anything
automatically — the human clicks Open report, Open folder, or copies a path.

- Privacy, exclusions and retention: [`session-retrospective-privacy.md`](./session-retrospective-privacy.md)
- First run and CLI contract: [`session-retrospective.md`](./session-retrospective.md)
