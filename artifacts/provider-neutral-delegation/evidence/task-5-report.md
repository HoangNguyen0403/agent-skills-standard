# Task 5 report — native specialist exports and truthful capability declarations

Status: **CORRECTIVE ROUND SETTLED** (fixture type fix included). No tests/build/lint/formatters run. Runtime support remains unverified; no host invoked.

Project/account: agent-skills-standard / Personal. Workspace: `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/flawless-mule`.

Retention note: `.agent/sdd/provider-neutral-delegation/task-5-brief.md` and the previous report had disappeared from the workspace before this rewrite (directory retained only `plan-path` and a review diff). This file restates the settled result; no artifacts were deleted by this owner, and `capabilityGolden.spec.ts` + its snapshot are present and untouched.

## Corrective changes (review round)

1. **Copilot explicitly empty allowlist** — `cli/src/services/utils/SpecialistTransformer.ts`
   Presence, not length, decides. `tools: []` / `allowed-tools: []` emit a native `tools: []` (documented "disable all tools") instead of omitting the key and inheriting every tool. `projection.projected` names the honored field; all-unknown declarations claim no field projection and report `tool:<name>` tokens only.
2. **Copilot dual declaration precedence** — same file
   Native `tools` wins over universal `allowed-tools`. Only the consumed field is projected; the unconsumed field is `unprojected: ['allowed-tools']` (or `['tools']`) and disclosed as ignored. Both are never reported as projected.
3. **Gemini native tool projection** — same file
   Declared native `tools` lists are emitted verbatim, including `tools: []`, with `projected: ['tools']`. Cross-vendor `allowed-tools` names are not translated: the field plus one `tool:<name>` token each, declaration disclosed.
4. **OpenCode native surface** — `cli/src/capabilities/agentCapabilities.ts`
   `.opencode/agents/*.md` (`mode: subagent`) is `{ kind: 'native-agent', surface: 'opencode-agents' }`. Without evidence the status stays `not_verified`.
5. **Runtime support scope** — same file
   `RuntimeQuery` requires `version`, `revision`, `requiredControls`, `evidence`. Matching is host + surface + version + revision + operation. `supported` additionally requires live `execution`, non-empty `trace`, `observed_pass`, and `requiredControls.every(control => record.controls.includes(control))`. `observed_fail` ⇒ `unsupported` only when that observation covers the required controls. Earlier-revision passes, fixture execution, and uncovered controls stay `not_verified`. The only non-test caller (capability doc generator) passes no query and renders `not_verified`; no shim.

## Affected sources

- `cli/src/capabilities/agentCapabilities.ts`
- `cli/src/services/utils/SpecialistTransformer.ts`
- `cli/src/capabilities/__tests__/agentCapabilities.spec.ts`
- `cli/src/services/utils/__tests__/SpecialistTransformer.spec.ts`
- `cli/src/services/__tests__/SpecialistSyncService.spec.ts`
- Previously settled: `cli/src/constants/index.ts`, `cli/src/commands/sync.ts`, `scripts/generate-capabilities-doc.ts`

## Latest narrow fix (strict TS)

`cli/src/services/__tests__/SpecialistSyncService.spec.ts` line ~313: the Codex no-sandbox test cast the resolved value (`as unknown as string[]`), which left `vi.mocked(fs.readdir)` bound to an overload whose mock parameter is `void`. Fixed at the call site:

```ts
vi.mocked(
  fs.readdir as unknown as (path: string) => Promise<string[]>,
).mockResolvedValue([...]);
```

No `any`, no production shim, no other test changed.

## Task 7 coordination (their files untouched)

`RuntimeEvidence` mirrors the qualification record: `host`, `surface`, `version`, `revision`, `operation`, `layer` (`serialization|discovery|execution|denial`), `executor` (`live|synthetic`), `outcome` (`observed_pass|observed_fail`), `trace`, `controls`; statuses `supported|unsupported|not_verified`. Claims must supply `revision` and `requiredControls`; surface ids are `copilot-custom-agents`, `claude-code-subagents`, `codex-subagents`, `gemini-cli-subagents`, `opencode-agents`. Records evidence observations, never authentication.

## Out of scope / other owners

- `capabilityGolden.spec.ts` + snapshot: integration owner; present, not modified here.
- Generated `docs/agent-capabilities.md`, `README.md:469`: integration.
- `scripts/harness-smoke/qualification.*`: Task 7.
- Workflow sync/index/lock, workflow acquisition, root changelog: untouched.

## Verification status

No test/build/lint/formatter command was executed. Behavior is covered by the updated capability/transformer/consumer contracts; their passing state is unmeasured here. Native conformance (AC-5.a/b) is `not_verified`; earlier version facts (codex 0.163.0, Claude 2.1.289, Gemini 0.45.0) came from version commands only and prove nothing about discovery, invocation, nesting, or enforcement.
