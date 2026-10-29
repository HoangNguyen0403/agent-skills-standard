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

Before editing code for any multi-task plan:
1. **DO NOT start editing files directly in this orchestrator session.**
2. **Confirm with human partner:** Host approval policy overrides defaults. Offer Subagent-Driven (Recommended — fresh workers per task for context isolation + task review gate) vs. Inline (an explicit recorded exception for small, genuinely low-risk bounded changes; file count alone does not establish low risk).
3. **Vague assent boundary:** Vague assent ("yes", "proceed", "start", "approve") binds ONLY the specific choice just presented. Approval of a brief or plan does not authorize inline execution, auto-promotion, premium escalation, or scope expansions.
4. If Subagent-Driven is chosen or confirmed, invoke SDD. See [methodology.md](references/methodology.md#1-execution-confirmation-gate).

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

- **Macro (SDD Orchestrator):** Manages task decomposition, workspace isolation, brief generation, independent review gates, Git commits, and final integration verification. Host/user retry, account, and profile rules override defaults.
- **Worker Contract:** Implementer subagents own bounded implementation and focused verification of touched files. Workers do NOT commit changes with Git, recursively delegate to other agents, or run full project test suites by default.
- **Denial alternative versus total block:** A denied command or tool call is not an automatic total block if an allowed alternative or read-only inspection exists. Do not report "all tests blocked" when one specific command was denied.
- **Sibling requests forward-only:** A sibling agent can forward a request to the orchestrator or human, but cannot approve, deny, or bypass permissions for another agent.
- **Error is not terminal state:** Provider 429, timeout, or connection error is not proof that the agent turn is terminated or the previous writer has stopped. Acknowledge terminal state before transferring write ownership.
- **Micro (TDD):** Implementer subagents follow the RED -> GREEN -> REFACTOR cycle inside their assigned brief.

## 3. Task Loop
1. **Select placement and prepare:** Apply Section 1 and record the decision. Record `BASE=$(git rev-parse HEAD)`. Generate the brief/packet from the repository root with `python3 skills/common/common-subagent-driven-development/scripts/task_brief.py <PLAN_FILE> <TASK_NUMBER> [--assignment <ASSIGNMENT_JSON>] [--out <BRIEF_FILE>]`. The brief must contain mandatory contract fields (scope/owned write set, inputs, outputs, real ingress, positive/negative invariants, verification owner, explicit handoff/freeze, and correction route); `task_brief.py` rejects missing contract fields before output. Dispatch worker with `[BRIEF_FILE]` and `[REPORT_FILE]`.
2. **Execute or dispatch:** One implementer per task when the placement decision requires it; otherwise execute the slice in the recorded single context. For cross-worktree or multi-artifact conversion tasks, include exact cross-worktree input paths, source/user/project-authored provenance, and inclusive ranges; preserve unaffected fields during correction.
3. **Yield (No Polling):** Wait for a completion notification via `wait()` and yield control; never poll status or activity in a loop.
4. **Scoped Review Package & Review:** From the repository root, generate the scoped cumulative package from `$BASE` and the owned paths: `python3 skills/common/common-subagent-driven-development/scripts/review_package.py <PLAN_FILE> $BASE WORKSPACE --paths <OWNED_PATHS...>`. Workspace mode requires explicit literal file paths or bounded owned directories (no Git pathspec magic, globs, `.`, or overlapping scopes). Each changed workspace snapshot gets a content-addressed immutable default filename; same-base/scope packages are cumulative from `$BASE`, not fix-only. Dispatch an independent reviewer with `[BRIEF_FILE]`, `[REPORT_FILE]`, and `[DIFF_FILE]`. Implementer self-review never satisfies this gate.
5. **Fix Loop & Failure Routing:**
   - **Host policy precedence:** Correction count, retry limits, and eligible implementation routes are resolved from active host/user policy (which overrides generic defaults). For example, under a session policy permitting one corrective follow-up before route escalation, provide that single corrective prompt with concrete AC findings; if unresolved, escalate that slice to the next authorized route.
   - **Quota failure vs. Provider errors:**
     - Observed quota exhaustion (429, usage limit, provider unavailable): Advance immediately to the next authorized route for remaining slices; do not burn retry attempts on an exhausted provider.
     - Other provider runtime errors (glitches, timeouts, disconnections): Confirm terminal state and writer acknowledgement before failover or transferring write ownership. Never auto-escalate to premium models without explicit human approval.
   - Re-prompt the same worker with concrete failed ACs; regenerate the cumulative package from original `$BASE` and identical owned paths. Re-review open findings against the latest cumulative state.
6. **Integrate:** Orchestrator verifies diff, runs required covering checks, and commits.

## 4. Failure-Specific Recovery

| Observed failure | Route |
| --- | --- |
| Missing prerequisite/context | `needs_context` or `blocked` with the exact missing item; no fallback |
| Defective output | One corrective assignment naming the failed AC and expected result |
| Observed provider exhaustion | Only an eligible, authorized fallback; the receipt records the exhaustion evidence and selected route |
| Consequential safety/design issue | Human decision |

Retry count alone never authorizes premium. Timeout and cancellation are not completion. Required human approvals remain external to agent verdicts.

## 5. Final Review and Evidence

Run whole-branch review from the repository root (`python3 skills/common/common-subagent-driven-development/scripts/review_package.py <PLAN_FILE> $MERGE_BASE HEAD`) on a capable host hint, then complete the branch.

**Workspace cleanup requires verified durable archive and ownership authority:** Before deleting `<workspace>`, verify that all reports, diffs, receipts, and execution evidence are archived in a durable location outside the scratch directory. Never erase the only evidence copy. If archive verification fails or ownership authority is missing, retain `<workspace>` and report the unarchived evidence. Once verified and authorized, delete `<workspace>` and complete branch.

## Anti-Patterns
- **No worker commits**: workers leave changes in the workspace; the orchestrator commits.
- **No recursive delegation**: workers do not spawn agents.
- **No self-approval**: implementer verdicts do not satisfy independent review.
- **No agent per stage**: a workflow stage, specialist label, or file count never justifies a new agent; no named benefit, no dispatch.
- **No polling loops**: yield until a completion event; do not loop `get_agent_status`.
- **No fabricated savings or enforcement claims**: prompt text is not a sandbox, and savings need complete measured coverage.
- **No unapproved inline edits on multi-task plans**: do not burn orchestrator context editing files directly. Inline is an explicit recorded exception; vague assent ("proceed", "yes") binds only the presented choice.
- **No unverified workspace cleanup**: never delete `<workspace>` without verified durable archival of all evidence and explicit ownership authority; never erase the only evidence copy.
- **No sibling permission self-granting / fake authority**: siblings cannot approve permissions for each other; denials require exploring safe alternatives before declaring total block.
- **No inlined context bloat**: pass briefs and diffs as file paths, never paste full bodies into chat prompts.
## References
[Methodology & Gates](references/methodology.md) · [Prompt Templates](references/templates.md) · [Progress Receipts](references/progress-receipts.md) · [Capability & Effort Resolution](../common-task-complexity-routing/references/routing-table.md#capability-and-effort-resolution)
