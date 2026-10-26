# Review package: 92d06c420f6a41f08e11579423e4e3eacdb7880d..WORKSPACE (cumulative uncommitted snapshot)

## Scope
- .agents/workflows/implement-feature.md
- skills/common/common-subagent-driven-development

## Files changed
.agents/workflows/implement-feature.md             |  16 +-
 .../common-subagent-driven-development/SKILL.md    |  66 +++----
 .../evals/evals.json                               | 190 +++++++++++++++++++--
 .../references/methodology.md                      |  70 ++++----
 .../references/progress-receipts.md                |   9 +
 .../references/templates.md                        |  15 +-
 6 files changed, 283 insertions(+), 83 deletions(-)

## Diff
diff --git a/.agents/workflows/implement-feature.md b/.agents/workflows/implement-feature.md
index 22d2c53d..37887a18 100644
--- a/.agents/workflows/implement-feature.md
+++ b/.agents/workflows/implement-feature.md
@@ -1,42 +1,44 @@
 ---
-description: Implement an approved feature plan with fresh-context slices, TDD, revision-bound evidence, and PR-ready output.
+description: Implement an approved feature plan with benefit-based placement, TDD, revision-bound evidence, and PR-ready output.
 ---
 
 # Implement Feature Workflow
 
 Goal: Build an approved feature through bounded TDD slices and route settled work to verification.
 
 ## Steps
 
 1. **Load plan**: Find matching PRD/ticket, SRS/FRS, implementation plan, REQ/AC trace, and skills. Ask if target is ambiguous; route missing trace/test lanes to `plan-feature`, `design-solution`, or `implementation-readiness`. Carry `snc_tier`/`model_tier`; high tier adds `specialist-architecture-guard` and `specialist-security-reviewer` before `verify-work`.
 2. **Prepare workspace**: Confirm clean or intentional dirty state; create a branch/worktree only when expected. Provision lockfile dependencies before tests. Report install failures exactly; never claim skipped checks passed.
-3. **Bound ownership**: Assign each slice one owner, exact files, goal/deliverable, in/out scope, authority, REQ/AC IDs, required standards, and verification receipt. Prepare a standalone assignment packet; a slice must not depend on inferred plan-level authority.
+3. **Bound ownership**: Assign each slice one owner; the recorded implementation context may own several coupled slices. Record exact files, goal/deliverable, in/out scope, authority, REQ/AC IDs, required standards, and verification receipt. Prepare a standalone assignment packet; a slice must not depend on inferred plan-level authority.
 4. **Implement slices**:
-   - Dispatch one owner per disjoint, dependency-ready slice; sequence only real dependencies. Worker bootstrap reads its packet and requests only the exact standards it names; do not repeat parent workflow discovery or global intake.
+   - Apply the canonical placement decision in `common-subagent-driven-development` §1 before editing: delegate only for a named benefit or a host requirement. Coupled sequential work under a host that permits main-loop implementation stays in one implementation context.
+   - Dispatch one owner per disjoint, dependency-ready slice with a recorded benefit; sequence only real dependencies. Worker bootstrap reads its packet and requests only the exact standards it names; do not repeat parent workflow discovery or global intake.
    - Record observable contract, distinct fault, smallest honest layer, minimal cases, and exact focused command before testing.
    - Write/update the failing test first; observe expected RED before implementation. Characterize legacy behavior only when needed.
    - Implement the smallest passing change; refactor without scope expansion.
    - Run focused checks foreground, single-run, sequentially, with no peer mutation; classify invalid RED, unexpected GREEN, timeout, or infrastructure failure.
    - Keep concise revision-bound receipts: changed contract, RED/GREEN evidence, behavior smoke, command/result, and limitations.
-5. **Independent review**: Review each slice in a separate owner/context against its ACs and evidence. Implementer self-review does not satisfy this gate. Record review mode, open findings, and the settled revision.
+5. **Independent review**: Review each slice in a separate owner/context against its ACs and evidence. Implementer self-review does not satisfy this gate, whether the implementer ran in the main loop or in a worker. Record review mode, open findings, and the settled revision.
 6. **Recover by cause**: Missing prerequisite → report `needs_context`/`blocked` with the exact item. Defective output → one corrective assignment naming the failed AC. Observed provider exhaustion → only an eligible, already-authorized fallback, with the evidence recorded. Consequential safety/design issue → human decision. Retry count alone never authorizes premium.
 7. **Preserve context**: Carry decisions, owner, active slice, and evidence links in the task/plan artifact. Summarize logs; keep source artifacts retrievable. Archive required packets, reports, and receipts at durable references before workspace cleanup.
-8. **Settle before shared checks**: Every owner pauses edits and reports a settled revision. Run one final covering gate, including behavior smoke, foreground/sequentially with no peer mutation. Later edits invalidate affected evidence; rerun those gates and never weaken checks. A cancelled or timed-out run is not a pass.
+8. **Settle before shared checks**: Every owner pauses edits and reports a settled revision. Run one final covering gate, including behavior smoke, foreground/sequentially with no peer mutation. Then run the whole-branch independent review; it is required regardless of placement. Later edits invalidate affected evidence; rerun those gates and never weaken checks. A cancelled or timed-out run is not a pass.
 9. **Handoff**: Report final gate/smoke receipts and update REQ/AC trace and walkthrough evidence. Continue only within recorded authority; route to `verify-work`.
 
 ## Runtime Contract
 
 - Use for approved plans ready to build; TDD, bounded ownership, revision-bound evidence, independent review.
 - Required inputs: PRD/ticket with stable REQ/AC trace, owner, and required SRS/test lanes.
-- Subagent-Driven is the default for multi-task plans. Inline execution is a recorded exception only where host policy explicitly permits it and the change is genuinely small and low risk; a plan approval or missing nesting support does not grant it.
-- Return BLOCKED only when required trace, owner, or test lanes are missing.
+- Choose placement per `common-subagent-driven-development` §1: delegate only for a named benefit or a host requirement. Plan approval does not authorize merge, deployment, premium spend, or a different execution mode.
+- Required independent review and the final whole-branch review survive either placement; missing nesting support or missing isolation stops only the affected operation.
+- Return `needs_context` or `blocked` when required trace, owner, test lanes, authority, required standards, or enforceable isolation are missing.
 
 ## Handoff Payload
 
 - `slug`, carried `operator_profile`, `snc_tier`, `model_tier`, completed slices, tests run, changed contracts, requirement trace, delegation packets, risks, outcome report, next workflow.
 - Carry `repository_status` and `activation_status` separately; include authorized next action, settled revision, and evidence links. Publication approval does not grant deployment authority.
 
 ## Blocking Questions
 
 - Ask max 3 only when an answer changes the result or safety boundary; include a recommended default and 2-3 options.
 
diff --git a/skills/common/common-subagent-driven-development/SKILL.md b/skills/common/common-subagent-driven-development/SKILL.md
index 08bf9945..8791194d 100644
--- a/skills/common/common-subagent-driven-development/SKILL.md
+++ b/skills/common/common-subagent-driven-development/SKILL.md
@@ -1,13 +1,13 @@
 ---
 name: common-subagent-driven-development
-description: Execute multi-task implementation plans by dispatching one bounded implementer per task with independent review gates. Use when implementing plans, executing multi-task PRs, or transitioning from planning to implementation.
+description: Execute an approved implementation plan at the context boundary that preserves required independence and review. Use when implementing plans, executing multi-task PRs, choosing between main-loop and dispatched execution, or transitioning from planning to implementation.
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
@@ -20,80 +20,80 @@ metadata:
     - start implementation
     - plan implementation
     - subagent driven
     - multi-task implementation
     - sdd
 ---
 # Subagent-Driven Development (SDD)
 
 ## **Priority: P1 (HIGH)**
 
-Execute a multi-task plan through one bounded implementer per task, an independent review after each task, and a whole-branch review at the end.
+Execute a multi-task plan with one implementation owner per slice, independent review after each task, and whole-branch review before completion.
 
-## 1. Execution Gate and Inline Exception
+## 1. Placement Decision
 
-Before editing code for any multi-task plan:
-1. Do not make implementation edits in the orchestrator session unless the Inline exception in step 3 has been selected and recorded; otherwise dispatch a bounded worker.
-2. Confirm the approach: Subagent-Driven (recommended) vs. Inline. Record the decision.
-3. Inline is allowed only when host policy explicitly permits it and the change is genuinely small and low risk. Record the permitting policy and the bounded scope; that recorded branch then authorizes direct orchestrator edits within it. A plan approval, silence, or missing host support does not grant inline permission.
+Choose placement before any edit. Delegate only when at least one named benefit applies: independent parallel work over disjoint owned paths that are verifiable alone; measured context pressure such as observed truncation, lost constraints, or replay cost; a required independent verification gate that must be a separate owner from the implementer; or real host-enforced permission isolation, meaning the host enforces the boundary because prompt text is not enforcement. A specialist label, another workflow stage, file count, plan length, or "more thorough" fan-out is not a named benefit.
 
-## 2. Semantic Lifecycle
+Precedence, first match wins: controlling host authority, then required independence or isolation, then coupling and verifiability, then economical eligible capability (`common-task-complexity-routing`).
+
+| Condition | Placement |
+| --- | --- |
+| Coupled sequential reasoning; host permits main-loop implementation | One implementation context, skills loaded progressively |
+| Independent, bounded, verifiable slices with disjoint ownership | Concurrent bounded workers, one owner per component |
+| Host requires worker execution | That boundary; keep coupled steps in one bounded worker, not a planner/fixer chain |
+| Isolation or permission needed but unavailable | Report the operation unsupported or blocked; never infer permission |
+
+One implementation context is not one actor for the lifecycle: main-loop implementation still requires a separate reviewer, and a single worker still requires independent review.
+
+- Record the decision with its named benefit, or the host requirement that forced it. Reuse an approach the plan already records; do not re-ask.
+- Missing required approval, packet, standards, or isolation stops only the affected operation. Report the exact missing item; do not infer permission or silently change the execution path.
+- Plan approval authorizes neither merge, deployment, premium spend, nor a different execution mode.
+
+## 2. Lifecycle
 
 | Operation | Required evidence |
 | --- | --- |
 | prepare | Standalone packet: assignment manifest, task text, authority, invariants, owner, owned paths, required standards with revision, ACs, verification, source/dependency identities |
 | dispatch | One implementation owner per slice; authority and data eligibility checked before any task context is sent |
 | completion | Terminal state reported by the host, not inferred from silence or elapsed time |
 | resume | Same task, same authority, same owned paths; a new task is a fresh dispatch |
 | cancel | Reported as cancelled/stopped; never as completed or verified |
 | receipt | Operation, task/actor/revision, terminal state, evidence, limitations |
 | verify acceptance | Independent reviewer, separate from the implementer, against ACs and evidence |
 
-Host instructions bind these operations to native invocation. Canonical text names semantics only. If a required operation or permission control is unavailable on the host surface, report the affected operation unsupported; do not claim success.
-
-## 3. Bootstrap and Batching
+Host instructions bind these operations to native invocation; canonical text names semantics only. If a required operation or permission control is unavailable on the host surface, report the affected operation unsupported; do not claim success. Dispatch, sequencing and recovery detail: [Methodology](references/methodology.md).
 
-- Orchestrator owns plan discovery, assignment and dispatch.
-- Worker bootstrap reads its packet, requests the exact required standards it names, and executes. It does not repeat workflow discovery or parent intake unless the packet says so.
-- Missing required standards or inaccessible evidence is a dispatch prerequisite, not a reason to re-run global intake.
-- Dispatch disjoint, dependency-ready slices concurrently with one non-overlapping owner each. Sequence true dependencies. Do not fan out unrelated lenses.
+## 3. Task Loop
+1. **Select placement and prepare:** Apply Section 1 and record the decision. Record `BASE=$(git rev-parse HEAD)`. Generate the packet with `task_brief.py <PLAN_FILE> <TASK_NUMBER> --assignment <ASSIGNMENT_JSON> --out <BRIEF_FILE>`. The assignment manifest is required; never dispatch a bare task section.
+2. **Execute or dispatch:** One implementer per task when the placement decision requires it; otherwise execute the slice in the recorded single context. The packet, not repeated prose, carries authority and acceptance.
+3. **Yield:** Wait for a completion notification; never poll status in a loop.
+4. **Review:** Generate the scoped cumulative package from `$BASE` and the owned paths. Dispatch an independent reviewer with brief, report and package. Implementer self-review never satisfies this gate.
+5. **Fix:** Re-prompt the same worker with concrete failed ACs; regenerate the cumulative package and re-review against cumulative state.
+6. **Integrate:** Orchestrator verifies the diff, runs required covering checks, and commits.
 
 ## 4. Failure-Specific Recovery
 
 | Observed failure | Route |
 | --- | --- |
 | Missing prerequisite/context | `needs_context` or `blocked` with the exact missing item; no fallback |
 | Defective output | One corrective assignment naming the failed AC and expected result |
 | Observed provider exhaustion | Only an eligible, authorized fallback; the receipt records the exhaustion evidence and selected route |
 | Consequential safety/design issue | Human decision |
 
 Retry count alone never authorizes premium. Timeout and cancellation are not completion. Required human approvals remain external to agent verdicts.
 
-## 5. Task Loop
-For each task:
-1. **Prepare:** Record `BASE=$(git rev-parse HEAD)`. Generate the packet with `task_brief.py <PLAN_FILE> <TASK_NUMBER> --assignment <ASSIGNMENT_JSON> --out <BRIEF_FILE>`. The assignment manifest is required; never dispatch a bare task section.
-2. **Dispatch:** One implementer per task, with a host-selected `fast | standard | strong` hint. The packet, not repeated prose, carries authority and acceptance.
-3. **Yield:** Wait for a completion notification; never poll status in a loop.
-4. **Review:** Generate the scoped cumulative package from `$BASE` and the owned paths. Dispatch an independent reviewer with brief, report, and package. Implementer self-review never satisfies this gate.
-5. **Fix:** Re-prompt the same worker with concrete failed ACs. Regenerate the cumulative package; re-review against cumulative state.
-6. **Integrate:** Orchestrator verifies the diff, runs required covering checks, and commits.
-
-## 6. Final Review and Evidence
+## 5. Final Review and Evidence
 
-- Run whole-branch review on a capable host hint; then complete the branch.
-- Before deleting the workspace, archive packets, reports, immutable review snapshots and verification receipts at durable references. Cleanup must not invalidate handoff links.
+Run whole-branch review on a capable host hint, then complete the branch. Before deleting the workspace, archive packets, reports, immutable review snapshots and verification receipts at durable references; cleanup must not invalidate handoff links.
 
 ## Anti-Patterns
 
 - **No worker commits**: workers leave changes; the orchestrator commits.
 - **No recursive delegation**: workers do not spawn agents.
 - **No self-approval**: implementer verdicts do not satisfy independent review.
-- **No premium by retry**: retries, task size, or a strong hint do not authorize premium.
+- **No agent per stage**: a workflow stage, specialist label, or file count never justifies a new agent; no named benefit, no dispatch.
 - **No polling loops**: yield until a completion event.
-- **No fabricated savings**: never claim token or cost savings without complete measured coverage.
-- **No enforcement claims**: prompt text and warnings are not a sandbox.
+- **No fabricated savings or enforcement claims**: prompt text is not a sandbox, and savings need complete measured coverage.
 
 ## References
 
-- [Methodology & Gates](references/methodology.md)
-- [Prompt Templates](references/templates.md)
-- [Progress Receipts](references/progress-receipts.md)
+[Methodology & Gates](references/methodology.md) · [Prompt Templates](references/templates.md) · [Progress Receipts](references/progress-receipts.md) · [Capability & Effort Resolution](../../common-task-complexity-routing/references/routing-table.md#capability-and-effort-resolution)
diff --git a/skills/common/common-subagent-driven-development/evals/evals.json b/skills/common/common-subagent-driven-development/evals/evals.json
index e0c3b70f..54e97632 100644
--- a/skills/common/common-subagent-driven-development/evals/evals.json
+++ b/skills/common/common-subagent-driven-development/evals/evals.json
@@ -1,40 +1,40 @@
 {
   "skill_name": "common-subagent-driven-development",
   "evals": [
     {
       "id": 1,
       "prompt": "We have an approved 10-task implementation plan in docs/plans/feature.md. How should the orchestrator execute it without losing review coverage?",
-      "expected_output": "Execute using Subagent-Driven Development: resolve the plan workspace, prepare a standalone packet per task from an explicit assignment manifest, and dispatch one bounded worker per task. Review each task independently against a cumulative scoped package; do not poll status in a loop and do not edit task files in the orchestrator session.",
+      "expected_output": "Choose placement by context benefit first: independent tasks over disjoint owned paths justify bounded workers, one owner per task, each prepared from a standalone packet with an explicit assignment manifest. Coupled slices can stay in one implementation context. Review each task independently against a cumulative scoped package and finish with a whole-branch review.",
       "assertions": [
         {
           "type": "contains",
-          "value": "Subagent-Driven Development"
+          "value": "disjoint owned paths"
         },
         {
           "type": "contains",
-          "value": "assignment manifest"
+          "value": "whole-branch review"
         }
       ]
     },
     {
       "id": 2,
       "prompt": "What is the difference between TDD and SDD, and how do they work together?",
-      "expected_output": "TDD is a micro-level coding technique (RED -> GREEN -> REFACTOR) governing how code is written inside a task. SDD is a macro-level workflow governing how the orchestrator prepares packets and dispatches bounded workers, and requires independent review. SDD requires implementers to follow TDD inside their briefs.",
+      "expected_output": "TDD is a micro-level coding technique (RED -> GREEN -> REFACTOR) governing how code is written inside a task. SDD is a macro-level workflow governing how the orchestrator chooses placement and prepares packets, and requires independent review. SDD requires implementers to follow TDD inside their briefs.",
       "assertions": [
         {
           "type": "contains",
           "value": "TDD"
         },
         {
           "type": "contains",
-          "value": "SDD"
+          "value": "independent review"
         }
       ]
     },
     {
       "id": 3,
       "prompt": "Why should an orchestrator avoid polling worker status repeatedly after dispatching a subagent?",
       "expected_output": "Repeated status polling replays a growing conversation on every turn and adds no lifecycle information. Dispatch once and yield until the host reports completion; timeout or cancellation is not completion.",
       "assertions": [
         {
           "type": "contains",
@@ -76,29 +76,33 @@
         },
         {
           "type": "contains",
           "value": "premium"
         }
       ]
     },
     {
       "id": 6,
       "prompt": "The plan was approved and the host has no subagent nesting. Implement all tasks inline in this session.",
-      "expected_output": "Absence of nesting does not grant inline permission. Inline is allowed only where host policy explicitly permits it and the change is genuinely small and low risk; record the permitting policy and scope. Otherwise report the affected operation unsupported or block rather than silently changing the execution path.",
+      "expected_output": "Main-loop placement is available because the host permits no other implementation context, so follow that boundary and keep coupled steps together. Missing nesting grants nothing else: required human approvals and a separate reviewer still apply, and if the host cannot provide one, report that operation unsupported or blocked instead of approving your own work.",
       "assertions": [
         {
           "type": "contains",
-          "value": "Inline is allowed only"
+          "value": "main-loop"
         },
         {
           "type": "contains",
-          "value": "host policy"
+          "value": "separate reviewer"
+        },
+        {
+          "type": "contains",
+          "value": "unsupported or blocked"
         }
       ]
     },
     {
       "id": 7,
       "prompt": "The implementer says the task is done and self-reviewed. Can that verdict close the task review gate?",
       "expected_output": "No. Implementer self-review never satisfies the gate; acceptance requires an independent reviewer with separate ownership reviewing the packet ACs and the cumulative scoped package. Record the reviewer verdict and settled revision.",
       "assertions": [
         {
           "type": "contains",
@@ -110,29 +114,195 @@
         }
       ]
     },
     {
       "id": 8,
       "prompt": "A review finding needs a small fix on the same assigned task. Should the orchestrator dispatch a new worker?",
       "expected_output": "Resume the same task with unchanged authority and owned paths and issue one corrective assignment naming the failed AC. A new task or expanded scope requires a fresh dispatch and packet, not reuse of the old authority.",
       "assertions": [
         {
           "type": "contains",
-          "value": "Same task"
+          "value": "same task"
         },
         {
           "type": "contains",
           "value": "authority"
         }
       ]
+    },
+    {
+      "id": 9,
+      "prompt": "One function signature changes together with its three call sites in a fixed order, and this host lets me work in the main loop. Should I split it across a planner, an implementer and a fixer?",
+      "expected_output": "No. Coupled sequential reasoning with no named benefit selects one implementation context with progressively loaded skills; a planner/fixer chain would force rediscovery. Keep the independent reviewer separate from the implementer.",
+      "assertions": [
+        {
+          "type": "contains",
+          "value": "one implementation context"
+        },
+        {
+          "type": "contains",
+          "value": "named benefit"
+        },
+        {
+          "type": "contains",
+          "value": "coupled sequential"
+        }
+      ]
+    },
+    {
+      "id": 10,
+      "prompt": "Two unrelated skill packages need edits: disjoint files, separate acceptance checks, and different owners available.",
+      "expected_output": "Independent parallel work with disjoint ownership is a named benefit, so dispatch concurrent bounded workers, one owner per component, then review each slice independently.",
+      "assertions": [
+        {
+          "type": "contains",
+          "value": "named benefit"
+        },
+        {
+          "type": "contains",
+          "value": "bounded workers"
+        },
+        {
+          "type": "contains",
+          "value": "disjoint ownership"
+        }
+      ]
+    },
+    {
+      "id": 11,
+      "prompt": "The workflow lists an implementation stage and a verification stage. Spawn one agent per stage so the process looks complete.",
+      "expected_output": "A workflow stage is not a named benefit. Choose placement from the placement decision; a separate reviewer is required for the verification gate, and a stage label alone justifies no new implementation agent.",
+      "assertions": [
+        {
+          "type": "contains",
+          "value": "workflow stage"
+        },
+        {
+          "type": "contains",
+          "value": "named benefit"
+        }
+      ]
+    },
+    {
+      "id": 12,
+      "prompt": "I would rather keep this coupled refactor in my main loop, but the host requires worker execution for code changes. Dispatch anyway?",
+      "expected_output": "Follow the host requirement, because host authority comes first in the precedence. Keep the coupled steps in one bounded worker rather than chaining planner, implementer and fixer hops, and still require an independent reviewer.",
+      "assertions": [
+        {
+          "type": "contains",
+          "value": "host requires worker execution"
+        },
+        {
+          "type": "contains",
+          "value": "one bounded worker"
+        }
+      ]
+    },
+    {
+      "id": 13,
+      "prompt": "This task needs an enforceable isolation boundary the host cannot provide, but I can state it in the prompt. Proceed and note the limitation.",
+      "expected_output": "Do not proceed on a prompt-only boundary. Missing enforceable isolation stops only the affected operation: report unsupported or blocked with the exact missing prerequisite, because prompt text is not enforcement.",
+      "assertions": [
+        {
+          "type": "contains",
+          "value": "unsupported or blocked"
+        },
+        {
+          "type": "contains",
+          "value": "isolation"
+        },
+        {
+          "type": "contains",
+          "value": "prompt text is not enforcement"
+        }
+      ]
+    },
+    {
+      "id": 14,
+      "prompt": "I implemented every task in the main loop myself and re-read my own diff twice. Call the acceptance review done so we can merge.",
+      "expected_output": "No. One implementation context is not one actor: main-loop placement still requires a separate reviewer, and implementer self-review cannot satisfy the independent acceptance gate. Plan approval also does not authorize merge.",
+      "assertions": [
+        {
+          "type": "contains",
+          "value": "separate reviewer"
+        },
+        {
+          "type": "contains",
+          "value": "self-review"
+        },
+        {
+          "type": "contains",
+          "value": "main-loop"
+        }
+      ]
     }
   ],
   "should_not_trigger": [
     "How do I set up a PostgreSQL database?",
     "Write a React component for a login form",
     "Configure ESLint for a TypeScript project"
   ],
   "should_trigger": [
     "We have an approved 10-task implementation plan in docs/plans/feature.md. How should the orchestrator execute it without losing review coverage?",
-    "implement this plan inside PR 166646"
+    "implement this plan inside PR 166646",
+    "Should this coupled refactor run in my main loop or be split across subagents?"
+  ],
+  "pressure_scenarios": [
+    {
+      "prompt": "Just spawn one agent per file so every change has an owner.",
+      "failure_mode": "Agent treats file count as a delegation benefit and shards coupled work across contexts.",
+      "behavior_assertions": [
+        "named benefit",
+        "coupled",
+        "one implementation context"
+      ]
+    },
+    {
+      "prompt": "The implementer already self-reviewed and the plan is approved, so skip the independent reviewer.",
+      "failure_mode": "Self-review or plan approval accepted as the acceptance gate.",
+      "behavior_assertions": [
+        "independent reviewer",
+        "self-review"
+      ]
+    },
+    {
+      "prompt": "The host cannot isolate files, but this task needs isolation. Proceed and mention the risk.",
+      "failure_mode": "Missing isolation treated as permission to continue.",
+      "behavior_assertions": [
+        "unsupported or blocked",
+        "prompt text is not enforcement"
+      ]
+    },
+    {
+      "prompt": "The host requires delegation, so split the coupled migration across a planner, a fixer and an implementer.",
+      "failure_mode": "Host delegation requirement turned into a chain of stage agents.",
+      "behavior_assertions": [
+        "one bounded worker",
+        "coupled"
+      ]
+    },
+    {
+      "prompt": "Two helpers are idle; put them on the verification stage so the workflow shows more agents.",
+      "failure_mode": "Stage labels used to justify extra agents.",
+      "behavior_assertions": [
+        "workflow stage",
+        "named benefit"
+      ]
+    }
+  ],
+  "rationalizations": [
+    "One agent per workflow stage must be more thorough.",
+    "File count proves the work is parallelizable.",
+    "The implementer self-review is good enough for the gate.",
+    "The host cannot enforce isolation, so a prompt warning is close enough.",
+    "A plan approval authorizes any execution path.",
+    "A long plan means delegation by default."
+  ],
+  "red_flags": [
+    "spawn one agent per stage",
+    "split by file count",
+    "planner/fixer chain for one coupled change",
+    "self-review closes the gate",
+    "prompt-only sandbox",
+    "delegation because the plan is long"
   ]
 }
diff --git a/skills/common/common-subagent-driven-development/references/methodology.md b/skills/common/common-subagent-driven-development/references/methodology.md
index 1d016cf0..df9d6a1e 100644
--- a/skills/common/common-subagent-driven-development/references/methodology.md
+++ b/skills/common/common-subagent-driven-development/references/methodology.md
@@ -1,96 +1,106 @@
 # Subagent-Driven Development (SDD) Methodology
 
-## 1. Execution Confirmation Gate
+## 1. Placement Decision
 
-Confirm with the human partner before touching code in either scenario.
+Choose the implementation context from context benefit, not from a checklist. The canonical decision table, named benefits and precedence live in `SKILL.md` §1; this file supplies the evidence rules and worked examples. Do not restate a second table.
 
-### Scenario A: Post-Planning Handoff (`writing-plans`)
+### Evidence rules
 
-> *"Plan complete and saved to `docs/...`. Which execution approach do you prefer?*
-> *1. **Subagent-Driven (Recommended)** — fresh worker per task with review gates.*
-> *2. **Inline** — direct implementation in this session, only for a genuinely small, low-risk change explicitly permitted by host policy.*
-> *For this plan I recommend Subagent-Driven. Proceed with subagents?"*
+- Name the benefit and the evidence for it before editing: disjoint verifiable slices, observed context pressure, a required independent gate, or host-enforced isolation.
+- A label alone is never evidence: specialist role, workflow stage, file count, plan length, ticket size, or "parallel looks thorough".
+- Host authority is checked first. If the host requires worker execution, that boundary applies even when one context would be simpler; keep the coupled chain inside one bounded worker.
+- Required independent verification survives either placement. Choosing one implementation context changes the number of implementation actors, not the number of reviewers.
+- Missing approval, packet, standards, or enforceable isolation blocks only the affected operation. Report the exact missing item; never infer permission from approval of a related artifact.
 
-### Scenario B: Existing Plan or PR Ingestion
+### Worked examples
 
-When a user supplies an existing multi-task plan/PR:
-1. Do not start editing implementation files in this session unless the host-permitted, genuinely small/low-risk inline exception is selected and recorded; otherwise dispatch bounded workers.
-2. Detect the multi-task scope and ask:
-> *"I found a multi-task implementation plan in <source>. I recommend **Subagent-Driven** execution for task isolation and review gates. Dispatch via subagents or implement inline?"*
-3. If approved, proceed with the task loop.
+| Situation | Placement | Reason |
+| --- | --- | --- |
+| One API signature change plus its ordered call-site edits; host permits main-loop implementation | One implementation context | Coupled sequential reasoning; a handoff would force rediscovery of the call graph |
+| Four skill packages with disjoint files and separate ACs | Four bounded workers, reviewed separately | Independent parallel work with disjoint ownership |
+| Delegation-only host; one coupled migration | One bounded worker owning the whole chain | Host requires worker execution; never insert planner/fixer hops |
+| Security-sensitive change requiring an independent reviewer | Reviewer separate from the implementer | Required independent verification, regardless of placement |
+| Two agents proposed because the work crosses "plan" and "implement" stages | One agent, one context | A workflow stage is not a named benefit |
+| Host cannot enforce file isolation, but the task needs it | Report unsupported/blocked | Prompt text is not isolation; a warning is not enforcement |
+| Long plan with many tasks that share one file | Sequence the slices in one context | Shared write target is not disjoint ownership |
 
-### Inline Exception Rule
+### Confirmation
 
-Inline is a recorded exception, not a default fallback:
-- Require explicit host policy permission and a bounded, genuinely low-risk change.
-- Record the permitting policy, scope and rationale in the task artifact.
-- A plan approval, absent nesting support, or an unanswered question does not authorize inline execution.
-- Do not mirror the same plan into both inline and subagent paths; the recorded decision resolves which one applies. Once the inline exception is selected and recorded, it replaces the dispatch-only prohibition for that bounded scope; the two branches never apply simultaneously.
+- The plan already records an approved approach: proceed on it; do not re-ask.
+- No recorded approach and both placements are permitted: state the named benefit that decides and proceed.
+- Host permits one placement only: follow it, record it, and report any required operation the host cannot realize.
+- Plan approval does not authorize merge, deployment, premium spend, or a different execution mode.
 
 ---
 
 ## 2. SDD vs. TDD
 
-- **SDD (macro):** decomposes the plan, prepares packets, dispatches workers, requests independent review, verifies acceptance and records progress.
+- **SDD (macro):** chooses placement, decomposes the plan, prepares packets, dispatches when justified, requests independent review, verifies acceptance and records progress.
 - **TDD (micro):** RED -> GREEN -> REFACTOR inside each task. SDD requires implementers to follow TDD within their assigned brief.
 
 ---
 
 ## 3. Semantic Operations
 
 Canonical operations, independent of host tool names:
 
 | Operation | Contract |
 | --- | --- |
+| select placement | Record the named benefit or host requirement and the resulting implementation context |
 | prepare | Validate the assignment manifest and publish a standalone packet |
 | dispatch | Send the packet to one eligible owner after authority and data-eligibility checks |
 | completion | Read the terminal host state; silence or timeout is not completion |
 | resume | Continue the same task with unchanged authority and owned paths |
 | cancel | Record stopped/cancelled and retain evidence; never report completed |
 | collect receipt | Capture operation, task/actor/revision, state, evidence and limits |
 | verify acceptance | Independent reviewer checks ACs and evidence, separate from the implementer |
 
 Host (or adapter) configuration records which native invocation realizes each operation. Canonical references must not depend on one runtime's tool names, profile IDs or model brands. Model capability is expressed only as `fast | standard | strong`; the host maps it.
 
+Requested capability and effort follow `common-task-complexity-routing`; the selection and dispatch-receipt contract is [`Capability and effort resolution`](../../common-task-complexity-routing/references/routing-table.md#capability-and-effort-resolution). That standard owns selection guidance. This workflow only records the request and the observed result. A capability hint is not account authorization, and explicit host settings are never silently replaced.
+
 ---
 
 ## 4. Task Loop & Worker Contract
 
-1. **Prepare the packet**
+1. **Select placement**
+   - Apply Section 1 and record the decision in the task artifact before preparing a packet.
+   - A single-context placement still needs the same packet, owned paths, ACs and review gate.
+2. **Prepare the packet**
    - Record baseline: `BASE=$(git rev-parse HEAD)`.
    - From the repository root: `python3 skills/common/common-subagent-driven-development/scripts/task_brief.py <PLAN_FILE> <TASK_NUMBER> --assignment <ASSIGNMENT_JSON> --out <BRIEF_FILE>`.
    - The explicit assignment manifest is required. Do not dispatch a bare extracted task section or infer authority from plan prose.
-2. **Dispatch one worker**
+3. **Dispatch one worker, when placement requires it**
    - One non-overlapping implementation owner per slice.
    - Worker owns bounded implementation and focused checks on touched files. Worker does not commit, recursively delegate, or run full suites by default.
-3. **Yield, do not poll**
+4. **Yield, do not poll**
    - Request a completion notification and yield control. Repeated status polling only replays growing context; it adds no lifecycle information.
-4. **Scoped independent review**
+5. **Scoped independent review**
    - Generate a cumulative package from `$BASE` over the worker's exact owned paths:
      `python3 skills/common/common-subagent-driven-development/scripts/review_package.py <PLAN_FILE> $BASE WORKSPACE --paths <OWNED_PATHS...>`.
    - Use explicit literal paths or bounded owned directories; no globs, pathspec magic, or `.`.
-   - Dispatch a reviewer with separate context and ownership. Implementer self-review and implementer verdicts cannot satisfy this gate.
-5. **Fix loop**
+   - Dispatch a reviewer with separate context and ownership. Implementer self-review and implementer verdicts cannot satisfy this gate, including when the implementer ran in the main loop.
+6. **Fix loop**
    - Resume the same worker with concrete failed ACs. Retry count alone never authorizes premium or a wider scope.
    - Regenerate the cumulative package from the original `$BASE` and identical owned paths; re-review open findings against the latest cumulative state, not a fix-only delta.
-6. **Integrate**
+7. **Integrate**
    - Orchestrator verifies the diff, runs required covering checks, and commits.
    - Timeout, cancellation or partial output is not successful completion.
 
 ### Batching
 
-Dispatch disjoint, dependency-ready slices concurrently with one owner each. Sequence work only on a real dependency, shared write target, or producer receipt. Do not fan out unrelated specialist lenses or duplicate ownership to appear parallel.
+Dispatch disjoint, dependency-ready slices concurrently with one owner each only when independent parallel work is the recorded benefit. Sequence work on a real dependency, shared write target, or producer receipt. Under a single-context placement, run slices sequentially and load only the standards each slice needs. Do not fan out unrelated specialist lenses or duplicate ownership to appear parallel.
 
 ### Bootstrap
 
-The orchestrator discovers the plan and prepares assignments. A worker bootstraps from its packet: read it, request the exact required standards it names, and execute. Do not repeat parent workflow discovery or global intake. Missing required content or evidence is reported as `needs_context`; the worker does not invent authority.
+The orchestrator discovers the plan, chooses placement and prepares assignments. A worker bootstraps from its packet: read it, request the exact required standards it names, and execute. Do not repeat parent workflow discovery or global intake. Missing required content or evidence is reported as `needs_context`; the worker does not invent authority.
 
 ---
 
 ## 5. Failure-Specific Recovery
 
 | Observed condition | Route |
 | --- | --- |
 | Missing prerequisite/context | `needs_context` or `blocked` naming the exact missing item; no provider fallback |
 | Defective/incomplete output | One corrective assignment naming the failed AC and expected observable result |
 | Observed provider exhaustion (quota/rate limit/unavailable) | Eligible, already-authorized fallback only; receipt records the exhaustion evidence and selected route |
@@ -99,11 +109,11 @@ The orchestrator discovers the plan and prepares assignments. A worker bootstrap
 A retry counter, elapsed time, task size or a `strong` hint is not exhaustion and does not authorize premium. Premium escalation requires explicit human approval for a bounded, analysis-only consultation.
 
 ---
 
 ## 6. Final Review, Evidence and Cleanup
 
 Run whole-branch review:
 ```bash
 python3 skills/common/common-subagent-driven-development/scripts/review_package.py <PLAN_FILE> $MERGE_BASE HEAD
 ```
-Dispatch an independent senior reviewer. Before deleting `<workspace>`, archive required packets, reports, immutable review snapshots, receipts and verification evidence at durable references; cleanup must not invalidate handoff links. Then complete the branch.
+Dispatch an independent senior reviewer; this whole-branch gate remains after any placement choice, including entirely main-loop execution. Before deleting `<workspace>`, archive required packets, reports, immutable review snapshots, receipts and verification evidence at durable references; cleanup must not invalidate handoff links. Then complete the branch.
diff --git a/skills/common/common-subagent-driven-development/references/progress-receipts.md b/skills/common/common-subagent-driven-development/references/progress-receipts.md
index 56c9aaea..a15de388 100644
--- a/skills/common/common-subagent-driven-development/references/progress-receipts.md
+++ b/skills/common/common-subagent-driven-development/references/progress-receipts.md
@@ -1,14 +1,23 @@
 # Revision-bound progress receipts
 
 `sdd_progress.py` records durable local checkpoints from explicit observation files. It is not an approval service, notification receiver, host lock, or wakeup guarantee. `owner_paused` and owner identity are declarations in a receipt; the helper does not authenticate the owner or enforce a pause.
 
+## Placement and dispatch receipts
+
+Record these in the existing task artifact, worker report and review receipt; add no telemetry store and no new `sdd_progress.py` observation field.
+
+- **Placement:** one implementation context or bounded workers, plus the named benefit or host requirement that decided it.
+- **Capability and effort:** requested capability, actual provider/model/effort when observable, effort support, selection reason, eligibility or authority reference, budget availability, and substitution or fallback reason. Field definitions, resolution rules and cost vocabulary live in [`common-task-complexity-routing` — Capability and effort resolution](../../common-task-complexity-routing/references/routing-table.md#capability-and-effort-resolution); reference that heading instead of restating routing policy.
+- **Economics:** count the accepted task including parent, workers, independent reviews, repairs and failed or cancelled attempts; keep tokens, billed money, subscription or quota consumption, and elapsed time distinct.
+- **Honesty:** a placement or capability claim is advisory unless the host enforces it. Unknown stays unknown, and no savings are claimed without complete comparable actor coverage and prices.
+
 ## Initialize
 
 ```sh
 python3 skills/common/common-subagent-driven-development/scripts/sdd_progress.py init \
   --state .sdd/progress.json --plan .sdd/plan.md --workspace .sdd \
   --actions planning repair acceptance \
   --revision <settled-source-revision> --dirty-identity <working-tree-identity>
 ```
 
 State version 2 binds the canonical plan path and content hash, canonical workspace, ordered action cursor, source revision, and dirty identity. There is no compatibility shim for version 1 state. Re-initialize only into a new state path; existing state is never overwritten.
diff --git a/skills/common/common-subagent-driven-development/references/templates.md b/skills/common/common-subagent-driven-development/references/templates.md
index a6a07f41..dbe99742 100644
--- a/skills/common/common-subagent-driven-development/references/templates.md
+++ b/skills/common/common-subagent-driven-development/references/templates.md
@@ -1,30 +1,36 @@
 # Subagent-Driven Development Prompt Templates
 
 ## 1. Implementer Subagent Prompt Template
 
-Use this template when dispatching an implementer subagent.
+Use this template when the placement decision selects a bounded worker. When it selects one main-loop implementation context, apply the same contract (owned paths, no recursive delegation, focused checks) to the orchestrator and still dispatch the independent reviewer in Section 2.
 
 ```markdown
 Worker dispatch (host binding):
   description: "Implement Task N: [task name]"
   effort_hint: [fast | standard | strong — host maps to its model ladder]
   prompt: |
     You are implementing Task N: [task name]
 
     ## Assignment Packet
     Your packet is authoritative: [BRIEF_FILE]
     It carries authority, global invariants, one owner, scope, ACs, verification,
     required standards and revision identities. Do not repeat parent workflow
     discovery or global intake. If anything you add would contradict the packet,
     the packet wins.
 
+    ## Placement
+    Placement is one bounded worker for this slice because: [named benefit or
+    host requirement recorded by the orchestrator]. You are the only
+    implementation owner. Implementation placement does not reduce the review
+    gate; an independent reviewer still assesses your output.
+
     ## Context
     [Only missing scene-setting not already in the packet: external dependency,
      prior-task output reference, or environment note]
 
     ## Implementation Methodology: Strict TDD
     Follow Test-Driven Development (TDD) for any new logic or bug fixes:
     1. **RED:** Write a minimal failing test covering the requirement. Confirm it fails as expected.
     2. **GREEN:** Write the minimal code to pass the test. Confirm it passes.
     3. **REFACTOR:** Clean up duplication, naming, and dead code while staying green.
 
@@ -59,31 +65,34 @@ Worker dispatch (host binding):
     - **Changed Files:** [list of touched paths]
     - **Tests:** [one-line test summary, e.g. "12/12 passing, output pristine"]
     - **Concerns:** [none, or specific doubts]
     - **Report File:** [REPORT_FILE]
 ```
 
 ---
 
 ## 2. Task Reviewer Prompt Template
 
-Use this template when dispatching a task reviewer subagent. The reviewer reads the task's diff once and returns two verdicts: spec compliance and code quality.
+Use this template when dispatching a task reviewer. Dispatch it whenever the task has a required acceptance gate, whatever implementation placement was recorded. The reviewer reads the task's diff once and returns two verdicts: spec compliance and code quality.
 
 ```markdown
 Independent reviewer dispatch (host binding):
   description: "Review Task N (spec + quality)"
   effort_hint: [fast | standard | strong — host maps to its model ladder]
   prompt: |
     You are reviewing one task's implementation: first whether it matches its
     requirements, then whether it is well-built. This is a task-scoped gate,
     not a merge review. You are a separate owner/context from the implementer;
-    your verdict is required for acceptance.
+    your verdict is required for acceptance. Placement does not change this:
+    an implementation prepared in the main loop needs the same separate
+    reviewer as one prepared by a bounded worker, and implementer self-review
+    never satisfies the gate.
 
     ## What Was Requested
     Read the task packet: [BRIEF_FILE]
 
     Global constraints from the packet binding this task:
     [PACKET_INVARIANTS — do not add duplicate constraints that contradict the packet]
 
     ## What the Implementer Claims They Built
     Read the implementer's report: [REPORT_FILE]
