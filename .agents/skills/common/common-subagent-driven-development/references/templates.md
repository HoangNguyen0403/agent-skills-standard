# Subagent-Driven Development Prompt Templates

## 1. Implementer Subagent Prompt Template

Use this template when dispatching an implementer subagent.

```markdown
Subagent (general-purpose):
  description: "Implement Task N: [task name]"
  model: [MODEL — REQUIRED: choose per Model Selection; default to cheap execution tier]
  prompt: |
    You are implementing Task N: [task name]

    ## Task Description
    Read your task brief first: [BRIEF_FILE]
    It contains the full task requirements, files, and verification commands.

    ## Context
    [Scene-setting: project domain, dependencies, architectural context, prior task outputs]

    ## Implementation Methodology: Strict TDD
    Follow Test-Driven Development (TDD) for any new logic or bug fixes:
    1. **RED:** Write a minimal failing test covering the requirement. Confirm it fails as expected.
    2. **GREEN:** Write the minimal code to pass the test. Confirm it passes.
    3. **REFACTOR:** Clean up duplication, naming, and dead code while staying green.

    ## Your Job (Single Worker Contract)
    1. Implement exactly what the task specifies on owned files (YAGNI — build nothing unrequested)
    2. Run focused tests for your changed paths; do NOT run full project test suites by default
    3. Do NOT commit your changes with git; orchestrator owns git integration and commits
    4. Conduct a self-review of your diff
    5. Write your detailed report to [REPORT_FILE]
    6. Return your short status contract

    Work from: [directory]

    ## Boundaries & Execution Rules
    - **No Git Commits:** Leave changes uncommitted in the working tree; orchestrator integrates and commits.
    - **No Recursive Delegation:** Do all of this task's work yourself. Never spawn a subagent to implement part of the task, and never spawn a reviewer. Review is handled by the orchestrator after you report.
    - **Focused Verification:** Run only tests and checks covering touched paths; full test suites run during integration.
    - **Escalation:** If blocked by missing context, external prerequisites, or permission boundaries, report BLOCKED with exact missing information.

    ## Report Format
    Write your full report to [REPORT_FILE]:
    - What was implemented and files changed
    - Verification commands run and test evidence (RED/GREEN outputs)
    - Diff summary and uncommitted changes
    - Self-review notes or doubts
    - Proposed verification commands for orchestrator integration

    Then reply with ONLY this short contract (under 15 lines):
    - **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
    - **Changed Files:** [list of touched paths]
    - **Tests:** [one-line test summary, e.g. "12/12 passing, output pristine"]
    - **Concerns:** [none, or specific doubts]
    - **Report File:** [REPORT_FILE]
```

---

## 2. Task Reviewer Prompt Template

Use this template when dispatching a task reviewer subagent. The reviewer reads the task's diff once and returns two verdicts: spec compliance and code quality.

```markdown
Subagent (general-purpose):
  description: "Review Task N (spec + quality)"
  model: [MODEL — REQUIRED: choose per Model Selection; default to cheap or analysis tier]
  prompt: |
    You are reviewing one task's implementation: first whether it matches its
    requirements, then whether it is well-built. This is a task-scoped gate,
    not a merge review.

    ## What Was Requested
    Read the task brief: [BRIEF_FILE]

    Global constraints from spec/design binding this task:
    [GLOBAL_CONSTRAINTS]

    ## What the Implementer Claims They Built
    Read the implementer's report: [REPORT_FILE]

    ## Diff Under Review
    **Base:** [BASE_REF]
    **Head:** [HEAD_REF / WORKSPACE]
    **Scope / Owned paths:** [OWNED_PATHS]
    **Diff file:** [DIFF_FILE]

    A WORKSPACE package is cumulative from [BASE_REF] to the current workspace; it is not a fix-only delta. Assess the task-owned state shown by this snapshot.
    Read the diff file once — it contains the file list, stat summary, and full diff.
    Do not crawl the broader codebase unless checking a concrete contract risk at a callsite.
    Your review is read-only. Do not mutate the working tree.

    ## Tests
    The implementer already ran tests and provided evidence in [REPORT_FILE].
    Do not re-run full test suites. Run a focused test only if code reading raises a specific doubt.

    ## Part 1: Spec Compliance
    - **Missing:** Requirements skipped or claimed without implementation.
    - **Extra:** Features not requested (YAGNI violation).
    - **Misunderstood:** Built the wrong way or solved the wrong problem.

    ## Part 2: Code Quality
    - Clean separation of concerns, error handling, maintainability.
    - Test rigor: verifies real behavior, edge cases covered.
    - Code craftsmanship: zero noise comments, documented public boundaries.

    ## Output Format

    ### Spec Compliance
    - ✅ Spec compliant | ❌ Issues found: [details with file:line]
    - ⚠️ Cannot verify from diff: [items requiring orchestrator cross-check]

    ### Strengths
    [Concise bullet points]

    ### Issues
    #### Critical (Must Fix)
    #### Important (Should Fix)
    #### Minor (Nice to Have)

    ### Assessment
    **Task quality:** [Approved | Needs fixes]
    **Reasoning:** [1-2 sentence technical summary]
```

---

## 3. Scoped Re-Reviewer Prompt Template

Use this template when re-reviewing a task after a fix round.

```markdown
Subagent (general-purpose):
  description: "Re-review Task N Fixes (scoped)"
  model: [MODEL — cheap or mid-tier model]
  prompt: |
    You are re-reviewing Task N after a fix round.
    The package supplied below is cumulative from the original baseline to the current workspace, not a fix-only diff.

    ## Open Findings Under Review
    [LIST_OF_OPEN_FINDINGS]

    ## Context
    - Task brief: [BRIEF_FILE]
    - Implementer fix report: [REPORT_FILE]
    - Prior package, if available: [PREVIOUS_DIFF_FILE]

    ## Cumulative Task Package
    **Base:** [BASE_REF]
    **Head:** WORKSPACE (current uncommitted cumulative snapshot)
    **Scope / Owned paths:** [OWNED_PATHS]
    **Diff file:** [DIFF_FILE]

    ## Instructions
    1. Check each open finding against the current cumulative task-owned state.
    2. Verdict each finding as ADDRESSED or NOT ADDRESSED.
    3. Report regressions visible in the cumulative task-owned changes. Do not claim a regression was introduced in the latest fix round unless a prior snapshot supports that comparison.
    4. Do not re-evaluate code outside the owned scope.

    ## Output Format
    ### Findings Verification
    - [Finding 1 summary]: ADDRESSED (file:line) | NOT ADDRESSED (explanation)
    - [Finding 2 summary]: ...

    ### Regressions in Cumulative Task State
    - [None | Details of Critical/Important issue]

    ### Verdict
    [ALL FINDINGS ADDRESSED | FIXES INCOMPLETE]

```
