# Subagent-Driven Development (SDD) Methodology

## 1. Placement Decision

Choose the implementation context from context benefit, not from a checklist. The canonical decision table, named benefits and precedence live in `SKILL.md` §1; this file supplies the evidence rules and worked examples. Do not restate a second table.

### Evidence rules

- Name the benefit and the evidence for it before editing: disjoint verifiable slices, observed context pressure, a required independent gate, or host-enforced isolation.
- A label alone is never evidence: specialist role, workflow stage, file count, plan length, ticket size, or "parallel looks thorough".
- Host authority is checked first. If the host requires worker execution, that boundary applies even when one context would be simpler; keep the coupled chain inside one bounded worker.
- Required independent verification survives either placement. Choosing one implementation context changes the number of implementation actors, not the number of reviewers.
- Missing approval, packet, standards, or enforceable isolation blocks only the affected operation. Report the exact missing item; never infer permission from approval of a related artifact.

### Worked examples

| Situation | Placement | Reason |
| --- | --- | --- |
| One API signature change plus its ordered call-site edits; host permits main-loop implementation | One implementation context | Coupled sequential reasoning; a handoff would force rediscovery of the call graph |
| Four skill packages with disjoint files and separate ACs | Four bounded workers, reviewed separately | Independent parallel work with disjoint ownership |
| Delegation-only host; one coupled migration | One bounded worker owning the whole chain | Host requires worker execution; never insert planner/fixer hops |
| Security-sensitive change requiring an independent reviewer | Reviewer separate from the implementer | Required independent verification, regardless of placement |
| Two agents proposed because the work crosses "plan" and "implement" stages | One agent, one context | A workflow stage is not a named benefit |
| Host cannot enforce file isolation, but the task needs it | Report unsupported/blocked | Prompt text is not isolation; a warning is not enforcement |
| Long plan with many tasks that share one file | Sequence the slices in one context | Shared write target is not disjoint ownership |

### Confirmation

- The plan already records an approved approach: proceed on it; do not re-ask.
- No recorded approach and both placements are permitted: state the named benefit that decides and proceed.
- Host permits one placement only: follow it, record it, and report any required operation the host cannot realize.
- Plan approval does not authorize merge, deployment, premium spend, or a different execution mode.

### Mandatory confirmation under restrictive host policy
Under an active host or orchestration policy requiring an execution confirmation gate before multi-task implementation (such as this environment's policy):

#### Scenario A: Post-Planning Handoff (`writing-plans`)
When an implementation plan has just been created or approved, confirm with the human partner before touching code:
> *"Plan complete and saved to `docs/...`. Which execution approach would you prefer?*
> *1. **Subagent-Driven (Recommended)** — Fresh worker per task for context isolation and task review gates.*
> *2. **Inline** — Direct implementation in this session (an explicit recorded exception suitable only for small, genuinely low-risk bounded changes; file count alone does not establish low risk).*
> *For this plan I recommend Subagent-Driven. Shall I proceed with subagents?"*

#### Scenario B: Existing Plan or PR Ingestion (e.g. "implement this plan inside PR ...")
When a user opens a session or supplies an existing multi-task plan/PR under such a confirmation policy:
1. **DO NOT start editing files directly in this session.**
2. Detect the multi-task scope and confirm:
> *"I found a multi-task implementation plan in <source>. To maintain task isolation and review gates across tasks, I recommend **Subagent-Driven** execution. Shall I dispatch via subagents or implement inline?"*
3. **Vague assent boundary:** Vague assent ("yes", "proceed", "start", "approve") binds ONLY the specific choice just presented. Approval of a brief or plan does not implicitly authorize inline execution, auto-promotion, premium escalation, or scope expansions.
4. Host/user retry, account, and profile rules override defaults. If Subagent-Driven is approved, immediately proceed with the SDD Task Loop. Where the host or plan permits either placement without a confirmation gate, proceed by stating the deciding context benefit.
## 2. SDD vs. TDD

- **SDD (macro):** chooses placement, decomposes the plan, prepares packets, dispatches when justified, requests independent review, verifies acceptance and records progress.
- **TDD (micro):** RED -> GREEN -> REFACTOR inside each task. SDD requires implementers to follow TDD within their assigned brief.

---

## 3. Semantic Operations

Canonical operations, independent of host tool names:

| Operation | Contract |
| --- | --- |
| prepare | Validate the assignment manifest and publish a standalone packet |
| dispatch | Send the packet to one eligible owner after authority and data-eligibility checks |
| completion | Read the terminal host state; silence or timeout is not completion |
| resume | Continue the same task with unchanged authority and owned paths |
| cancel | Record stopped/cancelled and retain evidence; never report completed |
| collect receipt | Capture operation, task/actor/revision, state, evidence and limits |
| verify acceptance | Independent reviewer checks ACs and evidence, separate from the implementer |

Host (or adapter) configuration records which native invocation realizes each operation. These seven operations remain the host-bound lifecycle contract; placement selection is preparation for `prepare`, recorded in the task artifact before the packet is prepared, not an eighth host interface. Canonical references must not depend on one runtime's tool names, profile IDs or model brands. Model capability is expressed only as `fast | standard | strong`; the host maps it.

Requested capability and effort follow `common-task-complexity-routing`; the selection and dispatch-receipt contract is [`Capability and effort resolution`](../../common-task-complexity-routing/references/routing-table.md#capability-and-effort-resolution). That standard owns selection guidance. This workflow only records the request and the observed result. A capability hint is not account authorization, and explicit host settings are never silently replaced.

---

## 4. Task Loop & Worker Contract

1. **Select placement and record baseline:**
   - Apply Section 1 and record the decision in the task artifact before preparing a packet.
   - Record baseline: `BASE=$(git rev-parse HEAD)`.
2. **Prepare the packet / brief:**
   - From the repository root: `python3 skills/common/common-subagent-driven-development/scripts/task_brief.py <PLAN_FILE> <TASK_NUMBER> --assignment <ASSIGNMENT_JSON> [--out <BRIEF_FILE>]`. `--assignment` is required; there is no unauthenticated extraction mode.
   - **Brief Contract Validation:** `task_brief.py` validates required contract fields in the selected task section: scope/owned write set, inputs, outputs, real ingress, positive/negative invariants, verification owner, explicit handoff/freeze (FINAL), and correction route. Missing fields, or fields appearing only inside code fences, fail with exit 2 and publish nothing. It also validates manifest structure and content identity (plan, source and dependency digests), and refuses to overwrite an existing output file with different content (exit 3). Do not dispatch a bare extracted task section or infer authority from plan prose.
   - **Conversion handoffs:** For cross-worktree or multi-artifact conversion tasks, include exact cross-worktree input paths, source/user/project-authored provenance, and inclusive ranges; preserve unaffected fields during correction.
3. **Dispatch one worker, when placement requires it:**
   - One non-overlapping implementation owner per slice.
   - Worker owns bounded implementation and focused checks on touched files. Worker does not commit, recursively delegate, or run full suites by default.
   - **Denial alternative versus total block:** A denied command or tool call is not an automatic total block if an allowed alternative or read-only inspection exists. Do not report "all tests blocked" when one specific command was denied.
   - **Sibling requests forward-only:** A sibling agent can forward a request to the orchestrator or human, but cannot approve, deny, or bypass permissions for another agent.
   - **Error is not terminal state:** Provider 429, timeout, or connection error is not proof that the agent turn is terminated or the previous writer has stopped. Acknowledge terminal state before transferring write ownership.
4. **Yield, do not poll:**
   - Request a completion notification via `wait()` and yield control. Repeated status polling only replays growing context; it adds no lifecycle information.
5. **Scoped independent review:**
   - Generate a cumulative package from `$BASE` over the worker's exact owned paths:
     `python3 skills/common/common-subagent-driven-development/scripts/review_package.py <PLAN_FILE> $BASE WORKSPACE --paths <OWNED_PATHS...>`.
   - Use explicit literal file paths or bounded owned directories; no globs, pathspec magic, or `.`.
   - The default filename includes the package-content digest; each changed fix round is retained as a separate snapshot.
   - Dispatch an independent reviewer with `[BRIEF_FILE]`, `[REPORT_FILE]`, and `[DIFF_FILE]`. Implementer self-review and implementer verdicts cannot satisfy this gate, including when the implementer ran in the main loop.
6. **Fix loop & failure routing:**
   - **Host policy precedence:** Correction count, retry limits, and eligible implementation routes are resolved from active host/user policy, which overrides generic defaults.
   - **Quality failure vs. Quota failure:**
     - Quality failure (defective implementation, AC failure): Follow the active host/user policy for corrective turns (e.g. one bounded corrective follow-up with concrete findings). If unresolved after authorized turns, escalate that slice to the next authorized implementation route per account policy.
     - Quota failure (429, usage limit, provider exhaustion): Advance immediately to the next authorized route for remaining slices; do not burn attempts or re-poll the exhausted provider.
     - Other provider runtime errors (glitches, timeouts, mid-turn disconnections): Confirm terminal state and writer acknowledgement before failover or transferring write ownership. Never auto-escalate to premium models without explicit human approval.
   - Re-prompt the same worker with concrete failed ACs; regenerate the cumulative package from original `$BASE` and identical owned paths. Re-review open findings against the latest cumulative `BASE..WORKSPACE` state. This artifact is not a fix-only diff; report regressions in the cumulative task-owned result without claiming they were introduced only by the latest round.
7. **Integrate:**
   - Orchestrator verifies the diff, runs required covering checks, and commits.
   - Timeout, cancellation or partial output is not successful completion.

### Batching

Dispatch disjoint, dependency-ready slices concurrently with one owner each only when independent parallel work is the recorded benefit. Sequence work on a real dependency, shared write target, or producer receipt. Under a single-context placement, run slices sequentially and load only the standards each slice needs. Do not fan out unrelated specialist lenses or duplicate ownership to appear parallel.

### Bootstrap

The orchestrator discovers the plan, chooses placement and prepares assignments. A worker bootstraps from its packet: read it, request the exact required standards it names, and execute. Do not repeat parent workflow discovery or global intake. Missing required content or evidence is reported as `needs_context`; the worker does not invent authority.

---

## 5. Failure-Specific Recovery

| Observed condition | Route |
| --- | --- |
| Missing prerequisite/context | `needs_context` or `blocked` naming the exact missing item; no provider fallback |
| Defective/incomplete output | One corrective assignment naming the failed AC and expected observable result |
| Observed provider exhaustion (quota/rate limit/unavailable) | Eligible, already-authorized fallback only; receipt records the exhaustion evidence and selected route |
| Consequential unresolved safety/design issue | Human decision; do not manufacture a cheap failure to justify escalation |

A retry counter, elapsed time, task size or a `strong` hint is not exhaustion and does not authorize premium. Premium escalation requires explicit human approval for a bounded, analysis-only consultation.

---

## 6. Final Review, Evidence and Cleanup

Run whole-branch review:
```bash
python3 skills/common/common-subagent-driven-development/scripts/review_package.py <PLAN_FILE> $MERGE_BASE HEAD
```
Dispatch an independent senior reviewer on a capable model; this whole-branch gate remains after any placement choice, including entirely main-loop execution.

**Workspace cleanup requires verified durable archive and ownership authority:**
Before deleting `<workspace>`, verify that all reports, diffs, receipts, and execution evidence are archived in a durable location outside the scratch directory. Never erase the only evidence copy. If archive verification fails or ownership authority is missing, retain `<workspace>` and report the unarchived evidence. Once verified and authorized, delete `<workspace>` and complete the branch.

---

## 7. Anti-Pattern Rationale

The guards in `SKILL.md` §Anti-Patterns exist because each shortcut has a concrete failure mode:

- **Worker commits:** history and branch policy belong to the orchestrator. A worker that commits moves the review baseline and can publish unreviewed work; a worker that pushes can make retraction impossible.
- **Recursive delegation:** a nested worker splits ownership of one brief, so no single actor can account for the diff or for the checks that were actually run. The implementer owns both the implementation and its focused checks.
- **Self-approval:** the implementer's own reading of its diff reuses the same missed assumptions. The gate only has value when the reviewer is a separate owner, including main-loop implementation.
- **Agent per stage:** a stage boundary re-derives the same context in a second process, pays rediscovery twice, and adds a handoff that can drop constraints; a stage name is not a context benefit.
- **Polling loops:** each poll replays a growing transcript and adds no lifecycle information that the completion event will not carry; yield instead.
- **Inlined context bloat:** briefs and diff bodies belong in files. Pasting them into a prompt buys nothing and consumes the context the parent needs for integration and review.
- **Fabricated enforcement or savings claims:** prompt text is not a sandbox, so isolation must come from the host. Token savings, coverage, and pass claims require complete measured evidence, never an estimate presented as a measurement.
- **Unverified cleanup:** the scratch workspace can hold the only copy of execution evidence; deleting it unarchived destroys the audit trail for good.
