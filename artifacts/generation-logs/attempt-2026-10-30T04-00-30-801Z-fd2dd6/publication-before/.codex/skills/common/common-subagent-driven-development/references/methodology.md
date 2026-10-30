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

---

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

1. **Select placement**
   - Apply Section 1 and record the decision in the task artifact before preparing a packet.
   - A single-context placement still needs the same packet, owned paths, ACs and review gate.
2. **Prepare the packet**
   - Record baseline: `BASE=$(git rev-parse HEAD)`.
   - From the repository root: `python3 skills/common/common-subagent-driven-development/scripts/task_brief.py <PLAN_FILE> <TASK_NUMBER> --assignment <ASSIGNMENT_JSON> --out <BRIEF_FILE>`.
   - The explicit assignment manifest is required. Do not dispatch a bare extracted task section or infer authority from plan prose.
3. **Dispatch one worker, when placement requires it**
   - One non-overlapping implementation owner per slice.
   - Worker owns bounded implementation and focused checks on touched files. Worker does not commit, recursively delegate, or run full suites by default.
4. **Yield, do not poll**
   - Request a completion notification and yield control. Repeated status polling only replays growing context; it adds no lifecycle information.
5. **Scoped independent review**
   - Generate a cumulative package from `$BASE` over the worker's exact owned paths:
     `python3 skills/common/common-subagent-driven-development/scripts/review_package.py <PLAN_FILE> $BASE WORKSPACE --paths <OWNED_PATHS...>`.
   - Use explicit literal paths or bounded owned directories; no globs, pathspec magic, or `.`.
   - Dispatch a reviewer with separate context and ownership. Implementer self-review and implementer verdicts cannot satisfy this gate, including when the implementer ran in the main loop.
6. **Fix loop**
   - Resume the same worker with concrete failed ACs. Retry count alone never authorizes premium or a wider scope.
   - Regenerate the cumulative package from the original `$BASE` and identical owned paths; re-review open findings against the latest cumulative state, not a fix-only delta.
7. **Integrate**
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
Dispatch an independent senior reviewer; this whole-branch gate remains after any placement choice, including entirely main-loop execution. Before deleting `<workspace>`, archive required packets, reports, immutable review snapshots, receipts and verification evidence at durable references; cleanup must not invalidate handoff links. Then complete the branch.
