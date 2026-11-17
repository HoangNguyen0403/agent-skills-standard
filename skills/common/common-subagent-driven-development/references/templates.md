# Subagent-Driven Development Prompt Templates

## 0. Task Brief Contract Template (for Implementation Plans)

Use this template when authoring tasks in implementation plans. `task_brief.py` validates that these fields are present outside code fences in the selected task section before publishing the assignment packet; a missing field refuses publication (exit 2).

```markdown
### Task N: [Task Title]

**Files:** `path/to/file1.ext`, `path/to/file2.ext`
**Scope / owned write set:** `path/to/file1.ext`, `path/to/file2.ext` only. No changes to unrelated packages or configurations.
**Inputs:** [Required specifications, design contracts, or preceding task artifacts]
**Outputs:** [Resulting code, interfaces, exported symbols, test files]
**Real Ingress:** [Actual runtime, API, CLI, or test harness entry point exercising the changes]
**Invariants:**
- Positive: [Observable behavior that must occur under valid inputs]
- Negative: [Boundary rejections, fail-closed errors, or forbidden state transitions]
**Gate / rollback:** [named flag/version pin or `none: reason`]; control: [invariant]; rollback: [flag off | revert | one-way]; reversibility: [gated | revertible | one-way][; authorization: human reference for one-way]. A version pin maps to `revert` + `revertible`; prior-pin detail belongs in the control narrative.
**Verification owner:** [parent orchestrator | implementer focused tests] via `[exact test/smoke command]`
**Handoff / freeze:** report `task-N-report.md` marked FINAL; source freeze precedes review.
**Correction route:** [e.g. host ladder: 1 corrective follow-up then escalate route; no automatic premium]

- [ ] Actionable implementation step 1
- [ ] Actionable implementation step 2
```

---

## 1. Implementer Subagent Prompt Template

Use this template when the placement decision selects a bounded worker. When it selects one main-loop implementation context, apply the same contract (owned paths, no recursive delegation, focused checks) to the orchestrator and still dispatch the independent reviewer in Section 2.

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

    ## Placement
    Placement is one bounded worker for this slice because: [named benefit or
    host requirement recorded by the orchestrator]. You are the only
    implementation owner. Implementation placement does not reduce the review
    gate; an independent reviewer still assesses your output.

    ## Context
    [Only missing scene-setting not already in the packet: external dependency,
     prior-task output reference, or environment note]

    ## Carried Delivery Contract
    - `delivery_mode`: brief | standard | extended
    - Work item: [ID/reference @ source revision]; owner: [owner]; approval: [approval reference]
    - Criteria: [REQ/AC ids when governed; in brief mode the approved record's observable criteria — never mint IDs]
    - Verification lane: [lane]; evidence lanes: technical [this task], acceptance/release [not assessed]

    Authority comes from this carried record. Do not repeat intake, re-infer approval,
    or restart planning because a formal ID or document filename is absent. A sensitive
    or scope-grown change reopens the affected slice and restores its design/approval floor.

    ## Implementation Methodology: Strict TDD
    Follow Test-Driven Development (TDD) for any new logic or bug fixes:
    1. **RED:** Write a minimal failing test covering the requirement. Confirm it fails as expected.
    2. **GREEN:** Write the minimal code to pass the test. Confirm it passes.
    3. **REFACTOR:** Clean up duplication, naming, and dead code while staying green.

    ## Your Job (Single Worker Contract)
    1. Request only the exact required standards named in the packet; another
       context's earlier load does not supply your body.
    2. Implement exactly what the task specifies on owned files (YAGNI — build nothing unrequested)
    3. Run focused tests for your changed paths; do NOT run full project test suites by default
    4. Do NOT commit your changes with git; orchestrator owns git integration and commits
    5. Conduct a self-review of your diff; it does not replace independent review
    6. Write your detailed report to [REPORT_FILE] and return the status contract
    Delivery Report decision block: follow [delivery-report.md](delivery-report.md) and include it at the top of [REPORT_FILE].

    Work from: [directory]

    ## Boundaries & Execution Rules
    - **No Git Commits:** Leave changes uncommitted in the working tree; orchestrator integrates and commits.
    - **No Recursive Delegation:** Do all of this task's work yourself. Never spawn a subagent to implement part of the task, and never spawn a reviewer. Review is handled by the orchestrator after you report.
    - **Focused Verification:** Run only tests and checks covering touched paths; full test suites run during integration.
    - **Evidence Boundary:** A green check is technical verification of this revision only. Never claim business acceptance, release authority, or that a stale receipt still covers later edits.
    - **Denial Alternative vs. Total Block:** If a tool call or command is denied, check for an allowed alternative or read-only diagnostic before declaring BLOCKED. Do not report "all tests blocked" when only a single command was denied.
    - **Sibling Requests Forward-Only:** Sibling agents cannot approve or deny permissions on your behalf. Requests can only be forwarded to the orchestrator or human.
    - **Error Is Not Terminal State:** A provider 429, timeout, or network glitch does not mean write ownership is transferred. Terminal state must be confirmed before stopping.
    - **Conversion & Provenance:** If this task converts or repairs artifacts across worktrees, specify exact cross-worktree input paths, source/user/project provenance, and inclusive ranges; preserve unaffected fields.
    - **Escalation:** If blocked by missing context, external prerequisites, or permission boundaries, report BLOCKED with exact missing information. Do not silently shrink the assigned scope.
    ## Report Format
    Write your full report to [REPORT_FILE]:
    - What was implemented and files changed
    - Work-item and criteria mapping: [item @ revision] -> [met criteria refs]; unresolved blockers with owner/input
    - Verification commands run and test evidence (RED/GREEN outputs)
    - Evidence lanes: technical [receipts], acceptance/release [not assessed]
    - Diff summary and uncommitted changes
    - Self-review notes or doubts
    - Proposed verification commands for orchestrator integration
    - Receipt: operation, task/actor/revision, terminal state, evidence, limitations

    Then reply with ONLY this short contract (under 15 lines):
    - **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
    - **Changed Files:** [list of touched paths]
    - **Tests:** [one-line test summary, e.g. "12/12 passing, output pristine"]
    - **Concerns:** [none, or specific doubts]
    - **Report File:** [REPORT_FILE]
```

---

## 2. Blind Task Reviewer Prompt Template

Dispatch a separate reviewer for every required task gate. Phase one is frozen before any author report is disclosed.

```markdown
Blind reviewer dispatch (host binding):
  description: "Review Task N (blind phase one)"
  effort_hint: [fast | standard | strong — host maps to its model ladder]
  prompt: |
    Review task compliance and code quality from the supplied evidence. You are
    separate from the implementer; your verdict is a required acceptance input.

    ## Requested Work
    Task packet: [BRIEF_FILE]
    Work item: [ID/reference @ source revision]; `delivery_mode`: brief | standard | extended.
    The carried record is authoritative. In brief mode its observable criteria
    replace formal IDs. Do not infer approval from filenames or attribution.
    Packet invariants: [PACKET_INVARIANTS]
    Design constraints: [GLOBAL_CONSTRAINTS]

    ## Admissible Phase-One Inputs
    Before preparing or checking evidence, load the full
    [delivery-report.md](delivery-report.md) Frozen Source Identity procedure.
    Orchestrator-frozen cumulative diff: [DIFF_FILE] (SHA-256: [DIFF_SHA256])
    Orchestrator-observed deterministic receipt: [CHECK_RECEIPT_FILE]
    Receipt includes command, cwd, exit code, raw-output path/digest, resolved BASE,
    actual HEAD, scope manifest/digest, source revision and dirty identity. The
    orchestrator computes and freezes scope/source identity before and after each
    check and at phase freeze. Do not treat implementer claims as observed proof.
    If a required current check is observed FAIL, return CHANGES REQUESTED before
    semantic lenses. Unknown, NOT RUN, or stale/mismatched proof is an evidence gap,
    never PASS; useful static-risk review may continue, but no READY claim follows.
    Base: [BASE_REF]
    Head/workspace: [HEAD_REF / WORKSPACE]
    Owned paths: [OWNED_PATHS]
    Scope digest: [SCOPE_DIGEST]
    Read the diff once; do not crawl broader code except for a concrete contract risk.
    Read only; do not mutate the workspace.

    ## Reproduction Boundary
    Reproduce only if the exact command is explicitly authorized in the
    orchestrator-published task brief and its source/command provenance is
    separately verified, alongside host-enforced isolation without credentials or
    publication authority, default-deny outbound networking, and a verified
    no-write boundary to the shared implementation worktree. The verifier must
    retain durable, verifier-owned raw outputs/artifacts with SHA-256 digests.
    Unknown predicates mean static-only plus a named gap; never execute
    author-controlled commands in a privileged reviewer runtime. Prompt omission
    is not access control.

    ## Phase-One Findings
    Report only Blocker, Major, or Nit findings. Each finding has evidence, Why,
    Fix, and Prevent-by: lint | type | test | eval | runtime | guidance | none.
    Include no strengths or praise section. Compare observed check output to its
    receipt; a mismatch is a Blocker.

    Freeze this artifact before reconciliation:
    - Phase-one artifact path: [PHASE_ONE_ARTIFACT]
    - SHA-256: [PHASE_ONE_SHA256]
    - Source/scope identity: [SOURCE_IDENTITY / SCOPE_DIGEST]


    ## Output
    ### Spec Compliance
    [Compliant | Issues found with file:line | Cannot verify and why]
    ### Issues
    #### Blocker
    #### Major
    #### Nit
    ### Reproduction
    [Verified command/output/identity | Static-only gap]
    ### Phase-One Freeze
    [Artifact path, digest, source revision, dirty identity]
```

---

## 3. Reconciliation Prompt Template

Resume the same reviewer only after phase-one findings and source identity are frozen. If same-reviewer resume is unsupported, return `BLOCKED`; a replacement must restart the full blind phase.

```markdown
Reconciliation dispatch (host binding):
  description: "Reconcile Task N after blind phase one"
  prompt: |
    Continue the same review using the frozen phase-one artifact below.
    Do not rewrite or replace its findings. Compare author claims with that
    frozen evidence; unsupported claims become explicit gaps or findings.

    Task packet: [BRIEF_FILE]
    Cumulative diff: [DIFF_FILE] (SHA-256: [DIFF_SHA256])
    Frozen phase-one artifact: [PHASE_ONE_ARTIFACT]
    Frozen phase-one SHA-256: [PHASE_ONE_SHA256]
    Phase-one source revision and dirty identity: [SOURCE_IDENTITY]
    Orchestrator receipt: [CHECK_RECEIPT_FILE]
    Author delivery report: [REPORT_FILE]

    Verify all supplied digests and source identities before reconciliation.
    Changed source or phase-one bytes make the evidence stale; return BLOCKED.
    Unsupported resume is BLOCKED. Do not substitute a new reviewer or invent
    continuity. A replacement starts again with the blind template and receives
    no author report until its new phase-one artifact is frozen.

    ## Output
    ### Claim Reconciliation
    [Claim, evidence, status: confirmed | gap | finding]
    ### Open Findings
    [Blocker | Major | Nit; evidence; Why; Fix; Prevent-by]
    ### Verdict
    [READY | NOT READY | BLOCKED]
```

---

## 4. Fix-Round Review Route

For each fix round, create a cumulative `BASE..WORKSPACE` package from the original baseline and recompute the receipt and frozen source/scope identity. Never reuse invalidated proof. Start blind with Section 2; disclose the fix report only through Section 3 after phase-one findings are frozen. Unsupported resume is `BLOCKED`; a replacement restarts the full blind phase.

```markdown
Fix-round review dispatch (host binding):
  description: "Blind review Task N cumulative fix round"
  prompt: |
    Follow Sections 2 and 3 exactly. This is a new blind phase over the cumulative
    task state, not a fix-only review. Keep the original baseline and task scope.
    Do not receive the fix report before the new phase-one artifact is frozen.

    Original BASE: [BASE_REF]
    Current actual HEAD/workspace: [HEAD_REF / WORKSPACE]
    Cumulative diff: [DIFF_FILE] (SHA-256: [DIFF_SHA256])
    Current orchestrator receipt: [CHECK_RECEIPT_FILE]
    Frozen scope/source identity and digest: [SOURCE_IDENTITY / SCOPE_DIGEST]
    Prior findings to reconcile after freeze: [PRIOR_FINDINGS_FILE]

    Before any review, load the complete Frozen Source Identity procedure in
    [delivery-report.md](delivery-report.md) and record its exact manifest inventory.
    First-phase verdicts: CHANGES REQUESTED | REVIEW COMPLETE | BLOCKED.
    Required current-check FAIL returns CHANGES REQUESTED before semantic lenses.
    Unknown, NOT RUN, or stale identity is a gap, never PASS; static-risk findings
    may continue, but no READY claim follows.

    Report findings only as Blocker, Major, or Nit; include evidence, Why, Fix,
    and Prevent-by. Do not claim regressions were introduced in the latest fix
    without a prior snapshot. Never write to the shared implementation worktree.

    ## Output
    ### Phase-One Freeze
    [Artifact path, digest, current source/scope identity]
    ### Findings
    [Blocker | Major | Nit; evidence; Why; Fix; Prevent-by]
    ### Reconciliation
    [ADDRESSED | NOT ADDRESSED | BLOCKED per prior finding]
    ### Verdict
    [CHANGES REQUESTED | REVIEW COMPLETE | BLOCKED]
```
