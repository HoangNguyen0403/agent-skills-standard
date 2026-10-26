# Subagent-Driven Development (SDD) Methodology

## 1. Execution Confirmation Gate

Confirm with the human partner before touching code in either scenario.

### Scenario A: Post-Planning Handoff (`writing-plans`)

> *"Plan complete and saved to `docs/...`. Which execution approach do you prefer?*
> *1. **Subagent-Driven (Recommended)** — fresh worker per task with review gates.*
> *2. **Inline** — direct implementation in this session, only for a genuinely small, low-risk change explicitly permitted by host policy.*
> *For this plan I recommend Subagent-Driven. Proceed with subagents?"*

### Scenario B: Existing Plan or PR Ingestion

When a user supplies an existing multi-task plan/PR:
1. Do not start editing implementation files in this session unless the host-permitted, genuinely small/low-risk inline exception is selected and recorded; otherwise dispatch bounded workers.
2. Detect the multi-task scope and ask:
> *"I found a multi-task implementation plan in <source>. I recommend **Subagent-Driven** execution for task isolation and review gates. Dispatch via subagents or implement inline?"*
3. If approved, proceed with the task loop.

### Inline Exception Rule

Inline is a recorded exception, not a default fallback:
- Require explicit host policy permission and a bounded, genuinely low-risk change.
- Record the permitting policy, scope and rationale in the task artifact.
- A plan approval, absent nesting support, or an unanswered question does not authorize inline execution.
- Do not mirror the same plan into both inline and subagent paths; the recorded decision resolves which one applies. Once the inline exception is selected and recorded, it replaces the dispatch-only prohibition for that bounded scope; the two branches never apply simultaneously.

---

## 2. SDD vs. TDD

- **SDD (macro):** decomposes the plan, prepares packets, dispatches workers, requests independent review, verifies acceptance and records progress.
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

Host (or adapter) configuration records which native invocation realizes each operation. Canonical references must not depend on one runtime's tool names, profile IDs or model brands. Model capability is expressed only as `fast | standard | strong`; the host maps it.

---

## 4. Task Loop & Worker Contract

1. **Prepare the packet**
   - Record baseline: `BASE=$(git rev-parse HEAD)`.
   - From the repository root: `python3 skills/common/common-subagent-driven-development/scripts/task_brief.py <PLAN_FILE> <TASK_NUMBER> --assignment <ASSIGNMENT_JSON> --out <BRIEF_FILE>`.
   - The explicit assignment manifest is required. Do not dispatch a bare extracted task section or infer authority from plan prose.
2. **Dispatch one worker**
   - One non-overlapping implementation owner per slice.
   - Worker owns bounded implementation and focused checks on touched files. Worker does not commit, recursively delegate, or run full suites by default.
3. **Yield, do not poll**
   - Request a completion notification and yield control. Repeated status polling only replays growing context; it adds no lifecycle information.
4. **Scoped independent review**
   - Generate a cumulative package from `$BASE` over the worker's exact owned paths:
     `python3 skills/common/common-subagent-driven-development/scripts/review_package.py <PLAN_FILE> $BASE WORKSPACE --paths <OWNED_PATHS...>`.
   - Use explicit literal paths or bounded owned directories; no globs, pathspec magic, or `.`.
   - Dispatch a reviewer with separate context and ownership. Implementer self-review and implementer verdicts cannot satisfy this gate.
5. **Fix loop**
   - Resume the same worker with concrete failed ACs. Retry count alone never authorizes premium or a wider scope.
   - Regenerate the cumulative package from the original `$BASE` and identical owned paths; re-review open findings against the latest cumulative state, not a fix-only delta.
6. **Integrate**
   - Orchestrator verifies the diff, runs required covering checks, and commits.
   - Timeout, cancellation or partial output is not successful completion.

### Batching

Dispatch disjoint, dependency-ready slices concurrently with one owner each. Sequence work only on a real dependency, shared write target, or producer receipt. Do not fan out unrelated specialist lenses or duplicate ownership to appear parallel.

### Bootstrap

The orchestrator discovers the plan and prepares assignments. A worker bootstraps from its packet: read it, request the exact required standards it names, and execute. Do not repeat parent workflow discovery or global intake. Missing required content or evidence is reported as `needs_context`; the worker does not invent authority.

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
Dispatch an independent senior reviewer. Before deleting `<workspace>`, archive required packets, reports, immutable review snapshots, receipts and verification evidence at durable references; cleanup must not invalidate handoff links. Then complete the branch.
