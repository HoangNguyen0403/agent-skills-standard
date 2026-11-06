# Implementation Plan: CLI Typecheck Contract Repair

slug: cli-typecheck-contracts
operator_profile: hybrid
delivery_mode: extended
snc_tier: high
model_tier: strong
approval: approved(requesting maintainer, 2026-11-06)
implementation_status: delivered
verification_status: all_approved_criteria_observed_pass; final document review pending
owner: requesting maintainer

## Decision Brief

**Recommendation:** Restore CLI type checking by correcting stale test/API usage and shared TypeScript contracts, not by weakening compiler settings or runtime checks. Replace the unsupported-library subprocess promise construction with an equivalent typed Promise. Remove one obsolete, unsupported MCP scope fallback together with its duplicate branch test.

**Approval:** The requesting maintainer selected “Approve the plan” for this bounded plan. The previously selected Subagent-Driven execution approach carries forward. This approval does not authorize publication, merge, deployment, dependency/runtime upgrades, remote sync, premium calls, live efficacy studies, or human acceptance claims.

**Sizing:** SNC: S=2 N=1 C=2 total=5 tier=high. Changes span command tests, configuration serialization, subprocess error handling, and the shared registry/index metadata contract. The high tier retains plan approval, readiness, separate architecture/security/test-gap review, and parent-owned verification. Capability is not premium authorization.

## Goal And Authoritative Work Item

Resolve the observed 17 CLI compiler diagnostics while preserving supported behavior and the completed critical-thinking feature.

- Actual reproduction: `rtk pnpm --dir cli exec tsc --noEmit` exited 2 with 17 diagnostics.
- Retained raw evidence: `.agent/sdd/critical-thinking-agent-workflows/repair-typecheck-cli.log`.
- Evidence SHA-256: `05da4ee73956c5d44413f9538566aa765b3c9839d65b721fdc02bf8ad643e005`.
- This compiler failure is accepted evidence, not rerun merely to confirm. Diagnostic sites and current signatures were inspected read-only. No claim that a fresh current-revision compiler run occurred, or that an earlier baseline passed/failed.
- Existing behavioral context: CLI suite previously passed 1,555 tests despite the compiler failure; the new compiler gate remains independent of those runtime results.
- The completed initiative remains `implemented` with its historical evidence intact. This defect work has its own scope and evidence; it does not retroactively change prior results.

## Root Causes And Proposed Changes

### 1. Test contracts and obsolete MCP fallback — 14 diagnostics

| File under `cli/src/` | Cause | Bounded change |
| --- | --- | --- |
| `commands/__tests__/UninstallCommand.spec.ts` | Broad Vitest mock type is not the required `() => boolean` TTY callback | Type the mock as `Mock<() => boolean>` and construct `vi.fn<() => boolean>()`; keep confirmation/TTY assertions |
| `commands/__tests__/VerifyCommand.spec.ts` | Broad spy type loses callback argument inference at five sites | Use `MockInstance<typeof console.log>` once; retain output and exit-code assertions |
| `commands/__tests__/UpgradeCommand.spec.ts` | Dynamic import lacks the NodeNext extension | Use `../upgrade.js`; preserve dynamic loading after `vi.resetModules()` and current mock ordering |
| `services/__tests__/HookService.spec.ts` | Redundant dynamic import lacks the extension | Add `KIRO_HOOK_MD` to the existing static service import; retain installed-byte equality assertion |
| `services/__tests__/SyncService.spec.ts` | `fs.pathExists` overload makes `mockResolvedValue(false)` infer a void return; dynamic GitService import lacks extension | Use the established `mockImplementation(async () => false)` pattern and `../GitService.js`; retain no-copy/no-remove/no-log and prototype-spy restoration assertions |
| `services/validation/__tests__/interopRules.spec.ts` | Three content-only concrete validators receive an obsolete unused path argument | Remove only those second arguments. Preserve name, trigger phrase, block-scalar, and separate path-rule assertions; do not widen production signatures |
| `commands/__tests__/McpCommand.spec.ts` and `commands/mcp.ts` | Unsupported `_` array test contradicts `Record<string, string>`; fallback indexes one character if `_` is a string | Remove obsolete `options._?.[0]` fallback and its duplicate unsupported-input test. Keep `options.scope`, default/invalid-scope handling, and existing supported `scope: user` behavior |

MCP caller evidence: Commander declares `mcp <action> [scope]`, maps positional scope to `merged.scope`, and preserves explicit `--scope` precedence in `cli/src/index.ts:222–244`. Static reference investigation found no production `_`-array caller; the failing test is the only such caller. No API widening or first-character special case is proposed.

### 2. Configuration serializer — 1 diagnostic

`ConfigService.dumpConfig` accepts only `Record<string, unknown>` even though it only serializes and valid callers supply `SkillConfig` or a merged raw record.

- In `cli/src/services/ConfigService.ts`, use `SkillConfig | Record<string, unknown>` for the private serializer parameter.
- Remove the unnecessary serializer-call casts, including the existing migration double cast.
- Preserve object identity, YAML options, extension-field merging, and the ordering that writes the primary config before deleting migrated legacy files.
- Do not add a blanket index signature, allocate a replacement object solely for typing, or broaden validation.

### 3. Subprocess promise construction — 1 diagnostic

`SyncService.defaultExec` uses `Promise.withResolvers`, absent from the configured ES2022 library contract.

- In `cli/src/services/SyncService.ts`, use `new Promise<{ code: number; stderr: string }>((resolve, reject) => { ... })`, keeping the existing `execFile` callback inside its executor.
- Preserve executable/argument handling without shell conversion, original `ENOENT` rejection, numeric nonzero exit handling/fallback code 1, stderr/error-message precedence, and success result.
- No cancellation, retry, timeout, child-handle, or new public testing API is introduced. The helper currently has no abort API.
- Do not raise compiler lib/target, change runtime requirements, or claim Node 20 runtime validation. Current-host behavior and compiler conformance are the verification envelope.

### 4. Shared routing metadata model — 1 diagnostic

The actual registry publishes four optional routing/composition fields consumed by the index generator, but `RegistryMetadata` does not declare them. Two services duplicate the same `RemoteMetadata` interface.

- `cli/src/models/types.ts`: own the existing four-field `RemoteMetadata` shape; make `RegistryMetadata extends RemoteMetadata`.
- `cli/src/services/IndexGeneratorService.ts`: remove its duplicate and import the model type directly.
- `cli/src/services/MetadataReader.ts`: remove its duplicate and import the model type directly.
- `cli/src/services/IndexGeneratorServiceImpl.ts`: import `RemoteMetadata` directly from models, retaining the service-class import separately.
- Preserve `file_routing`, `broad_globs`, `base_language_skills`, and `foundational_composite_rules`, with their existing optionality/types. No runtime conversion, wire migration, compatibility re-export, or unrelated `SkillMetadata` cleanup.
- Preserve metadata precedence: present empty values override disk; absent values permit existing fallback.

## Contract And Scope Fence

Observable completion criteria for this defect record:

- **Compiler:** the exact CLI `tsc --noEmit` command exits 0 with no diagnostics, with existing compiler options/dependencies unchanged.
- **Supported CLI:** actual Commander positional MCP scope and explicit-flag precedence remain correct in an isolated temporary project; no real user/project MCP registration changes.
- **Configuration:** existing migration, serialization, and unrelated-field preservation tests pass unchanged in behavior.
- **Subprocess:** the public attestation path, with the default adapter rather than injected executor, preserves success, nonzero/stderr, missing-executable handling, and temporary-manifest cleanup in a bounded offline smoke.
- **Routing:** actual `IndexGeneratorServiceImpl` consumes explicit routing/composition metadata correctly against an isolated skill inventory; existing present-empty versus absent precedence remains intact.
- **No bypass:** no `any`, double-cast, suppression, weakened assertions, disabled checks, compiler strictness/lib/target relaxation, or changed agent detection/defaults is used to manufacture green.
- **Preservation:** completed feature regressions and actual local generation/MCP consumption remain intact; historical raw evidence is retained.

Non-goals: dependency/runtime upgrades, broad formatter/lint cleanup, new metadata validation framework, unrelated APIs, Windows/performance coverage expansion, live model efficacy, human study/approval, registry publication, commit/push/merge/deploy, persistent MCP restart, or remote pull/sync.

## Task Slices And Ownership

| Slice | Write ownership after approval/readiness | Interface / verification |
| --- | --- | --- |
| Test/command contract alignment | Six test files above excluding `SyncService.spec.ts`, plus `commands/mcp.ts` | Preserve supported command/validator assertions; focused six-file tests and isolated actual Commander scope smoke |
| Serializer type contract | `services/ConfigService.ts` | No serialization behavior change; existing `ConfigService.spec.ts` migration/save coverage |
| Shared metadata and subprocess adapter | Four metadata files, `services/SyncService.ts`, and sole ownership of `services/__tests__/SyncService.spec.ts` | Direct model imports; existing metadata/index/sync suites and real offline routing/subprocess smokes |
| Integration evidence | One integration owner handles minimal changelog/architecture/walkthrough/run evidence updates after proof | No production or independently authored generated-mirror changes |

The SyncService test file belongs only to the third slice, including its two mechanical compiler fixes. No shared edits. Investigators/reviewers have no implementation ownership. Exact assignment packets and current source identities are prepared only after approval; no historical profile exception is reused beyond its authorized scope.

## Verification Plan

1. Preserve the actual retained compiler RED and its revision/limits; do not manufacture a fresh failing-before run or introduce source-text tests.
2. Update existing tests without weakening behavioral assertions. Add a permanent test only for a distinct uncertain consumer-visible boundary, not import wiring, copied fields, mock echoes, or source wording.
3. Workers freeze all writes; parent runs foreground, sequential focused checks. Workers do not run tests/build/lint/format/generation mid-flight.
4. Focused CLI suites:
   - `commands/__tests__/McpCommand.spec.ts`, `UninstallCommand.spec.ts`, `UpgradeCommand.spec.ts`, `VerifyCommand.spec.ts`;
   - `services/__tests__/HookService.spec.ts`, `ConfigService.spec.ts`, `SyncService.spec.ts`, `MetadataReader.spec.ts`, `IndexGeneratorService.spec.ts`;
   - `services/validation/__tests__/interopRules.spec.ts`.
5. Run `rtk pnpm --dir cli exec tsc --noEmit`; require zero diagnostics, not merely a successful transpile.
6. Run three throwaway real-entrypoint smokes:
   - source CLI `mcp scope user`, then positional scope with overriding `--scope`, in a temporary project/config with child-local environment; inspect actual saved YAML and leave real registrations untouched;
   - public `verifyAttestations(config)` without executor injection, using a separate child with controlled local `gh` executable/isolated PATH and controlled constructor manifest dependency, no network; inspect public result/error and manifest cleanup;
   - real `IndexGeneratorServiceImpl` over temporary package inventory and explicit metadata; inspect generated routing/category output against independent supplied fixture expectations/current metadata contract.
7. Do not put a platform-fragile fake-`gh` executable test in the permanent cross-platform suite, or export private helpers solely for testing. Label host-specific smoke limits; no unrun Windows or minimum-runtime claim.
8. Final covering gates after all owners freeze: complete CLI suite, MCP typecheck/tests where shared imports affect them, generator regression suite, and the relevant existing critical-thinking eval/outcome/trace checks. Exercise normal local generation and actual same-root MCP discovery/fetch where affected. Keep warnings/skips/NOT RUN separate.
9. Separate final source/contract/security/test-gap review; update minimal docs/changelog and evidence only after runtime proof. Preserve the original failed compiler receipt and link a new remediation result instead of rewriting history.

## Delivery Status And Received Evidence

Delivered in the repository at source revision `1c79a7edb22b768ad5362e2e10766df2978e8642` plus the uncommitted repair snapshot. Every criterion in **Contract And Scope Fence** now has an observed parent receipt; the only remaining steps are the final documentation/evidence review and the scoped document auditors, which this status edit itself makes stale. Receipt index and per-lane detail: `.agent/sdd/cli-typecheck-contracts/delivery-report.md`.

| Criterion | Receipt | Result |
| --- | --- | --- |
| Compiler | `compiler-cli-final.json`; `compiler-mcp.json` | CLI `tsc --noEmit` exit 0, no diagnostics; MCP exit 0. Options, `lib` and `target` unchanged |
| Supported CLI | `smoke-scope-final.json` | Actual Commander adapter, 5 invocations, temporary config only |
| Configuration | `focused-cli.json`, `full-cli.json` | Existing migration/save/extension-preservation assertions pass unmodified; suite 1554/1554 in 71 files |
| Subprocess | `smoke-subprocess.json` | 4 scenarios plus manifest cleanup; the "shell expansion" label is a source-level assertion, not an execution trace |
| Routing | `smoke-routing-final.json` | 14/14 fixtures; original confounded-fixture FAIL retained in `smoke-routing.json` |
| Preservation | `preservation-evals.json`, `preservation-reporting.json`, `full-generator.json`, `root-generation*.json`, `root-consumer.json` | 477, 92, 95 tests pass; root generation copied nothing; `--check` and same-root consumer PASS |
| No bypass | `source-review.md`, task reports | No `any`, double cast, suppression, assertion weakening, or compiler-setting change; the one deleted test belonged only to the removed unsupported fallback |

Retained history, never rewritten: the original 17-diagnostic RED (`.agent/sdd/critical-thinking-agent-workflows/repair-typecheck-cli.log`), the intermediate 1-diagnostic `compiler-cli.json` FAIL, `focused-cli.json` as a pre-correction run, and the routing FAIL above. Counts are runner totals, not independent scenario counts.

Limits: 4 inherited MCP skips (3 Windows-only, 1 unconditional performance skip) and the Vite native-config-loader / CLI fixture warnings are reported, not passes or clean runs. All evidence is current-host (darwin/arm64) only; no minimum-Node, Windows, live-efficacy, persistent-client, human-acceptance or release claim is made, and cost is unavailable.

## Risks And Readiness

- NodeNext `.js` specifiers must still resolve under Vitest module resets/mocks; compile and runtime gates are both required.
- Serializer changes must not lose unknown raw fields or reorder migration writes/deletes.
- Promise replacement must preserve error classification and avoid shell execution/network verification. An injected executor does not prove the default adapter.
- Models must not import service implementations. Direct imports replace duplicate types with no compatibility aliases.
- Removing the unsupported scope fallback is safe only within the inspected repository caller contract; supported positional behavior remains owned by the actual Commander adapter.
- The workspace intentionally contains the completed feature changes. Do not pull, overwrite, reset, branch away, or update lockfiles as generic environment preparation.
- Implementation route eligibility is resolved from current profiles and observed exhaustion. Delivery quota exhaustion is not permission for premium, cross-domain, review-only executors, or inline implementation. Bounded unrelated slices may use an eligible configured implementation route; any unavailable required route is escalated explicitly.
- High-tier approval and `implementation-readiness` precede source edits. Existing Subagent-Driven selection is retained; approval of this plan does not authorize a different approach or other separately gated actions.

## Approval And Next Workflow

Approval: approved by the requesting maintainer for the bounded changes, dead fallback removal, and verification envelope; source edits remain gated on readiness and bounded assignment packets.

**Historical (pre-implementation).** When this plan was approved, the recorded next step was `implementation-readiness`, then approved Subagent-Driven compiler remediation, and at that point no source files had been edited for this continuation. That route ran to completion and is preserved here as history only.

**Current route.** `verify-work` for the delivered repair against the receipt index in `.agent/sdd/cli-typecheck-contracts/delivery-report.md`, plus maintainer disposition of the separate critical-thinking checkpoint record in `docs/srs/readiness-critical-thinking-agent-workflows.md`. Final documentation/evidence review and the scoped document audit remain pending; this plan authorizes no merge, release, acceptance or live trial.
