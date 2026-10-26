# Assignment packet: context-aware-delegation-4-preparation

- Plan: /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/hopeful-robin/docs/prd/prd-plan-context-aware-delegation.md
- Plan SHA-256: cd8752fa2c3e3c1c86740138fca5def367be679b23d57e5711fd01e8ca3855dc
- Task number: 4
- Project domain: agent-skills-standard / Personal
- Workspace root: /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/hopeful-robin

## Goal

Prepare approved Task4 documentation and ten-scenario protocol; independent slice acceptance is pending, so NO generated copy-back, final acceptance, commits or activation.

## Owner

Single integration preparation owner

## Authority: allowed operations

- Edit only four owned documentation paths for preparation; read settled source and existing evidence.

## Authority: forbidden actions

- No provider/account changes, premium calls, commits, push, paid evals or recursive delegation.
- No generator invocation, generated output edits, source1/2/3 changes or implied acceptance while review is unavailable.

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
- This is preparation only: Task4 completion/copy-back remains gated on independent acceptance of Tasks1-3. Do not call it complete.

## Non-goals

- No host configuration, paid experiments, commits, deployments, recursive delegation or unrelated edits.

## Owned paths

- ARCHITECTURE.md
- CONTRIBUTING.md
- CHANGELOG.md
- docs/validation/context-aware-delegation-protocol.md

## Acceptance criteria

- **AC-20**: Offline scorer evidence is not described as live efficacy or savings.
- **AC-21**: Protocol includes all ten scenarios, three matched repetitions per arm, per-case regressions and unchanged-variable controls.
- **AC-22**: No paid execution without explicit budget/eligibility approval.
- **PREP-01**: Canonical docs describe C1-C3 accurately; source review and generated copy-back explicitly pending.

## Verification

- cwd: .
  command: rtk proxy pnpm validate
  expected: Parent verification only after settled changes; worker checks not_run.

## Required standards

- common-subagent-driven-development (skills/common/common-subagent-driven-development/SKILL.md, revision dd6f5d0adbbc51ae5290d3f0cba60ea1b20d36ade18f2130c18ce1a271c71d05)

## Source files

- docs/prd/prd-plan-context-aware-delegation.md (SHA-256 cd8752fa2c3e3c1c86740138fca5def367be679b23d57e5711fd01e8ca3855dc)
- docs/prd/prd-context-aware-delegation.md (SHA-256 424c008fb0fc1e7f33301be48fbc70b9994b20047c598e0898b20fce41039a42)
- ARCHITECTURE.md (SHA-256 5805e4bf3fb7c1e14cc767a6cbd04c65f9901ab786b9c1232fc468d5e715ba6e)
- CONTRIBUTING.md (SHA-256 af82eaa6f3617b8e4d4c821aa6e69189686f0710f3aae17d5012106e1be4ea87)
- CHANGELOG.md (SHA-256 fc621da2b97f86448db934f7108e4c4b51e06586393940c2760247c305be76c0)

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

- .agent/sdd/context-aware-delegation/task-4-preparation-report.md

## Output contract: status vocabulary

- completed
- needs_context
- blocked
- failed
- cancelled

## Output contract: stop conditions

- Generated copy-back remains blocked by independent review. No source1/2/3 edits.

## Limits

- status: advisory
- note: No paid experiments authorized. No host-enforced token budget exposed.

## Selected task text

## Task 4: Integrate canonical changes, exports and evaluation protocol

**Goal:** Implement REQ-06, AC-19 through AC-22 and verify integrated AC-01..18.
**Owner:** one integration/generator worker; no concurrent writers.
**Depends on:** accepted Tasks 1-3 and their independent review evidence.

**Owned paths:**
- `ARCHITECTURE.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md` if present at dispatch; otherwise the repository's discovered existing changelog, explicitly added to the assignment before mutation
- New `docs/validation/context-aware-delegation-protocol.md`
- Generated mirrors/index/capability outputs: only exact paths discovered and allowlisted by the orchestrator after reading the generator rules; never repository-wide ownership

Tasks 1-3 source files are read-only to this owner. Corrections go back to the original owner, then affected checks are refreshed.

**Required standards:** `agent-skills-standard-integration-gates`, `ags-generator-safety`, `sdd-evidence-preservation`, `agent-skills-eval-pressure-cases`, applicable documentation and evidence-status guidance.

**Change:**
1. Update architectural and contributor guidance to the same C1-C3 contract. Remove/qualify affected unmeasured savings or zero-cost claims; do not broaden into unrelated documentation cleanup.
2. Add release-note wording describing proposed repository behavior and observed verification only. Do not claim host activation, sandbox enforcement or live model savings.
3. Write the ten-scenario protocol below, recording conditions, repetitions, acceptance, accounting coverage and explicit authorization prerequisites. Reuse existing eval infrastructure; do not build a benchmarking platform.
4. Inventory consumers and generated output paths before generation. Protect existing SDD evidence. Use the documented scratch/allowlisted copy-back flow for generators; never edit generated mirrors by hand or permit unrelated output churn.
5. Run covering checks once after integration settles; run actual MCP routing smoke against canonical content. Classify pre-existing failures separately without suppressing them. Stop release readiness on unresolved affected regressions.

**Non-goals:** host activation, paid eval execution, runtime provider selection, changing archived evaluation results, unbounded generated cleanup.
**Verification lane:** run the settled-revision command list and actual canonical-index smoke below; validate generated alignment and preserved evidence under the required integration skills.
**Return:** exact source/generated path list; check commands/exits; smoke output; protected-evidence confirmation; offline/live distinction; updated AC ledger and remaining approval boundaries.
