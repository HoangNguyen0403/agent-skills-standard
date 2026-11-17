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

Choose placement before any edit. Delegate only for a named benefit: independent parallel work over disjoint owned paths verifiable alone; measured context pressure; a required independent verification gate owned by someone other than the implementer; or host-enforced permission isolation, because prompt text is not enforcement. A specialist label, workflow stage, file count, plan length, or "more thorough" fan-out is not a named benefit. Precedence, first match wins: controlling host authority, then required independence or isolation, then coupling and verifiability, then economical eligible capability (`common-task-complexity-routing`).

| Condition | Placement |
| --- | --- |
| Coupled sequential reasoning; host permits main-loop implementation | One implementation context, skills loaded progressively |
| Independent, bounded, verifiable slices with disjoint ownership | Concurrent bounded workers, one owner per component |
| Host requires worker execution | That boundary; keep coupled steps in one bounded worker, not a planner/fixer chain |
| Isolation or permission needed but unavailable | Report unsupported or blocked; never infer permission |

Under an active host or orchestration policy requiring an execution confirmation gate before multi-task implementation:
1. **Execution confirmation gate:** Do not edit files directly in the orchestrator session. Offer Subagent-Driven (Recommended) versus Inline (an explicit recorded exception only for small, genuinely low-risk bounded changes; file count alone does not establish low risk).
2. **Vague assent boundary:** "yes", "proceed", "start", or "approve" binds ONLY the presented choice; it authorizes no inline execution, auto-promotion, premium escalation, or scope expansion. Without explicit host permission for inline work, report the operation unsupported or blocked.
3. **Policy-permitted dual placement:** Where the host permits either placement without a mandatory gate, apply the table above; coupled sequential reasoning stays in one implementation context.
4. Record the decision with its named benefit or the forcing host requirement; reuse a recorded approach instead of re-asking.

One implementation context is not one actor for the lifecycle: main-loop implementation still requires a separate reviewer, so implementer self-review never closes a review gate. Missing approval, packet, standards, or isolation blocks only the affected operation: report the exact missing item, never infer permission or silently change the path. Plan approval authorizes neither merge, deployment, premium spend, nor a different execution mode. Detail: [methodology.md](references/methodology.md#1-placement-decision).

## 2. Lifecycle

Report current state read-only with `status --state <PATH> --revision <REV> --dirty-identity <ID> --format json|markdown`; it rechecks plan and evidence bytes and never mutates state. Checkpoint completion is neither verification, acceptance, nor release.

- **Operations:** prepare -> dispatch -> completion -> resume -> cancel -> receipt -> verify acceptance; host instructions bind each to a native invocation, and canonical text names semantics only. Dispatch one implementation owner per slice after authority and data-eligibility checks; a new task is a fresh dispatch, resume keeps the same task, authority, and owned paths, and cancelled work is reported stopped, never completed or verified. Read terminal state from the host, never from silence or elapsed time; receipts carry operation, task/actor/revision, state, evidence, and limits.
- **Worker checks:** implementers own bounded implementation and focused checks on touched files; they do not commit, recursively delegate, or run full suites by default. A denied call is not a total block while an allowed alternative or read-only inspection exists, and sibling requests are forward-only: forward to the orchestrator or human, never approve or bypass permissions for another agent.
- **Errors and TDD:** a 429, timeout, or disconnect is not proof the turn ended; acknowledge terminal state before transferring write ownership. Implementers run RED -> GREEN -> REFACTOR inside each brief.

## 3. Task Loop

1. **Select placement and prepare:** apply Section 1, record the decision and `BASE=$(git rev-parse HEAD)`. Generate the brief with `task_brief.py`; it validates required contract fields and parsed `Gate / rollback` semantics before publication (exit 2, no packet on invalid input).
2. **Dispatch or execute:** one implementer per task where required; preserve provenance and unaffected fields during correction.
3. **Yield:** request a completion event; never poll.
4. **Review:** before any check/dispatch, load the full `delivery-report.md` Frozen Source Identity procedure. Freeze orchestrator-computed identity/scope digest across literal owned+dependency scope, ignored/untracked and index/worktree records, exact artifact exclusions, resolved BASE/actual HEAD, before/after checks and phase freeze. Mismatch is stale; recheck. Required current observed FAIL short-circuits semantic lenses to CHANGES REQUESTED. Unknown/NOT RUN/stale is a gap, never PASS; static review may continue without readiness. First dispatch only brief, cumulative diff, and receipt; freeze findings/digest before author claims. Reproduction stays static-only unless isolation, no-write shared-worktree boundary, and verifier-owned durable hashed artifacts are verified. See [templates.md](references/templates.md) and [delivery-report.md](references/delivery-report.md).
5. **Fix loop and failure routing:**
   - **Host policy precedence:** correction counts, retry limits, and eligible routes come from active host/user policy, which overrides generic defaults.
   - **Quality failure:** send the authorized corrective follow-up naming the failed ACs; if unresolved, escalate that slice to the next authorized route. Re-prompt the same worker, regenerate from the original `$BASE` with identical owned paths, and re-review the latest cumulative state.
   - **Quota failure:** on observed quota exhaustion (429, usage limit, provider unavailable), advance immediately to the next authorized route; do not burn retries on an exhausted provider.
   - **Other runtime errors:** confirm terminal state and writer acknowledgement before failover or transferring write ownership. Retry count alone never authorizes premium without explicit human approval.
6. **Integrate:** the orchestrator verifies the diff, runs required covering checks, and commits.

Record each dispatch event as its step completes: [Dispatch Observations](references/dispatch-observations.md).
## 4. Failure-Specific Recovery

| Observed failure | Route |
| --- | --- |
| Missing prerequisite or context | `needs_context` or `blocked` naming the exact missing item; no provider fallback |
| Defective output | One corrective assignment naming the failed AC and expected observable result |
| Observed provider exhaustion | Only an eligible, authorized fallback; the receipt records the exhaustion evidence and selected route |
| Consequential safety or design issue | Human decision |

Retry count alone never authorizes premium, timeout and cancellation are not completion, and required human approvals stay external to agent verdicts. Rules and examples: [methodology.md](references/methodology.md#5-failure-specific-recovery).

## 5. Final Review and Evidence

Run whole-branch review from the repository root with `python3 skills/common/common-subagent-driven-development/scripts/review_package.py <PLAN_FILE> $MERGE_BASE HEAD`, dispatch an independent senior reviewer, then complete the branch.
Describe the `delivery-report.json` v1 source/evidence bindings in [delivery-report.md](references/delivery-report.md); `READY` is not authorization.
Before handoff, run `python3 skills/common/common-review-policy/scripts/review_gate.py check --report "$REPORT_JSON" --policy docs/review-policy.md --base "$BASE" --dispatch-receipt "$DISPATCH_RECEIPT"`; freeze the external scope/inventory receipt separately, and record its result (exit 0 means consistency only).

**Cleanup needs a verified durable archive and ownership authority:** before deleting `<workspace>`, verify every report, diff, receipt, and evidence copy is archived outside the scratch directory. Never erase the only evidence copy; if archive verification fails or authority is missing, retain `<workspace>` and report the unarchived evidence. Once verified and authorized, delete `<workspace>`.

## Anti-Patterns

- **No worker commits, recursive delegation, self-approval, or agent-per-stage**: the orchestrator commits; workers do not spawn agents; implementer self-review never satisfies independent review; a workflow stage, specialist label, or file count is never a named benefit.
- **No polling loops, inlined context bloat, or fabricated claims**: yield to a completion event; pass briefs and diffs as file paths; prompt text is not enforcement, and savings need complete measured coverage.
- **No unapproved inline edits under confirmation policy and no inferred authority**: vague assent binds only the presented choice; siblings never approve for each other, and a denial needs a safe-alternative check before a total block. Never delete `<workspace>` without verified durable archival and ownership authority.

## References
[Methodology & Gates](references/methodology.md) · [Prompt Templates](references/templates.md) · [Progress Receipts](references/progress-receipts.md) · [Capability & Effort Resolution](../common-task-complexity-routing/references/routing-table.md#capability-and-effort-resolution)
