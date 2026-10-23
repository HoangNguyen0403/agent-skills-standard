# Task 5 report — native specialist exports and truthful capability declarations

Status: **CORRECTIVE ROUND SETTLED**. Four reviewer D3 gaps plus the evidence-scope gap are implemented in Task 5-owned sources. No tests/build/lint/formatters run. Runtime support remains unverified; no host was invoked.

Project/account: agent-skills-standard / Personal. Workspace: `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/flawless-mule`.

## Corrective changes (this round)

1. **Copilot explicitly empty allowlist** — `cli/src/services/utils/SpecialistTransformer.ts`
   Presence, not length, now decides. `tools: []` / `allowed-tools: []` emit a native `tools: []` (documented "disable all tools") instead of omitting the key and silently granting every tool. `projection.projected` reports the honored field; nothing is claimed when no name mapped.
2. **Copilot dual declaration precedence** — same file
   Deterministic precedence: native `tools` wins over universal `allowed-tools`. Only the consumed field is projected; the unconsumed field is reported as `unprojected: ['allowed-tools']` (or `['tools']`) and appears in the disclosure as ignored. Both fields are never reported as projected.
3. **Gemini native tool projection** — same file
   A declared native `tools` list is emitted verbatim (including `tools: []`); `projection.projected = ['tools']`. Cross-vendor `allowed-tools` names are not translated into Gemini vocabulary: the field is reported plus one `tool:<name>` token per name, and the disclosure keeps the declaration visible. Absent declaration still inherits all tools (no false claim either way).
4. **OpenCode native surface** — `cli/src/capabilities/agentCapabilities.ts`
   `.opencode/agents/*.md` with `mode: subagent` is a native agent surface: `delegation = { kind: 'native-agent', surface: 'opencode-agents' }`. Runtime status without evidence stays `not_verified`; no support is claimed.
5. **Runtime support scope** — `cli/src/capabilities/agentCapabilities.ts`
   `RuntimeQuery` now requires `version`, `revision`, `requiredControls`, `evidence`. `delegationStatus` matches host + surface + version + **revision** + operation, and:
   - promotion to `supported` requires live `execution`, non-empty `trace`, `observed_pass`, **and** control coverage (`requiredControls.every(...)`);
   - `observed_fail` yields `unsupported` only when that observation covers the required controls (an unrelated denial cannot downgrade a claim);
   - missing coverage, differing revision, or fixture execution stays `not_verified`.
   No shim: the only remaining non-test caller (`scripts/generate-capabilities-doc.ts`) passes no query and therefore renders `not_verified`.

## Affected sources

- `cli/src/capabilities/agentCapabilities.ts`
- `cli/src/services/utils/SpecialistTransformer.ts`
- `cli/src/capabilities/__tests__/agentCapabilities.spec.ts` (OpenCode row; revision-scope and control-coverage behavior; failure-scope case)
- `cli/src/services/utils/__tests__/SpecialistTransformer.spec.ts` (explicit-empty Copilot, dual-field precedence, Gemini native/empty/explicit-empty list, cross-vendor per-name tokens)
- Previously settled and unchanged this round: `cli/src/constants/index.ts`, `cli/src/commands/sync.ts`, `scripts/generate-capabilities-doc.ts`, `cli/src/services/__tests__/SpecialistSyncService.spec.ts`

## Task 7 coordination (Task 7 file not edited)

`RuntimeEvidence` mirrors the qualification record fields: `host`, `surface`, `version`, `revision`, `operation`, `layer` (`serialization|discovery|execution|denial`), `executor` (`live|synthetic`), `outcome` (`observed_pass|observed_fail`), `trace`, `controls`; statuses `supported|unsupported|not_verified`. A Task 7 claim must now supply `revision` and `requiredControls`; surface ids are `copilot-custom-agents`, `claude-code-subagents`, `codex-subagents`, `gemini-cli-subagents`, `opencode-agents`. Evidence is an observation, never authentication.

## Out of scope / owned elsewhere

- `capabilityGolden` spec + snapshot deletion: owned by integration (1013d192). Not touched; no shell cleanup attempted again.
- Generated `docs/agent-capabilities.md` and `README.md:469` wording: integration.
- `scripts/harness-smoke/qualification.*`: Task 7 (39829cee).
- `WorkflowSyncService`, `WorkflowIndex`, lock schema, workflow acquisition, root changelog: untouched.

## Verification status

No test/build/lint/formatter command was executed in this round. Behavior is asserted by the updated capability/transformer/consumer contracts, but their passing state is unmeasured here. Live native conformance (AC-5.a/b) remains `not_verified`; installed versions observed earlier by version command only (codex 0.163.0, Claude 2.1.289, Gemini 0.45.0) prove nothing about discovery, invocation, nesting, or enforcement.
