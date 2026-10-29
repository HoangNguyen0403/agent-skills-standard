---
name: common-subagent-driven-development
description: Execute an approved implementation plan at the context boundary that preserves required independence and review. Use when implementing plans, executing multi-task PRs, choosing between main-loop and dispatched execution, or transitioning from planning to implementation.
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

Execute a multi-task plan with one implementation owner per slice, independent review after each task, and whole-branch review before completion.

## 1. Placement Decision

Choose placement before any edit. Delegate only when at least one named benefit applies: independent parallel work over disjoint owned paths that are verifiable alone; measured context pressure such as observed truncation, lost constraints, or replay cost; a required independent verification gate that must be a separate owner from the implementer; or real host-enforced permission isolation, meaning the host enforces the boundary because prompt text is not enforcement. A specialist label, another workflow stage, file count, plan length, or "more thorough" fan-out is not a named benefit.

Precedence, first match wins: controlling host authority, then required independence or isolation, then coupling and verifiability, then economical eligible capability (`common-task-complexity-routing`).

| Condition | Placement |
| --- | --- |
| Coupled sequential reasoning; host permits main-loop implementation | One implementation context, skills loaded progressively |
| Independent, bounded, verifiable slices with disjoint ownership | Concurrent bounded workers, one owner per component |
| Host requires worker execution | That boundary; keep coupled steps in one bounded worker, not a planner/fixer chain |
| Isolation or permission needed but unavailable | Report the operation unsupported or blocked; never infer permission |

One implementation context is not one actor for the lifecycle: main-loop implementation still requires a separate reviewer, and a single worker still requires independent review.

- Record the decision with its named benefit, or the host requirement that forced it. Reuse an approach the plan already records; do not re-ask.
- Missing required approval, packet, standards, or isolation stops only the affected operation. Report the exact missing item; do not infer permission or silently change the execution path.
- Plan approval authorizes neither merge, deployment, premium spend, nor a different execution mode.

## 2. Lifecycle

Report current state with read-only `status --state <PATH> --revision <REV> --dirty-identity <ID> --format json|markdown`; it rechecks plan/evidence bytes and never mutates state. Checkpoint completion is not verification, acceptance, or release.

| Operation | Required evidence |
| --- | --- |
| prepare | Standalone packet: assignment manifest, task text, authority, invariants, owner, owned paths, required standards with revision, ACs, verification, source/dependency identities |
| dispatch | One implementation owner per slice; authority and data eligibility checked before any task context is sent |
| completion | Terminal state reported by the host, not inferred from silence or elapsed time |
| resume | Same task, same authority, same owned paths; a new task is a fresh dispatch |
| cancel | Reported as cancelled/stopped; never as completed or verified |
| receipt | Operation, task/actor/revision, terminal state, evidence, limitations |
| verify acceptance | Independent reviewer, separate from the implementer, against ACs and evidence |

Host instructions bind these operations to native invocation; canonical text names semantics only. If a required operation or permission control is unavailable on the host surface, report the affected operation unsupported; do not claim success. Dispatch, sequencing and recovery detail: [Methodology](references/methodology.md).

## 3. Task Loop
1. **Select placement and prepare:** Apply Section 1 and record the decision. Record `BASE=$(git rev-parse HEAD)`. Generate the packet with `task_brief.py <PLAN_FILE> <TASK_NUMBER> --assignment <ASSIGNMENT_JSON> --out <BRIEF_FILE>`. The assignment manifest is required; never dispatch a bare task section.
2. **Execute or dispatch:** One implementer per task when the placement decision requires it; otherwise execute the slice in the recorded single context. The packet, not repeated prose, carries authority and acceptance.
3. **Yield:** Wait for a completion notification; never poll status in a loop.
4. **Review:** Generate the scoped cumulative package from `$BASE` and the owned paths. Dispatch an independent reviewer with brief, report and package. Implementer self-review never satisfies this gate.
5. **Fix:** Re-prompt the same worker with concrete failed ACs; regenerate the cumulative package and re-review against cumulative state.
6. **Integrate:** Orchestrator verifies the diff, runs required covering checks, and commits.

## 4. Failure-Specific Recovery

| Observed failure | Route |
| --- | --- |
| Missing prerequisite/context | `needs_context` or `blocked` with the exact missing item; no fallback |
| Defective output | One corrective assignment naming the failed AC and expected result |
| Observed provider exhaustion | Only an eligible, authorized fallback; the receipt records the exhaustion evidence and selected route |
| Consequential safety/design issue | Human decision |

Retry count alone never authorizes premium. Timeout and cancellation are not completion. Required human approvals remain external to agent verdicts.

## 5. Final Review and Evidence

Run whole-branch review on a capable host hint, then complete the branch. Before deleting the workspace, archive packets, reports, immutable review snapshots and verification receipts at durable references; cleanup must not invalidate handoff links.

## Anti-Patterns
- **No worker commits**: workers leave changes; the orchestrator commits.
- **No recursive delegation**: workers do not spawn agents.
- **No self-approval**: implementer verdicts do not satisfy independent review.
- **No agent per stage**: a workflow stage, specialist label, or file count never justifies a new agent; no named benefit, no dispatch.
- **No polling loops**: yield until a completion event.
- **No fabricated savings or enforcement claims**: prompt text is not a sandbox, and savings need complete measured coverage.

## References
[Methodology & Gates](references/methodology.md) · [Prompt Templates](references/templates.md) · [Progress Receipts](references/progress-receipts.md) · [Capability & Effort Resolution](../common-task-complexity-routing/references/routing-table.md#capability-and-effort-resolution)
