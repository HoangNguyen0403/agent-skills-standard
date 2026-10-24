---
name: common-subagent-driven-development
description: Execute multi-task implementation plans by dispatching one bounded implementer per task with independent review gates. Use when implementing plans, executing multi-task PRs, or transitioning from planning to implementation.
metadata:
  triggers:
    files:
    - 'docs/**/plans/*.md'
    - '.agent/sdd/**'
    - '*plan*.md'
    - 'TODO.md'
    keywords:
    - subagent-driven-development
    - subagent
    - implement plan
    - execute plan
    - implement this plan
    - implement PR
    - implement tasks
    - execute tasks
    - start implementation
    - plan implementation
    - subagent driven
    - multi-task implementation
    - sdd
---
# Subagent-Driven Development (SDD)

## **Priority: P1 (HIGH)**

Execute a multi-task plan through one bounded implementer per task, an independent review after each task, and a whole-branch review at the end.

## 1. Execution Gate and Inline Exception

Before editing code for any multi-task plan:
1. Do not make implementation edits in the orchestrator session unless the Inline exception in step 3 has been selected and recorded; otherwise dispatch a bounded worker.
2. Confirm the approach: Subagent-Driven (recommended) vs. Inline. Record the decision.
3. Inline is allowed only when host policy explicitly permits it and the change is genuinely small and low risk. Record the permitting policy and the bounded scope; that recorded branch then authorizes direct orchestrator edits within it. A plan approval, silence, or missing host support does not grant inline permission.

## 2. Semantic Lifecycle

| Operation | Required evidence |
| --- | --- |
| prepare | Standalone packet: assignment manifest, task text, authority, invariants, owner, owned paths, required standards with revision, ACs, verification, source/dependency identities |
| dispatch | One implementation owner per slice; authority and data eligibility checked before any task context is sent |
| completion | Terminal state reported by the host, not inferred from silence or elapsed time |
| resume | Same task, same authority, same owned paths; a new task is a fresh dispatch |
| cancel | Reported as cancelled/stopped; never as completed or verified |
| receipt | Operation, task/actor/revision, terminal state, evidence, limitations |
| verify acceptance | Independent reviewer, separate from the implementer, against ACs and evidence |

Host instructions bind these operations to native invocation. Canonical text names semantics only. If a required operation or permission control is unavailable on the host surface, report the affected operation unsupported; do not claim success.

## 3. Bootstrap and Batching

- Orchestrator owns plan discovery, assignment and dispatch.
- Worker bootstrap reads its packet, requests the exact required standards it names, and executes. It does not repeat workflow discovery or parent intake unless the packet says so.
- Missing required standards or inaccessible evidence is a dispatch prerequisite, not a reason to re-run global intake.
- Dispatch disjoint, dependency-ready slices concurrently with one non-overlapping owner each. Sequence true dependencies. Do not fan out unrelated lenses.

## 4. Failure-Specific Recovery

| Observed failure | Route |
| --- | --- |
| Missing prerequisite/context | `needs_context` or `blocked` with the exact missing item; no fallback |
| Defective output | One corrective assignment naming the failed AC and expected result |
| Observed provider exhaustion | Only an eligible, authorized fallback; the receipt records the exhaustion evidence and selected route |
| Consequential safety/design issue | Human decision |

Retry count alone never authorizes premium. Timeout and cancellation are not completion. Required human approvals remain external to agent verdicts.

## 5. Task Loop
For each task:
1. **Prepare:** Record `BASE=$(git rev-parse HEAD)`. Generate the packet with `task_brief.py <PLAN_FILE> <TASK_NUMBER> --assignment <ASSIGNMENT_JSON> --out <BRIEF_FILE>`. The assignment manifest is required; never dispatch a bare task section.
2. **Dispatch:** One implementer per task, with a host-selected `fast | standard | strong` hint. The packet, not repeated prose, carries authority and acceptance.
3. **Yield:** Wait for a completion notification; never poll status in a loop.
4. **Review:** Generate the scoped cumulative package from `$BASE` and the owned paths. Dispatch an independent reviewer with brief, report, and package. Implementer self-review never satisfies this gate.
5. **Fix:** Re-prompt the same worker with concrete failed ACs. Regenerate the cumulative package; re-review against cumulative state.
6. **Integrate:** Orchestrator verifies the diff, runs required covering checks, and commits.

## 6. Final Review and Evidence

- Run whole-branch review on a capable host hint; then complete the branch.
- Before deleting the workspace, archive packets, reports, immutable review snapshots and verification receipts at durable references. Cleanup must not invalidate handoff links.

## Anti-Patterns

- **No worker commits**: workers leave changes; the orchestrator commits.
- **No recursive delegation**: workers do not spawn agents.
- **No self-approval**: implementer verdicts do not satisfy independent review.
- **No premium by retry**: retries, task size, or a strong hint do not authorize premium.
- **No polling loops**: yield until a completion event.
- **No fabricated savings**: never claim token or cost savings without complete measured coverage.
- **No enforcement claims**: prompt text and warnings are not a sandbox.

## References

- [Methodology & Gates](references/methodology.md)
- [Prompt Templates](references/templates.md)
- [Progress Receipts](references/progress-receipts.md)
