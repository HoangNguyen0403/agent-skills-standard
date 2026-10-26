# Assignment packet: context-aware-delegation-2

- Plan: /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/hopeful-robin/docs/prd/prd-plan-context-aware-delegation.md
- Plan SHA-256: cd8752fa2c3e3c1c86740138fca5def367be679b23d57e5711fd01e8ca3855dc
- Task number: 2
- Project domain: agent-skills-standard / Personal
- Workspace root: /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/hopeful-robin

## Goal

Implement REQ-03/04 and AC-07 through AC-14; support AC-18.

## Owner

Task 2 bounded implementer

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

- skills/common/common-task-complexity-routing/SKILL.md
- skills/common/common-task-complexity-routing/references/routing-table.md
- skills/common/common-task-complexity-routing/references/snc-rubric.md
- skills/common/common-task-complexity-routing/evals

## Acceptance criteria

- **AC-07**: Given a deterministic operation, guidance considers a tool/script before another LLM.
- **AC-08**: Given a configured eligible profile, the host preserves its explicit model/effort settings rather than silently replacing them.
- **AC-09**: Given unsupported effort selection, the result records unsupported status rather than claiming the effort was applied.
- **AC-10**: Given a strong capability hint, no premium call is authorized by that hint alone.
- **AC-11**: Given a dispatch, its documented receipt records requested tier, actual configuration, selection reason and capability limitations.
- **AC-12**: Given unknown price/quota or incomplete actor accounting, no numerical monetary savings are claimed.
- **AC-13**: Given exhaustion, fallback stays within already-authorized eligible routes.
- **AC-14**: Given defective output rather than exhaustion, guidance uses the existing corrective-assignment policy instead of treating it as provider failure.
- **AC-18**: Given a relevant model-tier request, the capability-routing standard remains discoverable.

## Verification

- cwd: .
  command: rtk proxy pnpm evals:audit
  expected: Parent runs at settled revision; worker reports not_run, never claims pass.

## Required standards

- common-subagent-driven-development (skills/common/common-subagent-driven-development/SKILL.md, revision 8e9d66c8ad1f97b514217ce50a5daf128626450967f35d919ffd31660275d1b7)
- common-task-complexity-routing (skills/common/common-task-complexity-routing/SKILL.md, revision e7e3231f3d9a34633992d2cc40fdae6861fa77e67cc735bdecf4bb0e6f422a2a)
- common-decision-discipline (skills/common/common-decision-discipline/SKILL.md, revision 0df5a2ce474431c18b1e011b4b3672d737fb833ff863daba1b0c6f6f61dd806f)

## Source files

- docs/prd/prd-plan-context-aware-delegation.md (SHA-256 cd8752fa2c3e3c1c86740138fca5def367be679b23d57e5711fd01e8ca3855dc)
- docs/prd/prd-context-aware-delegation.md (SHA-256 424c008fb0fc1e7f33301be48fbc70b9994b20047c598e0898b20fce41039a42)
- skills/common/common-task-complexity-routing/SKILL.md (SHA-256 e7e3231f3d9a34633992d2cc40fdae6861fa77e67cc735bdecf4bb0e6f422a2a)
- skills/common/common-task-complexity-routing/references/routing-table.md (SHA-256 af4cd920af62700e1d922e00422ca381250daf19f09facd7ebb822ec5cfdcbce)
- skills/common/common-task-complexity-routing/references/snc-rubric.md (SHA-256 c80c446b9cc29a907b11a0b1f08d4ba58c3599a638dcce9285f2f1faed509716)
- skills/common/common-task-complexity-routing/evals/evals.json (SHA-256 3ea25f3915e28d9bb8206597083d99516ad17a8c9f0946ccbde6150263299c24)

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

- .agent/sdd/context-aware-delegation/task-2-report.md

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

## Task 2: Add provider-neutral model and effort selection guidance

**Goal:** Implement REQ-03/04 and AC-07 through AC-14; support AC-18.
**Owner:** one capability-guidance implementer.
**Depends on:** approved C1-C4 only; no dependency on Task 1 output.

**Owned paths:**
- `skills/common/common-task-complexity-routing/SKILL.md`
- `skills/common/common-task-complexity-routing/references/routing-table.md`
- `skills/common/common-task-complexity-routing/references/snc-rubric.md`
- `skills/common/common-task-complexity-routing/evals/`

**Required standards:** common task-complexity routing; canonical SDD; decision discipline; routed skill-authoring/eval standards.

**Change:**
1. Keep capability (`fast|standard|strong`) separate from thinking effort. Recommend the least expensive eligible configuration adequate for the task and its verification burden, not the cheapest model categorically.
2. Supply examples for deterministic tools, bounded implementation, ambiguous investigation and consequential review. A small edit does not lower sensitivity floors.
3. Describe host-owned resolution of eligibility, explicit configured settings, supported effort, user preference and budget uncertainty. Unknown support must be reported, not mapped silently. Do not assume equal effort semantics across vendors.
4. Define the C2 receipt guidance in a reference and link it from SDD integration; no new runtime schema or telemetry store. Explain API cost versus subscription/quota and complete task cost including repair.
5. Retain distinct recovery paths for missing prerequisites, defective output and observed provider exhaustion; premium remains separately approved, bounded and analysis-only.
6. Add behavioral scenarios for unsupported effort, unknown quota/pricing, explicit profile preservation, unauthorized cheap account, strong-not-premium and one-corrective-assignment behavior. Ensure relevant LLM model-tier/effort requests can discover this skill without introducing a broad bare `model` trigger.

**Non-goals:** runtime auto-routing, new provider APIs, actual profile mutation, new spending permission, hardcoded commercial profiles.
**Verification lane:** capability eval scenarios plus Task 3 repository-backed discovery checks, scored after sources settle.
**Return:** AC-07..14/18 evidence map; canonical reference anchors for Task 1/4; advisory-versus-enforced limitations; no commits.
