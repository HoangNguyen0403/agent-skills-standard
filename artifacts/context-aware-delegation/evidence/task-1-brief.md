# Assignment packet: context-aware-delegation-1

- Plan: /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/hopeful-robin/docs/prd/prd-plan-context-aware-delegation.md
- Plan SHA-256: cd8752fa2c3e3c1c86740138fca5def367be679b23d57e5711fd01e8ca3855dc
- Task number: 1
- Project domain: agent-skills-standard / Personal
- Workspace root: /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/hopeful-robin

## Goal

Implement REQ-01/02, AC-01 through AC-06, preserving C1-C4.

## Owner

Task 1 bounded implementer

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

- skills/common/common-subagent-driven-development/SKILL.md
- skills/common/common-subagent-driven-development/references/methodology.md
- skills/common/common-subagent-driven-development/references/templates.md
- skills/common/common-subagent-driven-development/references/progress-receipts.md
- skills/common/common-subagent-driven-development/evals/evals.json
- .agents/workflows/implement-feature.md

## Acceptance criteria

- **AC-01**: Given tightly coupled sequential work and a host permitting main-loop execution, the guidance selects one implementation context.
- **AC-02**: Given independent, verifiable work with disjoint ownership, it permits concurrent bounded workers.
- **AC-03**: Given only a specialist label or another workflow stage, it does not require a new agent.
- **AC-04**: Given a host requiring delegation, the guidance follows that requirement even when one context would otherwise be preferable.
- **AC-05**: Given missing required approval or unavailable isolation, it stops the affected operation rather than inferring permission.
- **AC-06**: Given a required independent acceptance gate, implementer self-review cannot satisfy it.

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
- skills/common/common-subagent-driven-development/SKILL.md (SHA-256 8e9d66c8ad1f97b514217ce50a5daf128626450967f35d919ffd31660275d1b7)
- skills/common/common-subagent-driven-development/references/methodology.md (SHA-256 3008fc0ba4280e13c462f5e35eabe99ecf13875285b8beefe5c79c96dea7c477)
- skills/common/common-subagent-driven-development/references/templates.md (SHA-256 90cf92993d7d0c18fbb307284529ef7215b5c301d539eaab1fa26d5e33845273)
- skills/common/common-subagent-driven-development/references/progress-receipts.md (SHA-256 8aa77a9386ff357278ec1eb0ffdc525b45edf8e1fab28c9ce7b12987bbfb12e7)
- skills/common/common-subagent-driven-development/evals/evals.json (SHA-256 372d37eabf11af18d8c38b4c1be97f3e14f5c06dcaf44ca55a6f449d8cfad2f1)
- .agents/workflows/implement-feature.md (SHA-256 96b71bb86d234d36fffb662f3ac1b8ce3e8c7f1d9294e0731cd131bd668911cc)

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

- .agent/sdd/context-aware-delegation/task-1-report.md

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

## Task 1: Replace blanket delegation with a context-benefit decision

**Goal:** Implement REQ-01/02, AC-01 through AC-06, preserving C1-C4.
**Owner:** one delegation-policy implementer.
**Depends on:** maintainer approval and dispatch prerequisites only.

**Owned paths:**
- `skills/common/common-subagent-driven-development/SKILL.md`
- `skills/common/common-subagent-driven-development/references/methodology.md`
- `skills/common/common-subagent-driven-development/references/templates.md`
- `skills/common/common-subagent-driven-development/references/progress-receipts.md`
- `skills/common/common-subagent-driven-development/evals/evals.json`
- `.agents/workflows/implement-feature.md`

**Required standards:** canonical SDD; common decision discipline; common task-complexity routing; skill-authoring/eval standards routed for these files; `agent-skills-eval-pressure-cases` when editing pressure cases.

**Change:**
1. Add the context-benefit decision before choosing execution placement. Named benefits: independent parallel work, measured context pressure, required independent verification or real host-enforced permission isolation. A label, file count or another checklist item is not sufficient.
2. Distinguish one implementation context from one actor for the entire lifecycle. Main-loop implementation can still require a separate reviewer. Under a delegation-only host, one coherent worker can retain coupled steps.
3. Keep approval, sensitivity, lifecycle, bounded ownership, failure classification and review requirements intact. Resolve the current overly narrow BLOCKED wording in implement-feature to agree with missing authority/context/standards prerequisites.
4. Update examples and the implement-feature entrypoint to reference the canonical placement decision; do not duplicate a second decision table. Explicitly retain the final whole-branch independent-review gate.
5. Add contrasting behavior cases for coupled work, independent parallel slices, host-required delegation, missing isolation, required review and spurious stage-based agents. Use semantic assertions, not exact prose snapshots. Retain existing authority/fallback regression scenarios.

**Non-goals:** changing task_brief.py schema, reducing required review coverage, editing model-tier policy, changing current host instructions.
**Verification lane:** settled-revision eval infrastructure checks plus manual/scorer contrast cases, listed below. Offline scoring is not a live efficacy claim.
**Return:** changed paths; AC-01..06 evidence map; decision examples; any consumer outside owned paths requiring integration; unresolved contradictions. No commits.
