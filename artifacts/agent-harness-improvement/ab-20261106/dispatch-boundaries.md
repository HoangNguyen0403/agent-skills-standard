# Dispatch Boundaries — Agent Harness Assurance Baseline

**Status: FINAL / frozen for independent review**  
**Task:** `harness-ab-boundaries`, Task 2  
**Trace:** BRD-HAR-01 → REQ-HAR-01 → AC-HAR-02 → SRS-002  
**Approval scope:** Subagent-Driven A/B read-only delivery only. C/D execution excluded.  
**Repository status:** analytical report returned for integration-owner persistence.  
**Activation status:** not_required.

## 1. Conclusion and evidence limits

Six distinct dispatch surfaces are mapped below. **Source confirms reusable validation, placement, provider, scheduling and native-model controls. It does not establish deployment-wide project/account/premium authorization.**

Evidence labels:

- **confirmed(source):** implementation inspected at the cited location; not observed live enforcement.
- **observed(previous smoke):** installed version/help output collected in the preceding authorized discovery; not rerun for this task.
- **unknown:** current configuration, deployment provenance or enforcement not established within this assignment.

No live creation, mutation, schedule, heartbeat or native task was invoked. No private configuration, credentials, memory or journals were inspected. This report is manual boundary evidence, **not native qualifier output**. Paseo and OMP are not aliased to another registered host.

### Version and source identity

**observed(previous smoke):**

```text
rtk proxy paseo --version → 0.8.0
rtk proxy omp --version   → omp/18.16.0
```

Both installed `--help` commands succeeded in that discovery.

Absolute source roots used:

- **PCLI:** `/opt/homebrew/lib/node_modules/@getpaseo/cli/`
- **PSRV:** `/opt/homebrew/lib/node_modules/@getpaseo/cli/node_modules/@getpaseo/server/dist/server/server/`
- Installed OMP executable: `/Users/nguyenhuyhoang/.local/bin/omp`, previously identified as Mach-O arm64.
- **OMP:** public source pinned to [`v18.16.0`](https://github.com/can1357/oh-my-pi/tree/v18.16.0), tree SHA `650f3a108229ee11bf68ba3377f4e8c3391cd424`. Paths below are relative to that tree.

**unknown:** active daemon version, whether it loads these installed package bytes, actual OMP launch binary/overrides, configuration revisions and account bindings. No package-byte digest or signed build provenance was captured. The installed package version and pinned upstream source do not authenticate the active deployment.

Assignment source revision and approved-document digests remain those in `packet-b.md`; they identify the standards-repository assignment, not Paseo’s build revision.

## 2. Shared control boundaries

**confirmed(source):** `PSRV/agent/paseo-tool-policy.js:1–14` resolves provider-scoped Paseo tool policy and disabled-tool names. `agent/tools/paseo-tools.js:319–323` applies that policy during tool registration. This is reusable tool-exposure control, not argument-specific project/account authorization.

**confirmed(source):** `agent/tools/paseo-tools.js:2205–2220` exposes profile bundles and notes. The create handler passes concrete provider/settings rather than a profile identity. [Official profile documentation](https://paseo.sh/docs/agent-profiles.md) describes notes as delegation guidance and settings as adjustable launch configuration.

**unknown:** actual enabled tools, configured profiles and any additional host policy. Profile names, caller IDs, workspaces and provider/model strings are not evidence of commercial-account eligibility or authenticated human premium approval.

## 3. Surface B1 — Paseo `create_agent`

### Ingress and execution owner

**confirmed(source):** `PSRV/agent/tools/paseo-tools.js:1017–1078` registers `create_agent`, resolves placement, provider and inherited configuration, then calls `createAgentCommand` with caller identity, workspace, model-bearing provider selection, mode, thinking and features.

`agent/create-agent/create.js:32–60,132–183` resolves MCP creation, creates the provider session through `AgentManager`, starts an initial prompt when present and establishes requested completion notification. Runtime owner: **Paseo MCP catalog → creation command → AgentManager/provider adapter**.

### Reused controls and trusted inputs

**confirmed(source):**

- `create.js:192–212` uses host caller context for child cwd constraints and delegates provider-mode/features resolution.
- `agent/provider-snapshot-manager.js:279–294,458–475` requires a configured, enabled, ready provider and delegates mode/features resolution to its definition; parent unattended state can contribute to resolution.
- `create.js:147–160` delegates workspace/parentage/label placement to the existing intent resolver.

Trusted inputs for these mechanisms are daemon-held caller context, provider definitions/catalog and workspace resolution—not agent-authored claims of human approval.

### Remaining boundary

**unknown:** active caller restrictions, provider policy and any pre-effect premium/account approval hook. No complete project/account/premium control was established in the inspected creation path. Provider readiness and valid placement do not authorize a particular account or expenditure.

**Disposition:** reuse placement/readiness/mode controls; retain cross-route authorization as unverified. No runtime change justified solely by this source map.

## 4. Surface B2 — Model/settings update

### Ingress and execution owner

**confirmed(source):** `PSRV/agent/tools/paseo-tools.js:1580–1611` registers `update_agent`. Mode, model, thinking and individual feature changes are sequentially applied through `AgentManager`, followed by metadata updates.

`agent/agent-manager.js:1158–1217` delegates to the existing provider session, drains events and updates stored runtime projections. Owner: **Paseo update handler → AgentManager → existing provider session**.

### Reused controls and trusted inputs

**confirmed(source):**

- Missing/unsupported session capabilities are handled by the manager/provider methods.
- For OMP, `agent/providers/omp/agent.js:911–924` requires a provider-qualified model reference and forwards it to the OMP runtime.
- `agent/providers/omp/cli-runtime.js:109–113` sends `set_model` / `set_thinking_level` RPC commands.
- `agent/providers/omp/agent.js:742–749` validates known mode IDs but returns **“Start a new OMP session to change approval mode”** rather than changing live approval mode.

The authoritative runtime outcome comes from the provider session, not the requested settings or generic success response.

### Remaining boundary

**unknown:** current session mode/model, account binding, downstream model-change authorization and an authenticated premium grant check. The inspected update path does not establish a new call through creation-time readiness/placement controls. Native OMP **per-call worker** model grants cannot be assumed to govern this root-session update route.

The sequential handler is not evidence of atomic all-or-nothing settings changes. A generic success response also cannot prove OMP approval mode changed.

**Disposition:** reuse provider-specific settings methods; preserve requested versus effective settings. Fix-candidate only if later authorized observation demonstrates misleading state or missing required policy.

## 5. Surface B3 — CLI launch

### Ingress and execution owner

**confirmed(source):** `PCLI/dist/commands/agent/run.js:12–41` defines launch options. `:418–464,504–518` validates input, connects to the selected daemon and calls `client.createAgent`; it does **not** call the MCP catalog handler.

Daemon ingress is `PSRV/session.js:1616–1617` (`create_agent_request`), then `createSessionAgent` at `:2653–2714`, which calls `createAgentCommand` with `kind: "session"`.

Owner: **CLI client → daemon session request handler → session creation command/provider**.

### Reused controls and trusted inputs

**confirmed(source):**

- CLI `run.js:257–272` validates prompt/workspace/output-mode combinations.
- Daemon `session.js:2659–2662,2686–2688` validates directory existence.
- `session.js:2741–2778` resolves caller existence and active workspace placement.
- `agent/create-agent/create.js:71–99` separately resolves provider mode/features for this session path.

CLI flags are requested configuration, not human approval. Daemon state/provider definitions supply the inspected validation authority.

### Remaining boundary

**unknown:** connection authentication configuration, active daemon identity, account eligibility and premium checks. MCP tool suppression alone does not prove CLI launch is denied: this is a different ingress. Caller identity supplied in a request must not be promoted into cryptographically authenticated approval.

`--wait-timeout` is a client waiting limit, not proof of provider cancellation or cessation.

**Disposition:** reuse daemon session validation; no-build for a duplicate launcher. Keep CLI authorization independently unverified.

## 6. Surface B4 — Schedule starting a new agent

### Ingress and execution owner

**confirmed(source):** `PSRV/agent/tools/paseo-tools.js:1875–1914` registers `create_schedule`, builds cadence/expiry and stores a new-agent target through `ScheduleService.createOrReplace`.

`PSRV/schedule/service.js:396–414` selects due active schedules. `:675–732` validates target cwd, provisions a workspace, invokes the injected creation function with `kind: "mcp"` and `unattended: true`, then runs the scheduled prompt.

Owner: **Paseo schedule service → workspace provisioning/creation dependency → AgentManager/provider**.

### Reused controls and trusted inputs

**confirmed(source):**

- `service.js:92–99,107–115` validates positive `maxRuns` and evaluates expiry/run-count completion.
- `:385–413` prevents an already-running schedule from concurrent ordinary dispatch.
- `:691–709` forwards stored provider/mode/thinking/features and explicitly marks unattended creation.
- `:725–732` treats cancellation, waiting permission and error outcomes as failures rather than silently granting permission.

The retained schedule target and daemon scheduler supply dispatch inputs. A stored cadence, label or creation-time instruction is not a renewable human spending grant.

### Remaining boundary

**unknown:** configured schedule contents, actual injected creation binding, recurring authorization freshness, account eligibility and premium approval at fire time. Passing `unattended: true` is confirmed source behavior—not evidence of the effective provider policy in deployment. `maxRuns`/expiry are not per-run token, monetary or duration caps.

**Disposition:** reuse scheduling/lifecycle controls. Any future policy assessment must cover both schedule creation/update and execution; no cross-route guarantee is inherited here.

## 7. Surface B5 — Heartbeat prompting an existing agent

### Ingress and execution owner

**confirmed(source):** `PSRV/agent/tools/paseo-tools.js:1916–1956` requires an agent-scoped caller and stores an agent-target schedule bound to `callerAgentId`.

At fire time, `PSRV/schedule/service.js:635–674` loads that agent and calls `startAgentRun`; it does not create a fresh agent.

Owner: **Paseo heartbeat registration → scheduler’s existing-agent branch → existing provider session**.

### Reused controls and trusted inputs

**confirmed(source):**

- Registration checks caller presence/existence.
- Fire-time execution rejects missing/archived agents and an already-active run (`:638–651`).
- Waiting permission or provider error produces failure (`:657–664`).
- Common scheduler timing/expiry/run-count controls apply through the inspected scheduler.

Trusted inputs are daemon caller/agent records and retained heartbeat target—not a new profile selection.

### Remaining boundary

**unknown:** the agent’s effective settings when the heartbeat fires, post-registration model changes, per-fire authority and account/premium restrictions. Heartbeat delivery does not establish renewed human approval. Creation-time mode validation cannot be assumed to rerun.

**Disposition:** reuse target/liveness checks; preserve heartbeat as a distinct authorization surface. Do not describe it as equivalent to scheduled new-agent creation.

## 8. Surface B6 — OMP-native task dispatch

### Ingress and execution owner

**confirmed(source):** pinned OMP [`packages/coding-agent/src/task/index.ts`](https://github.com/can1357/oh-my-pi/blob/v18.16.0/packages/coding-agent/src/task/index.ts):716 declares task approval tier `exec`; `:1106–1195` resolves task inputs and every item’s effective policy before choosing synchronous/background execution.

Owner: **OMP TaskTool/preflight → native subagent executor**, not Paseo `create_agent`.

### Reused controls and trusted inputs

**confirmed(source):**

- [`task/structured-subagent.ts`](https://github.com/can1357/oh-my-pi/blob/v18.16.0/packages/coding-agent/src/task/structured-subagent.ts):325–343 checks recursion depth/spawn policy; `:504–510` checks disabled agents.
- [`task/model-approval.ts`](https://github.com/can1357/oh-my-pi/blob/v18.16.0/packages/coding-agent/src/task/model-approval.ts):1–16, approximately `:275–355`, separates operator grant authority from project/subagent narrowing. Catalog availability or credentials alone grant nothing; exact model/upstream identities and operator/live allowlists constrain per-call selection.
- [`task/executor.ts`](https://github.com/can1357/oh-my-pi/blob/v18.16.0/packages/coding-agent/src/task/executor.ts):4558–4583 validates the actual resolved per-call model before child creation; `:4776–4785` installs per-request approval checks and disables fallback for that per-call case.

Trusted model grants originate in operator-owned settings, the permitted selected-agent definition or parent-model rule as implemented—not arbitrary project configuration.

### Remaining boundary

**unknown:** effective local grants, allowlists, agent definitions, approval mode and account-pool configuration. Per-call model authorization is not full project/account eligibility, authenticated one-use premium approval or real-world action authorization. Omitted per-call selectors and other dispatch mechanisms must not inherit this claim.

Paseo adapter source additionally maps OMP launch modes: `PSRV/agent/providers/omp/provider-config.js:21–38` maps `full/write/ask` to `yolo/write/always-ask`; `agent.js:1942–1943` delegates translation. This closes the earlier source-discovery gap, but no effective launch was observed. Live OMP mode changes still require a new session.

**Disposition:** reuse native grants and spawn policy; do not build a duplicate native gate or advertise deployment-wide enforcement.

## 9. Frozen receipt

- **Status:** FINAL; complete six-surface analytical map returned.
- **Files changed:** none. Integration owner alone persists this body.
- **Evidence:** narrow installed-package and pinned public-source inspection; prior version/help smoke reused.
- **Independent acceptance:** pending separate architecture/security review against AC-HAR-02/SRS-002.
- **Unresolved:** active deployment/configuration identity; per-route project/account/premium enforcement; actual runtime allow/deny evidence.
- **C/D:** NOT RUN and outside this assignment.
- **Disposition:** reuse established mechanisms; no duplicate control plane. Any demonstrated policy gap becomes a separately approved fix candidate, not permission to alter controls.
- **Audit:** exact packet standards loaded; MCP compliance audit returned both matching body digests with no routed coverage gaps.
- **Economics:** exact task tokens/prices unavailable; no cost or savings inference. Prior exhaustion/reset history remains owned by the parent attempt inventory.
- **Freeze:** no further changes from this worker absent a bounded corrective assignment.
