# Assignment packet: T1

- Plan: /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/mindless-impala/docs/prd/prd-ai-test-assurance.md
- Plan SHA-256: 5e5216a6126257490315db0cf5bf9c1ced091a16babfb73872691c1c6c888c06
- Task number: 1
- Project domain: Authorized personal repositories agent-skills-standard and testguard; no employer data
- Workspace root: /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/mindless-impala

## Goal

Freeze bounded AGS/TestGuard contracts for reviewed AI test assurance plan; design only

## Owner

Personal · Analysis & Review technical designer

## Authority: allowed operations

- Read assigned repository sources
- Edit owned paths
- Prepare regression cases and verification commands

## Authority: forbidden actions

- Commit
- Push
- Deploy
- Delegate
- Run builds/lint/tests/formatters mid-flight
- Read employer repositories or credentials

## Authority: required approvals

- None declared (explicit empty list).

## Global invariants

- One owner per component; preserve existing user changes
- No fabricated verification
- Independent review required
- No weakening assertions to obtain green

## Non-goals

- Unrelated edits
- Release/deploy/merge
- Recursive delegation
- Premium calls

## Owned paths

- docs/srs/srs-ai-test-assurance.md

## Acceptance criteria

- **T1-1**: Specify concrete scan envelope, versions, exit precedence, empty/unsupported handling, stdout/stderr errors and consumer migration
- **T1-2**: Specify bounded locally validated intent/execution/fault receipts and freshness; no receipt-driven command execution or claims hashes prove execution
- **T1-3**: Inventory canonical vs generated files, exact owned paths and executable verification commands for T2-T8
- **T1-4**: Specify safe generator/evaluator separation without embedding held-out fault contents; design only

## Verification

- cwd: .
  command: Independent review of frozen deliverables and stated ACs
  expected: No unresolved material findings

## Required standards

- skills/common/common-decision-discipline/SKILL.md (skills/common/common-decision-discipline/SKILL.md, revision 0df5a2ce474431c18b1e011b4b3672d737fb833ff863daba1b0c6f6f61dd806f)
- skills/product-management/product-requirements/references/requirements-modeling.md (skills/product-management/product-requirements/references/requirements-modeling.md, revision 1cfe4a8e56f0c2d53c82b572ae9ab1ae20434aa13cc2ac4284538e082e133956)

## Source files

- docs/prd/prd-ai-test-assurance.md (SHA-256 5e5216a6126257490315db0cf5bf9c1ced091a16babfb73872691c1c6c888c06)
- package.json (SHA-256 477049a4cc8bd6d4948089be3fda7b77f7e23ddf9b6b0b2b178657ae6d598367)
- scripts/trace/index.ts (SHA-256 10b0543daf65710a7e464eebc7683454ebb9abff22f38c2d899ff8878a86658d)
- scripts/evals/scorer.ts (SHA-256 5f2547ec911309d11b4c3db54982fcc09769f7a08678ff1e4ebfd8efacdf7142)

## Source revision

- 92d06c420f6a41f08e11579423e4e3eacdb7880d

## Dirty identity

- No tracked diff at assignment preparation; untracked inputs bound by source_files

## Dependencies

- None declared (explicit empty list).

## Output contract: receipt destination

- /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/mindless-impala/.agent/sdd/ai-test-assurance/task-1-report.md

## Output contract: status vocabulary

- done
- done_with_concerns
- blocked
- needs_context

## Output contract: stop conditions

- Material contract change
- Missing prerequisite
- Account ineligibility

## Limits

- status: advisory
- attempts: 1

## Selected task text

### Task 1: Freeze technical contracts and compatibility inventory (T1)

- Owner: technical-design worker; estimate 5 points, medium confidence.
- Depends on: implementation-planning authorization only; this task creates design, not runtime code.
- Scope: both repositories read-only; write AGS `docs/srs/srs-ai-test-assurance.md` only (new file).
- Requirements: REQ-01 through REQ-08; acceptance focus AC-01 through AC-04, AC-10 through AC-13.
- Steps: inspect existing result/receipt/schema conventions and actual report consumers; map generated versus canonical skills; specify scan envelope and exit semantics; specify intent/evidence schema, trust labels and validation invocation; define TestGuard-to-AGS adapter boundary; record exact owned paths and commands for T2-T8; identify applicable release compatibility policy.
- Deliverable: one technical contract with schema examples, invalid examples, migration table, expected CLI invocations and digest-bound fixture interface for downstream tasks.
- Verification: walkthrough each scan-table row and stale/invalid-fault scenario against the contract; independent technical review before schema freeze. No production/test execution claim.
- Stop: consequential compatibility or trust decision cannot be resolved from repo policy; return alternatives and affected task only.
- Non-goals: code, dependencies, new signing system, CI activation.
