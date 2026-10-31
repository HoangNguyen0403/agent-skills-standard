# Session retrospective — Paseo manual plugin (0.13.x)

Manual, human-driven local retrospective inside Paseo: a Command Center action, a
`/retrospective` slash command and an agent panel that opens on request and reports why the
capability is unavailable in this build. Everything is passive — the plugin opens nothing by
itself, plays no sound, starts no analysis on mount, and never sends a message to your agent.

> **Status: inert source adapter, not a verified host integration.** Written against the released
> `@getpaseo/plugin@0.13.2` typings. No install, build, typecheck, test or host smoke was run where
> this file was authored; that remains the authoring-time history. The panel is a real
> unsupported-capability implementation, not a stub for an advertised Prepare flow: this package
> performs no collection and returns no report text. Current scoped evidence is below: the pinned-SDK
> typecheck and fixture suite pass on macOS, while the package stays unpublished, not installed, and
> unverified in a live host.

## What it does

1. `/retrospective` (or **Session retrospective status** in the Command Center) opens the panel
   for the focused agent. Both labels name the status view, not a preparation action: this build
   offers none. The command text is never sent to the agent.
2. The panel shows why the capability is unavailable, the supported manual route on the owning
   host, this session's observed identity, and whether automatic invitations exist on this host
   (they do not — see below).
3. Nothing else happens. There is no Prepare, read, transmit, paging or cancellation control,
   because none of those operations is offered by this build.

## RPC surface

| RPC | Behaviour |
| --- | --- |
| `retrospective.status` | Returns the static capability statement (`unavailable`, reason `human-admission-unverified`), the automatic-invitation capability, whether a checkpoint tool is registered, and the in-memory identity observation. No filesystem, store or host access; the response contains no root path, artifact id or content. |
| `retrospective.consent` | Always `{ ok: false, code: "UNSUPPORTED" }`. Mints nothing. |
| `retrospective.prepare` | Always `UNSUPPORTED`. Opens no manifest, collects no evidence, publishes nothing. |
| `retrospective.view` | Always `UNSUPPORTED`, for both `path-only` and `content`. Resolves no artifact, opens no file, returns no path. |
| `retrospective.disposition` | Always `UNSUPPORTED`. Creates, reads or changes no invitation. |

The four data-path names are kept so a client receives an explicit typed refusal instead of an
unknown method. Their inputs are deliberately loose: any object shape parses — including the removed
`requestId` or a `callerIsHuman` claim — so an older client gets `UNSUPPORTED` rather than a schema
error, and no field is ever read or honored. The handlers take no core, store, root, host port or
consent table, so there is nothing for them to read or mutate; refusal happens before any host
lookup or path resolution because none exists. The refusal is unconditional: no environment variable
participates, and a test sets `AGS_RETROSPECTIVE_MANUAL_UI=1` to prove the refusal is unchanged.

`retrospective.cancel` does not exist. With every mutating RPC disabled there is no run to cancel,
so the previous adapter-owned cancellation registry, its contract and its UI control were removed
rather than shipped untested.

## Why the capability is unavailable

The released surfaces expose no verifiable human-admission channel:

- `@getpaseo/plugin` 0.13.2 and 0.14.0 give an RPC handler `PluginHandlerContext = { paseo }` — no
  caller identity, capability or human-action proof;
- the client protocol's `plugin.rpc.invoke.request` payload carries `pluginId`, `method` and `input`
  with no principal;
- the published plugin reference documents schema validation on both sides but no human-only caller
  guarantee, and plugins run as trusted, unsandboxed source.

Collecting local transcripts or returning report text over an unverified boundary is not something
this adapter will do, so the capability is not offered at all. Pending an approved design decision or
host evidence for the enabled path, every data-path RPC stays a refusal; there is no operator switch,
because an operator claim is not a verifiable caller check.

## Supported manual route (pending packaging)

Use the local retrospective CLI on the owning host against the same store root, then read the
artifacts on that host. That CLI is the supported manual path while plugin support is unavailable.

It is **not** installed or packaged by this repository's setup yet, so treat it as pending: this
package does not run it, does not read transcripts and does not fetch report text. The panel repeats
that statement rather than implying the route is live.

## What it registers

- a Command Center action (agent context) and `/retrospective` (agent context) that open the panel;
- an agent panel titled **Retrospective**;
- `agent.created` and `agent.turn_started` lifecycle subscriptions, used only to remember
  host-supplied parentage for the identity note in `status`.

It registers no agent tool, so `automatic: { state: "unsupported", reason:
"agent-tool-unavailable" }`. The only lifecycle subscriptions are the two identity ones — a
lifecycle completion is not a checkpoint. Automatic invitations are therefore unsupported here, and
no separate invitation package exists in this repository.

## Runtime prerequisites (not provisioned here)

- Paseo `>=0.13.0` with plugins enabled, installed by the user; this package never installs,
  upgrades, reloads or edits global configuration.
- `zod` supplied by the host at runtime (`^4.4.3`).

No core package is required: the manual plugin imports none, so it loads without the
`agent-skills-standard-mcp` tarball.

Verification commands (unexecuted at authoring time):

```bash
cd integrations/session-retrospective/paseo
npm install --ignore-scripts
npm run typecheck
npm run test
```

**Current evidence (macOS, scoped to the pinned SDK).** `node scripts/verify-retrospective-adapters.mjs`
— the command behind CI job `retrospective-adapters` — packs this adapter's exact pinned specs
(`@getpaseo/client`, `@getpaseo/plugin`, `@getpaseo/protocol` at the declared versions, plus React
Native types), typechecks against them, and runs the suite: **0 type errors, 11/11 tests pass**.
That covers declared-SDK compatibility and the fixture suite. The plugin remains **unpublished**,
**not installed** into any Paseo host, and **live host loading is unverified** — the manual smoke in
the repository host guide is the way to check that.

## Disabling

Remove the plugin from the host's plugin configuration and reload. Its handlers and identity
subscriptions disappear with the process. No saved agent, provider or session is changed. Existing
artifacts and the store root are untouched.
