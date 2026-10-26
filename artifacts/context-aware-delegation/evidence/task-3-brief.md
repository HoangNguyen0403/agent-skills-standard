# Assignment packet: context-aware-delegation-3

- Plan: /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/hopeful-robin/docs/prd/prd-plan-context-aware-delegation.md
- Plan SHA-256: cd8752fa2c3e3c1c86740138fca5def367be679b23d57e5711fd01e8ca3855dc
- Task number: 3
- Project domain: agent-skills-standard / Personal
- Workspace root: /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/hopeful-robin

## Goal

Implement REQ-05, AC-15 through AC-18.

## Owner

Task 3 bounded implementer

## Authority: allowed operations

- Read scoped sources and standards; edit only owned paths; write assigned receipt. User approved implementation in latest message.

## Authority: forbidden actions

- No provider/account changes, premium calls, commits, push, paid evals or recursive delegation.

## Authority: required approvals

- None declared (explicit empty list).

## Global invariants

- ### Shared contract C1: delegation placement

Use the PRD decision table as the single product contract. Canonical policy lives in `skills/common/common-subagent-driven-development/SKILL.md`; detailed examples live in its references. Other workflows reference it rather than independently restating divergent routing rules. Main-loop execution is conditional on host permission. If delegation is required, keep tightly coupled implementation in one bounded worker rather than a chain of planners/fixers. Required independent verification survives either placement.

### Shared contract C2: model and effort guidance

Canonical selection guidance belongs to `skills/common/common-task-complexity-routing/`, with SDD referencing it. Keep SNC sensitivity/review floors unchanged. Capability hints are not account authorization. The host resolves approved profiles, supported effort and authorized fallback; explicit settings are never silently overridden. Do not add a model-resolver service, pricing API or mandatory assignment schema field in this release.

Extend receipt guidance, using existing records rather than another telemetry store, to cover: requested capability, actual provider/model/effort when observable, effort support, selection reason, eligibility/authority reference, budget availability and substitution/fallback reason. Unknown stays unknown. User preference examples are guidance, not a new persisted configuration interface.

### Shared contract C3: evidence and economics

Count the accepted task, including parent, workers, independent reviews, repairs and failed/cancelled attempts. Distinguish tokens, billed money, subscription/quota consumption and elapsed time. Reuse `ARCHITECTURE.md` task-economics contracts. No numerical savings without complete comparable actor coverage and prices; offline fixtures do not establish model efficacy.

### Shared contract C4: write ownership and verification

Tasks 1, 2 and 3 have disjoint owned paths and may run concurrently after approval and valid packets. Do not edit another owner's files. Cross-task needs are reported to the orchestrator, not fixed opportunistically. Workers skip mid-flight build/lint/test/formatter runs; after the batch settles, the orchestrator runs covering checks once against a stable revision and requests corrections. If later edits occur, affected evidence must be refreshed. Independent review remains required for each slice and the final integrated branch under current policy.


- Skip mid-flight tests/build/lint/formatters. Write tests first; covering checks run by parent after all owners settle.
- Preserve existing independent review and approval gates.

## Non-goals

- No host configuration, paid experiments, commits, deployments, recursive delegation or unrelated edits.

## Owned paths

- skills/database/database-mongodb/SKILL.md
- skills/laravel/laravel-eloquent/SKILL.md
- mcp/test/SkillIndex.spec.ts

## Acceptance criteria

- **AC-15**: Given `model routing`, `thinking level` or `LLM model selection`, keyword routing does not load MongoDB or Eloquent merely because of `model`.
- **AC-16**: Given explicit MongoDB/Mongoose model intent, MongoDB guidance remains discoverable.
- **AC-17**: Given explicit Laravel/Eloquent model intent, Eloquent guidance remains discoverable.
- **AC-18**: Given a relevant model-tier request, the capability-routing standard remains discoverable.

## Verification

- cwd: .
  command: rtk proxy pnpm --filter ./mcp test -- test/SkillIndex.spec.ts
  expected: Parent runs at settled revision; worker reports not_run, never claims pass.

## Required standards

- common-subagent-driven-development (skills/common/common-subagent-driven-development/SKILL.md, revision 8e9d66c8ad1f97b514217ce50a5daf128626450967f35d919ffd31660275d1b7)
- common-task-complexity-routing (skills/common/common-task-complexity-routing/SKILL.md, revision e7e3231f3d9a34633992d2cc40fdae6861fa77e67cc735bdecf4bb0e6f422a2a)
- common-decision-discipline (skills/common/common-decision-discipline/SKILL.md, revision 0df5a2ce474431c18b1e011b4b3672d737fb833ff863daba1b0c6f6f61dd806f)

## Source files

- docs/prd/prd-plan-context-aware-delegation.md (SHA-256 cd8752fa2c3e3c1c86740138fca5def367be679b23d57e5711fd01e8ca3855dc)
- docs/prd/prd-context-aware-delegation.md (SHA-256 424c008fb0fc1e7f33301be48fbc70b9994b20047c598e0898b20fce41039a42)
- skills/database/database-mongodb/SKILL.md (SHA-256 4771ecab949d4db606520ab5e38904927becebdc4d9b6c733de5eea977297243)
- skills/laravel/laravel-eloquent/SKILL.md (SHA-256 c670a361a6aa97c48528ae81e0bcf6f2a017cb2460a8543c4f8a100cfc87db4d)
- mcp/test/SkillIndex.spec.ts (SHA-256 cd92fbd15324bbb0669edd1ccbb9f563e320e0dc9f1eb869b337fc41e9fea622)

## Source revision

- commit: 92d06c420f6a41f08e11579423e4e3eacdb7880d

## Dirty identity

- status: ?? .agent/
?? docs/prd/prd-context-aware-delegation.md
?? docs/prd/prd-plan-context-aware-delegation.md

- sha256: 3be6353d82626546f1f945544d394d4ff40e1be36d15ce668230e224d255a4b3

## Dependencies

- None declared (explicit empty list).

## Output contract: receipt destination

- .agent/sdd/context-aware-delegation/task-3-report.md

## Output contract: status vocabulary

- completed
- needs_context
- blocked
- failed
- cancelled

## Output contract: stop conditions

- Material design change, scope expansion, missing authority or inaccessible standards: report to parent.

## Limits

- status: advisory
- note: No paid experiments authorized. No host-enforced token budget exposed.

## Selected task text

## Task 3: Fix unrelated model-trigger loading without changing the matcher

**Goal:** Implement REQ-05, AC-15 through AC-18.
**Owner:** one metadata/regression implementer.
**Depends on:** approved C1-C4 only. Task 2's new trigger expectations are checked at integration, not assumed while it is editing.

**Owned paths:**
- `skills/database/database-mongodb/SKILL.md`
- `skills/laravel/laravel-eloquent/SKILL.md`
- `mcp/test/SkillIndex.spec.ts`

**Read-only implementation context:** `mcp/src/services/SkillIndex.ts`, `mcp/src/services/SkillParser.ts`.
**Required standards:** routed TypeScript/testing standards, skill-authoring metadata rules, canonical task-complexity routing for target intent.

**Change:**
1. Remove/qualify ambiguous bare `model` triggers in both database skills. Retain framework-specific discovery through existing mongo/mongoose/eloquent/laravel terms and explicit qualified model phrases where necessary.
2. Extend the existing canonical-repository regression suite, not a mocked copy of metadata. Cover `model routing`, `LLM model selection`, `thinking level`, `model tier`, explicit MongoDB/Mongoose model requests and Laravel/Eloquent model requests. Include mixed/case variants where meaningful.
3. Assert absence of the two unrelated database skills for LLM intent and presence of the expected domain skill for qualified domain requests. Preserve legitimate multi-intent routing: an explicit MongoDB request combined with LLM routing should still discover MongoDB.
4. Do not replace the boundary matcher, add negative-keyword schema or special-case the exact reported string in code. If metadata cannot satisfy the ACs, report the concrete counterexample for orchestrator decision.

**Non-goals:** generic keyword cleanup, all-category trigger redesign, unrelated bare `scope`/`with` changes.
**Verification lane:** `rtk proxy pnpm --filter ./mcp test -- test/SkillIndex.spec.ts`; real canonical SkillIndex invocation with negative/positive phrases in a disposable local smoke, after the batch settles.
**Return:** changed metadata and behavior tests; before/after routed IDs from the smoke; AC mapping; any intended discovery compatibility change. No commits.
